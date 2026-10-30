// Rieltor bot — yordamchilar: Telegram API, oq ro'yxat, CSV import (snapshot
// almashtirish), kunlik hisobot formati. Webhook va cron shularni ishlatadi.
// Public UI yo'q; faqat REALTOR_BOT_ALLOWED_IDS dagi 2-3 kishi.

import { prisma } from "@/lib/prisma";
import { findMatches } from "@/lib/realtor-match";
import { Prisma, type RealtorListing, type RealtorBuyer } from "@prisma/client";

const TOKEN = process.env.REALTOR_BOT_TOKEN;

// ── Oq ro'yxat (REALTOR_BOT_ALLOWED_IDS="111,222,333") ──
export function allowedIds(): string[] {
    return (process.env.REALTOR_BOT_ALLOWED_IDS || "")
        .split(",").map((s) => s.trim()).filter(Boolean);
}
export function isAllowed(id: number | string): boolean {
    return allowedIds().includes(String(id));
}

// ── Telegram API ──
export async function tg(method: string, body: Record<string, unknown>): Promise<unknown> {
    if (!TOKEN) return null;
    try {
        const r = await fetch(`https://api.telegram.org/bot${TOKEN}/${method}`, {
            method: "POST", headers: { "Content-Type": "application/json" },
            body: JSON.stringify(body),
        });
        return await r.json().catch(() => null);
    } catch { return null; }
}
export async function sendMessage(chatId: number | string, text: string) {
    // Telegram 4096 belgi cheklovi — uzun bo'lsa bo'laklaymiz
    const chunks = splitText(text, 4000);
    for (const c of chunks) {
        await tg("sendMessage", { chat_id: chatId, text: c, parse_mode: "HTML", disable_web_page_preview: true });
    }
}
function splitText(text: string, max: number): string[] {
    if (text.length <= max) return [text];
    const out: string[] = [];
    let buf = "";
    for (const line of text.split("\n")) {
        if ((buf + line + "\n").length > max) { if (buf) out.push(buf); buf = ""; }
        buf += line + "\n";
    }
    if (buf) out.push(buf);
    return out;
}

// Telegram'ga yuborilgan hujjatni (CSV) yuklab olish
export async function downloadFile(fileId: string): Promise<string | null> {
    if (!TOKEN) return null;
    const info = await tg("getFile", { file_id: fileId }) as { ok?: boolean; result?: { file_path?: string } } | null;
    const path = info?.result?.file_path;
    if (!path) return null;
    try {
        const r = await fetch(`https://api.telegram.org/file/bot${TOKEN}/${path}`);
        return await r.text();
    } catch { return null; }
}

// ── CSV parser (tirnoqli maydon, ichki vergul/qator) ──
export function parseCsv(text: string): string[][] {
    const rows: string[][] = [];
    let row: string[] = [];
    let field = "";
    let inQuotes = false;
    const src = text.replace(/\r\n/g, "\n").replace(/\r/g, "\n");
    for (let i = 0; i < src.length; i++) {
        const ch = src[i];
        if (inQuotes) {
            if (ch === '"') {
                if (src[i + 1] === '"') { field += '"'; i++; }
                else inQuotes = false;
            } else field += ch;
        } else if (ch === '"') inQuotes = true;
        else if (ch === ",") { row.push(field); field = ""; }
        else if (ch === "\n") { row.push(field); rows.push(row); row = []; field = ""; }
        else field += ch;
    }
    if (field.length || row.length) { row.push(field); rows.push(row); }
    return rows.filter((r) => r.some((c) => c.trim() !== ""));
}

