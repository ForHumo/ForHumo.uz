// Rieltor bot — yordamchilar: Telegram API, oq ro'yxat, CSV import (snapshot
// almashtirish), kunlik hisobot formati. Webhook va cron shularni ishlatadi.
// Public UI yo'q; faqat REALTOR_BOT_ALLOWED_IDS dagi 2-3 kishi.

import { prisma } from "@/lib/prisma";
import { findMatches, type Match } from "@/lib/realtor-match";
import type { RealtorListing, RealtorBuyer } from "@prisma/client";

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
        await prisma.$transaction([
            prisma.realtorBuyer.deleteMany({}),
            prisma.realtorBuyer.createMany({ data }),
        ]);
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
        await prisma.$transaction([
            prisma.realtorListing.deleteMany({}),
            prisma.realtorListing.createMany({ data }),
        ]);
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

function matchLine(m: Match, i: number): string {
    const l = m.listing, b = m.buyer;
    const price = money(l.price, l.currency);
    const budget = `${money(b.budgetMin, b.currency)}–${money(b.budgetMax, b.currency)}`;
    const parts = [
        `<b>${i + 1}. ${esc(l.propertyType || "mulk")} · ${esc(l.district || "")}</b>`,
        `Sotuv: ${price}${l.rooms ? ` · ${l.rooms} xona` : ""}${l.phone ? ` · ${esc(l.phone)}` : ""}${l.link ? ` · <a href="${esc(l.link)}">link</a>` : ""}`,
        `Xaridor: byudjet ${budget}${b.rooms ? ` · ${b.rooms} xona` : ""}${b.phone ? ` · ${esc(b.phone)}` : ""}${b.name ? ` (${esc(b.name)})` : ""}`,
        `Mos: ${m.reasons.join(", ")}`,
    ];
    return parts.join("\n");
}

export async function buildDailyReport(topMatches = 20): Promise<string> {
    const [listings, buyers] = await Promise.all([
        prisma.realtorListing.findMany({ take: 2000 }),
        prisma.realtorBuyer.findMany({ take: 2000 }),
    ]);
    const matches = findMatches(listings, buyers, topMatches);
    const today = new Date().toLocaleDateString("uz-UZ");
    const times = [...listings, ...buyers].map((r) => r.importedAt.getTime());
    const freshness = times.length ? `\nData yangilangan: ${new Date(Math.max(...times)).toLocaleString("uz-UZ")}` : "";

    const head =
        `<b>Rieltor hisoboti — ${today}</b>\n` +
        `Sotuv: ${listings.length} · Xaridor: ${buyers.length} · Mos juftlik: ${matches.length}${freshness}\n`;

    if (!matches.length) {
        return head + `\nMos juftlik topilmadi. (Data yuklang: sotuv + xaridor CSV)`;
    }
    const body = matches.map((m, i) => matchLine(m, i)).join("\n\n");
    return head + "\n" + body;
}

export { findMatches };
