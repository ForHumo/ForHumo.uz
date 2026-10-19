// YukGo — Telegram BOT webhook (ingest). Bot shaxsiy chatdagi xabar/forward va
// (Group Privacy OFF bo'lsa) guruh xabarlarini shu yerga yuboradi.
// Store logikasi umumiy: src/lib/yukgo-ingest.ts (userbot endpoint ham shuni ishlatadi).
//
// Setup: setWebhook(url=.../api/yukgo/ingest, secret_token=YUKGO_WEBHOOK_SECRET).

import { NextResponse, after } from "next/server";
import { storeYukListing } from "@/lib/yukgo-ingest";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const SECRET = process.env.YUKGO_WEBHOOK_SECRET;
const BOT_TOKEN = process.env.TELEGRAM_YUKGO_BOT_TOKEN;
const FEED_URL = "https://www.forhumo.uz/uz/yukgo";
const WELCOME =
    "Salom! Men YukGo botiman.\n\n" +
    "Yuk yoki bo'sh mashina e'loningizni shu yerga yuboring — yoki guruhdagi e'lonni forward qiling. " +
    "Men uni avtomatik ajratib YukGo'ga joylayman.\n\n" +
    "Barcha e'lonlar: " + FEED_URL;

interface TgChat { id: number; title?: string; username?: string; type?: string }
interface TgMsg {
    message_id: number; text?: string; caption?: string; chat: TgChat;
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

    // Shaxsiy chat komandalari (/start, /help)
    if (isPrivate && text.startsWith("/")) {
        after(() => reply(msg.chat.id, WELCOME));
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

    const res = await storeYukListing({ text, srcChatId, srcTitle, srcUsername, origMsgId });

    if (isPrivate) {
        if (res.reason === "duplicate") await reply(chat.id, "Bu e'lon allaqachon YukGo'da bor.");
        else if (!res.stored) await reply(chat.id, "Bu matndan yuk yoki mashina e'lonini ajrata olmadim. To'liqroq yuboring: yo'nalish (qayerdan→qayerga), yuk/mashina, telefon.");
        else await reply(chat.id, `Joylandi — ${res.type === "CARGO" ? "Yuk" : "Mashina"}${res.route ? `: ${res.route}` : ""}\n${FEED_URL}`);
    }
}