function num(s?: string): number | null {
    if (!s) return null;
    const cleaned = s.replace(/[^\d.,-]/g, "").replace(/\s/g, "").replace(/,(?=\d{3}\b)/g, "").replace(",", ".");
    const n = parseFloat(cleaned);
    return isFinite(n) ? n : null;
}
function intOrNull(s?: string): number | null {
    const n = num(s);
    return n != null ? Math.round(n) : null;
}
function photos(s?: string): string[] {
    if (!s) return [];
    return s.split(/[,;\s]+/).map((u) => u.trim()).filter((u) => /^https?:\/\//.test(u)).slice(0, 10);
}

// Header → index map (nom bo'yicha o'qish; ustun tartibi muhim emas)
function headerMap(header: string[]): Record<string, number> {
    const m: Record<string, number> = {};
    header.forEach((h, i) => { m[h.trim().toLowerCase()] = i; });
    return m;
}

// Snapshot almashtirishni konkurent yuklashga bardoshli qiladi — ikki CSV
// deyarli bir vaqtda kelsa ham natija ARALASHMAYDI (bittasi to'liq yutadi).
async function withSerializableRetry(fn: (tx: Prisma.TransactionClient) => Promise<void>): Promise<void> {
    for (let attempt = 0; ; attempt++) {
        try {
            await prisma.$transaction(fn, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
            return;
        } catch (e) {
            const code = (e as { code?: string })?.code;
            if ((code === "P2034" || code === "P2028") && attempt < 3) continue; // serializatsiya ziddiyati → qayta urin
            throw e;
        }
    }
}

export interface ImportResult { kind: "sale" | "buyer" | "unknown"; count: number }

// CSV matnini import qiladi — turini header'dan aniqlaydi, snapshot'ni ALMASHTIRADI.
export async function importCsv(text: string): Promise<ImportResult> {
    const rows = parseCsv(text);
    if (rows.length < 2) return { kind: "unknown", count: 0 };
    const h = headerMap(rows[0]);
    const body = rows.slice(1);
    const get = (r: string[], key: string) => (h[key] != null ? (r[h[key]] ?? "").trim() : "");

    const isBuyer = "byudjet_min" in h || "budget_min" in h;
    const isSale = "narx" in h || "price" in h;

    if (isBuyer) {
        const data = body.map((r) => ({
            link: get(r, "link") || null,
            propertyType: get(r, "mulk_turi") || null,
            budgetMin: num(get(r, "byudjet_min") || get(r, "budget_min")),
            budgetMax: num(get(r, "byudjet_max") || get(r, "budget_max")),
            currency: get(r, "valyuta") || null,
            rooms: intOrNull(get(r, "xonalar")),
            district: get(r, "tuman") || null,
            addressText: get(r, "manzil_matn") || null,
            phone: get(r, "telefon") || null,
            name: get(r, "ismi") || null,
            note: get(r, "izoh") || null,
        }));
        await withSerializableRetry(async (tx) => {
            await tx.realtorBuyer.deleteMany({});
            await tx.realtorBuyer.createMany({ data });
        });
        return { kind: "buyer", count: data.length };
    }

    if (isSale) {
        const data = body.map((r) => ({
            link: get(r, "link") || null,
            propertyType: get(r, "mulk_turi") || null,
            price: num(get(r, "narx") || get(r, "price")),
            currency: get(r, "valyuta") || null,
            rooms: intOrNull(get(r, "xonalar")),
            areaM2: num(get(r, "maydon_m2")),
            floor: get(r, "qavat") || null,
            district: get(r, "tuman") || null,
            addressText: get(r, "manzil_matn") || null,
            lat: num(get(r, "lat")),
            lng: num(get(r, "lng")),
            condition: get(r, "holati") || null,
            description: get(r, "tavsif") || null,
            sellerName: get(r, "sotuvchi_ismi") || null,
            phone: get(r, "telefon") || null,
            postedBy: get(r, "kim") || null,
            photos: photos(get(r, "rasmlar")),
        }));
        await withSerializableRetry(async (tx) => {
            await tx.realtorListing.deleteMany({});
            await tx.realtorListing.createMany({ data });
        });
        return { kind: "sale", count: data.length };
    }

    return { kind: "unknown", count: 0 };
}

// ── Hisobot formati ──
function money(v: number | null, cur?: string | null): string {
    if (v == null) return "—";
    return `${v.toLocaleString("en-US").replace(/,/g, " ")} ${cur || ""}`.trim();
}
function esc(s?: string | null): string {
    return (s || "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

// ── Hisobot formati (emoji FAQAT shu ichki botда — oson ajratish uchun) ──
function typeIcon(t?: string | null): string {
    const k = (t || "").toLowerCase();
    if (/kvartira|kvartera|apartment|flat|кварт/.test(k)) return "🏢";
    if (/tijorat|kommer|commercial|ofis|office|коммер|офис/.test(k)) return "🏬";
    if (/\buy\b|hovli|house|\bdom\b|дом|ҳовли|ховли/.test(k)) return "🏠";
    if (/yer|uchastka|land|plot|участ/.test(k)) return "🏞";
    return "🏘";
}
// Mos-kuch belgisi: 4/4 yashil, 3/4 sariq, 2/4 ko'k
function strengthDot(score: number): string {
    if (score >= 1) return "🟢";
    if (score >= 0.75) return "🟡";
    return "🔵";
}

// Bitta e'lon sarlavhasi
function listingHead(l: RealtorListing, i: number): string {
    const bits = [`💰 ${money(l.price, l.currency)}`];
    if (l.rooms != null) bits.push(`${l.rooms} xona`);
    if (l.phone) bits.push(`📞 ${esc(l.phone)}`);
    if (l.link) bits.push(`🔗 <a href="${esc(l.link)}">link</a>`);
    if (l.photos?.length) bits.push(`🖼 ${l.photos.length}`);
    return `${typeIcon(l.propertyType)} <b>${i}. ${esc(l.propertyType || "mulk")} · ${esc(l.district || "")}</b>\n` +
        bits.join(" · ");
}
// E'longa mos bitta xaridor qatori (chapda mos-kuch belgisi)
function buyerLine(b: RealtorBuyer, reasons: string[], score: number): string {
    const budget = `${money(b.budgetMin, b.currency)}–${money(b.budgetMax, b.currency)}`;
    const bits = [b.name ? esc(b.name) : "xaridor", `byudjet ${budget}`];
    if (b.rooms != null) bits.push(`${b.rooms} xona`);
    if (b.phone) bits.push(`📞 ${esc(b.phone)}`);
    return `${strengthDot(score)} ${bits.join(" · ")} [${reasons.join(", ")}]`;
}

export interface DailyReport { text: string; photos: { url: string; caption: string }[] }

export async function buildDailyReport(maxListings = 40): Promise<DailyReport> {
    const [listings, buyers] = await Promise.all([
        prisma.realtorListing.findMany({ take: 2000 }),
        prisma.realtorBuyer.findMany({ take: 2000 }),
    ]);
    const matches = findMatches(listings, buyers, 1000);
    const today = new Date().toLocaleDateString("uz-UZ");
    const times = [...listings, ...buyers].map((r) => r.importedAt.getTime());
    const newest = times.length ? Math.max(...times) : 0;
    const ageH = newest ? (Date.now() - newest) / 3600000 : 0;
    const freshness = newest ? `\n🕐 Data yangilangan: ${new Date(newest).toLocaleString("uz-UZ")}` : "";
    // 24 soatdan eski bo'lsa — cron eski datani takrorlamasligi uchun ogohlantirish
    const stale = newest && ageH > 24
        ? `\n⚠️ <b>DATA ESKIRGAN</b> — oxirgi yangilanish ${Math.floor(ageH)} soat oldin. Yangi CSV yuklang.`
        : "";

    // E'lon bo'yicha guruhlash — matches score bo'yicha tartibli, Map tartibni saqlaydi.
    const groups = new Map<string, { listing: RealtorListing; buyers: { buyer: RealtorBuyer; reasons: string[]; score: number }[] }>();
    for (const m of matches) {
        let g = groups.get(m.listing.id);
        if (!g) { g = { listing: m.listing, buyers: [] }; groups.set(m.listing.id, g); }
        g.buyers.push({ buyer: m.buyer, reasons: m.reasons, score: m.score });
    }

    const head =
        `🏘 <b>Rieltor hisoboti — ${today}</b>${stale}\n` +
        `Sotuv: ${listings.length} · Xaridor: ${buyers.length} · Mos juftlik: ${matches.length} · Mos e'lon: ${groups.size}${freshness}\n`;

    if (!groups.size) {
        return { text: head + `\nMos juftlik topilmadi. (Data yuklang: sotuv + xaridor CSV)`, photos: [] };
    }

    const shown = [...groups.values()].slice(0, maxListings);
    const blocks = shown.map((g, i) => {
        const label = g.buyers.length > 1 ? `👥 Mos xaridorlar (${g.buyers.length}):` : "👤 Mos xaridor:";
        const subs = g.buyers.map((x) => buyerLine(x.buyer, x.reasons, x.score)).join("\n");
        return `${listingHead(g.listing, i + 1)}\n${label}\n${subs}`;
    });
    const more = groups.size > shown.length ? `\n\n…va yana ${groups.size - shown.length} ta mos e'lon.` : "";
    const text = head + "\n" + blocks.join("\n\n") + more;

    // Top mos e'lonlarning birinchi rasmi (maks 3) — matn ostidan alohida rasm sifatida
    const photos = shown
        .filter((g) => g.listing.photos?.length)
        .slice(0, 3)
        .map((g) => ({
            url: g.listing.photos[0],
            caption: `${typeIcon(g.listing.propertyType)} ${g.listing.propertyType || "mulk"} · ${g.listing.district || ""} — 💰 ${money(g.listing.price, g.listing.currency)}${g.listing.link ? `\n🔗 ${g.listing.link}` : ""}`,
        }));

    return { text, photos };
}

// Hisobotni (matn + top rasmlar) bitta chatga yuboradi
export async function sendDailyReport(chatId: number | string, report: DailyReport) {
    await sendMessage(chatId, report.text);
    for (const p of report.photos) {
        await tg("sendPhoto", { chat_id: chatId, photo: p.url, caption: p.caption });
    }
}

export { findMatches };
