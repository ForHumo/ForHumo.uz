// YukGo — e'lonni saqlash (umumiy logika). Telegram webhook (bot) ham, userbot
// endpoint ham shuni chaqiradi. Parse → manba → dedup → YukListing.

import { prisma } from "@/lib/prisma";
import { parseYukListing, type YukParsed } from "@/lib/yukgo-parse";

const DEDUP_WINDOW_MS = 48 * 60 * 60 * 1000;   // bir xil e'lon 48 soat ichida takrorlanmaydi
const EXPIRE_MS = 48 * 60 * 60 * 1000;          // e'lon 48 soatdan keyin eskiradi

export interface StoreInput {
    text: string;
    srcChatId?: string | null;    // Telegram guruh/kanal id (null = native, shaxsiy joylash)
    srcTitle?: string | null;
    srcUsername?: string | null;
    origMsgId?: number | string | null;   // havola + tgMessageId uchun
}
export interface StoreResult {
    stored: boolean;
    reason: "ok" | "unparsable" | "duplicate";
    type?: "CARGO" | "TRUCK";
    route?: string;
}

export async function storeYukListing(input: StoreInput): Promise<StoreResult> {
    const text = (input.text || "").trim();
    if (text.length < 5) return { stored: false, reason: "unparsable" };

    const parsed = await parseYukListing(text);
    // Faqat haqiqiy yuk/mashina e'lonlari (LOGIST/OTHER/past-ishonch saqlanmaydi)
    if (!parsed || (parsed.type !== "CARGO" && parsed.type !== "TRUCK") || parsed.confidence < 0.5) {
        return { stored: false, reason: "unparsable" };
    }

    // Manba (guruh) — upsert (null bo'lsa native)
    let sourceId: string | null = null;
    if (input.srcChatId) {
        const source = await prisma.yukSource.upsert({
            where: { tgChatId: input.srcChatId },
            update: { title: input.srcTitle ?? undefined, username: input.srcUsername ?? undefined },
            create: { kind: "TELEGRAM", tgChatId: input.srcChatId, title: input.srcTitle ?? null, username: input.srcUsername ?? null },
        });
        sourceId = source.id;
    }
    const origMsgId = input.origMsgId != null ? String(input.origMsgId) : null;
    const sourceLink = input.srcUsername && origMsgId ? `https://t.me/${input.srcUsername}/${origMsgId}` : null;

    // Cross-guruh dedup (bir xil e'lon o'nlab guruhda) — 48s oynada
    const dedupKey = [
        parsed.type,
        (parsed.fromCity || "").toLowerCase().trim(),
        (parsed.toCity || "").toLowerCase().trim(),
        parsed.phones[0] || "",
        parsed.weightTons ?? "",
    ].join("|");
    const dup = await prisma.yukListing.findFirst({
        where: { dedupKey, createdAt: { gt: new Date(Date.now() - DEDUP_WINDOW_MS) } },
        select: { id: true },
    });
    if (dup) return { stored: false, reason: "duplicate", type: parsed.type };

    await prisma.yukListing.create({
        data: {
            type: parsed.type,
            status: "ACTIVE",
            sourceId,
            tgMessageId: origMsgId,
            sourceLink,
            fromText: parsed.fromText, fromCity: parsed.fromCity, fromCountry: parsed.fromCountry,
            toText: parsed.toText, toCity: parsed.toCity, toCountry: parsed.toCountry,
            cargo: parsed.cargo,
            weightTons: parsed.weightTons,
            truckTypes: parsed.truckTypes,
            quantityTrucks: parsed.quantityTrucks,
            priceAmount: parsed.price?.amount ?? null,
            priceCurrency: parsed.price?.currency ?? null,
            priceNegotiable: parsed.price?.negotiable ?? false,
            phones: parsed.phones,
            lang: parsed.lang,
            confidence: parsed.confidence,
            rawText: text.slice(0, 4000),
            dedupKey,
            expiresAt: new Date(Date.now() + EXPIRE_MS),
        },
    });

    // Mos haydovchilarga darhol push (tezlik leveri) — fail-safe
    try { await matchAndNotify(parsed); } catch (e) { console.error("[yukgo-match]", e); }

    const route = [parsed.fromCity || parsed.fromText, parsed.toCity || parsed.toText].filter(Boolean).join(" → ");
    return { stored: true, reason: "ok", type: parsed.type, route };
}

// Yangi CARGO e'lon → yo'nalishi mos haydovchilarga Web Push.
async function matchAndNotify(p: YukParsed) {
    if (p.type !== "CARGO") return;   // truckerlar yuk qidiradi
    const lf = (p.fromCity || "").toLowerCase().trim();
    const lt = (p.toCity || "").toLowerCase().trim();
    if (!lf || !lt) return;

    const drivers = await prisma.yukDriver.findMany({
        where: { notifyOnMatch: true, routeFromCity: { not: null }, routeToCity: { not: null } },
        select: { profileId: true, routeFromCity: true, routeToCity: true, capacityTons: true },
        take: 1000,
    });
    const matched = drivers.filter(d => {
        const df = (d.routeFromCity || "").toLowerCase().trim();
        const dt = (d.routeToCity || "").toLowerCase().trim();
        if (!df || !dt) return false;
        const fromOk = lf.includes(df) || df.includes(lf);
        const toOk = lt.includes(dt) || dt.includes(lt);
        if (!fromOk || !toOk) return false;
        if (d.capacityTons != null && p.weightTons != null && d.capacityTons < p.weightTons) return false; // sig'maydi
        return true;
    });
    if (!matched.length) return;

    const title = `Yangi yuk: ${p.fromCity} → ${p.toCity}`;
    const body = [p.weightTons ? `${p.weightTons} t` : null, p.cargo].filter(Boolean).join(" · ") || "Mos yuk topildi";
    const { sendPushToProfile } = await import("@/lib/push");
    await Promise.all(matched.slice(0, 300).map(d =>
        sendPushToProfile(d.profileId, { title, body, url: "/uz/yukgo", tag: "yukgo-match" }).catch(() => null),
    ));
}
