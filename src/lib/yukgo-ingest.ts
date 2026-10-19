// YukGo — e'lonni saqlash (umumiy logika). Telegram webhook (bot) ham, userbot
// endpoint ham shuni chaqiradi. Parse → manba → dedup → YukListing.

import { prisma } from "@/lib/prisma";
import { parseYukListing } from "@/lib/yukgo-parse";

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

    const route = [parsed.fromCity || parsed.fromText, parsed.toCity || parsed.toText].filter(Boolean).join(" → ");
    return { stored: true, reason: "ok", type: parsed.type, route };
}
