// YukGo — Telegram bot webhook (ingest). Bot guruhdagi har xabarni shu yerga yuboradi.
// Xabar → Gemini parser → dedup → YukListing (CARGO/TRUCK). LOGIST/OTHER saqlanmaydi.
//
// XAVFSIZLIK/MAXFIYLIK: telefon saqlanadi lekin FEED API uni login/obuna ortida ochadi
// (ochiq nashr qilinmaydi). Har e'londa manba havolasi (t.me/...) — raqamni qayta
// nashr o'rniga manbaga yo'naltirish. Begona guruhlardan yig'ish = vaqtinchalik seed.
//
// Setup: setWebhook(url=.../api/yukgo/ingest, secret_token=YUKGO_WEBHOOK_SECRET),
//        bot Group Privacy = OFF, bot guruhga a'zo/admin.

import { NextResponse, after } from "next/server";
import { prisma } from "@/lib/prisma";
import { parseYukListing } from "@/lib/yukgo-parse";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const SECRET = process.env.YUKGO_WEBHOOK_SECRET;
const DEDUP_WINDOW_MS = 48 * 60 * 60 * 1000;   // bir xil e'lon 48 soat ichida takrorlanmaydi
const EXPIRE_MS = 48 * 60 * 60 * 1000;          // e'lon 48 soatdan keyin eskiradi

interface TgChat { id: number; title?: string; username?: string; type?: string }
interface TgMsg {
    message_id: number; text?: string; caption?: string; chat: TgChat;
    forward_from_chat?: TgChat; forward_from_message_id?: number;          // eski Bot API
    forward_origin?: { type?: string; chat?: TgChat; message_id?: number }; // Bot API 7.0+
}
interface TgUpdate { message?: TgMsg; channel_post?: TgMsg; edited_message?: TgMsg; edited_channel_post?: TgMsg }

export async function POST(req: Request) {
    // Secret tekshiruv (Telegram setWebhook secret_token → shu header)
    if (!SECRET) return NextResponse.json({ error: "not_configured" }, { status: 503 });
    if (req.headers.get("x-telegram-bot-api-secret-token") !== SECRET) {
        return NextResponse.json({ error: "forbidden" }, { status: 401 });
    }

    const update = await req.json().catch(() => null) as TgUpdate | null;
    const msg = update?.message || update?.channel_post || update?.edited_message || update?.edited_channel_post;
    const text = (msg?.text || msg?.caption || "").trim();

    // Telegram'ga DARHOL 200 qaytaramiz; og'ir ish (Gemini + DB) after()da
    if (msg && text.length >= 5) {
        after(() => ingest(msg, text).catch(e => console.error("[yukgo-ingest]", e)));
    }
    return NextResponse.json({ ok: true });
}

async function ingest(msg: TgMsg, text: string) {
    const parsed = await parseYukListing(text);
    if (!parsed) return;
    // Faqat haqiqiy yuk e'lonlari (LOGIST reklama / OTHER spam saqlanmaydi)
    if (parsed.type !== "CARGO" && parsed.type !== "TRUCK") return;
    if (parsed.confidence < 0.5) return;

    // Manba aniqlash: (a) bot guruhda, (b) shaxsiy chatga forward qilingan (asl guruh),
    // (c) shaxsiy chatda to'g'ridan yuborilgan (foydalanuvchi o'zi joyladi = NATIVE, roziligi bilan)
    const chat = msg.chat;
    const fwdChat = msg.forward_from_chat || msg.forward_origin?.chat;
    let srcChatId: string | null = null, srcTitle: string | null = null, srcUsername: string | null = null, origMsgId: number | null = null;
    if (chat.type === "group" || chat.type === "supergroup" || chat.type === "channel") {
        srcChatId = String(chat.id); srcTitle = chat.title ?? null; srcUsername = chat.username ?? null; origMsgId = msg.message_id;
    } else if (fwdChat) {
        srcChatId = String(fwdChat.id); srcTitle = fwdChat.title ?? null; srcUsername = fwdChat.username ?? null;
        origMsgId = msg.forward_from_message_id ?? msg.forward_origin?.message_id ?? null;
    }
    // (c) private + forward emas → srcChatId null → NATIVE (sourceId null)

    let sourceId: string | null = null;
    if (srcChatId) {
        const source = await prisma.yukSource.upsert({
            where: { tgChatId: srcChatId },
            update: { title: srcTitle ?? undefined, username: srcUsername ?? undefined },
            create: { kind: "TELEGRAM", tgChatId: srcChatId, title: srcTitle, username: srcUsername },
        });
        sourceId = source.id;
    }
    const sourceLink = srcUsername && origMsgId ? `https://t.me/${srcUsername}/${origMsgId}` : null;

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
    if (dup) return;

    await prisma.yukListing.create({
        data: {
            type: parsed.type,
            status: "ACTIVE",
            sourceId,
            tgMessageId: String(origMsgId ?? msg.message_id),
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
}
