// YukGo — Telegram BOT webhook (ingest). Bot shaxsiy chatdagi xabar/forward va
// (Group Privacy OFF bo'lsa) guruh xabarlarini shu yerga yuboradi.
// Store logikasi umumiy: src/lib/yukgo-ingest.ts (userbot endpoint ham shuni ishlatadi).
//
// Setup: setWebhook(url=.../api/yukgo/ingest, secret_token=YUKGO_WEBHOOK_SECRET).

import { NextResponse, after } from "next/server";
import { storeYukListing } from "@/lib/yukgo-ingest";
import { botWelcome, botDuplicate, botUnparsable, botPosted } from "@/lib/yukgo-i18n";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const SECRET = process.env.YUKGO_WEBHOOK_SECRET;
const BOT_TOKEN = process.env.TELEGRAM_YUKGO_BOT_TOKEN;

interface TgChat { id: number; title?: string; username?: string; type?: string }
interface TgUser { language_code?: string }
interface TgMsg {
    message_id: number; text?: string; caption?: string; chat: TgChat;
    from?: TgUser;                                                         // foydalanuvchi tili uchun
    forward_from_chat?: TgChat; forward_from_message_id?: number;          // eski Bot API
    forward_origin?: { type?: string; chat?: TgChat; message_id?: number }; // Bot API 7.0+
}
interface TgUpdate { message?: TgMsg; channel_post?: TgMsg; edited_message?: TgMsg; edited_channel_post?: TgMsg }

// Botdan foydalanuvchiga javob (faqat shaxsiy chat — guruhda spam qilmaymiz)
async function reply(chatId: number, text: string) {
    if (!BOT_TOKEN) return;
    try {
        await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
            method: "POST", headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ chat_id: chatId, text, disable_web_page_preview: true }),
        });
    } catch { /* ignore */ }
}

export async function POST(req: Request) {
    if (!SECRET) return NextResponse.json({ error: "not_configured" }, { status: 503 });
    if (req.headers.get("x-telegram-bot-api-secret-token") !== SECRET) {
        return NextResponse.json({ error: "forbidden" }, { status: 401 });
    }

    const update = await req.json().catch(() => null) as TgUpdate | null;
    const msg = update?.message || update?.channel_post || update?.edited_message || update?.edited_channel_post;
    if (!msg) return NextResponse.json({ ok: true });
    const text = (msg.text || msg.caption || "").trim();
    const isPrivate = !["group", "supergroup", "channel"].includes(msg.chat.type || "private");

    // Shaxsiy chat komandalari (/start, /help) — foydalanuvchi tilida
    if (isPrivate && text.startsWith("/")) {
        after(() => reply(msg.chat.id, botWelcome(msg.from?.language_code)));
        return NextResponse.json({ ok: true });
    }

    if (text.length >= 5) {
        after(() => handle(msg, text, isPrivate).catch(e => console.error("[yukgo-ingest]", e)));
    }
    return NextResponse.json({ ok: true });
}

async function handle(msg: TgMsg, text: string, isPrivate: boolean) {
    // Manba aniqlash: guruh / forward (asl guruh) / private (native)
    const chat = msg.chat;
    const fwdChat = msg.forward_from_chat || msg.forward_origin?.chat;
    let srcChatId: string | null = null, srcTitle: string | null = null, srcUsername: string | null = null;
    let origMsgId: number | null = null;
    if (["group", "supergroup", "channel"].includes(chat.type || "")) {
        srcChatId = String(chat.id); srcTitle = chat.title ?? null; srcUsername = chat.username ?? null; origMsgId = msg.message_id;
    } else if (fwdChat) {
        srcChatId = String(fwdChat.id); srcTitle = fwdChat.title ?? null; srcUsername = fwdChat.username ?? null;
        origMsgId = msg.forward_from_message_id ?? msg.forward_origin?.message_id ?? null;
    }

    const rateKey = isPrivate ? `dm:${chat.id}` : null;   // shaxsiy DM — har foydalanuvchi bo'yicha Gemini throttle
    const res = await storeYukListing({ text, srcChatId, srcTitle, srcUsername, origMsgId, rateKey });

    if (isPrivate) {
        const lang = msg.from?.language_code;
        if (res.reason === "rate_limited") return;                 // juda tez-tez — jim (flood himoyasi)
        if (res.reason === "duplicate") await reply(chat.id, botDuplicate(lang));
        else if (!res.stored) await reply(chat.id, botUnparsable(lang));
        else await reply(chat.id, botPosted(lang, res.type ?? "CARGO", res.route));
    }
}
