// YukGo — USERBOT ingest endpoint (MTProto userbot guruhlardan yuboradi).
// Bot webhook'dan farqi: toza payload + X-API-KEY auth (Telegram Update shakli emas).
// POST /api/yukgo/ingest-bot
//   header: x-api-key: YUKGO_INGEST_KEY
//   body: { message_id, chat_id, chat_title?, chat_username?, text, date? }

import { NextResponse, after } from "next/server";
import { storeYukListing } from "@/lib/yukgo-ingest";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const KEY = process.env.YUKGO_INGEST_KEY;

export async function POST(req: Request) {
    if (!KEY) return NextResponse.json({ error: "not_configured" }, { status: 503 });
    if (req.headers.get("x-api-key") !== KEY) {
        return NextResponse.json({ error: "forbidden" }, { status: 401 });
    }

    const body = await req.json().catch(() => null) as Record<string, unknown> | null;
    const text = String(body?.text ?? "").trim();
    if (!body || text.length < 5) return NextResponse.json({ ok: true, stored: false, reason: "empty" });

    // Telegram'ga javob kutilmaydi — darhol 200, og'ir ish (Gemini + DB) after()da
    after(() => storeYukListing({
        text,
        srcChatId: body.chat_id != null ? String(body.chat_id) : null,
        srcTitle: typeof body.chat_title === "string" ? body.chat_title : null,
        srcUsername: typeof body.chat_username === "string" ? body.chat_username : null,
        origMsgId: typeof body.message_id === "number" || typeof body.message_id === "string" ? body.message_id : null,
    }).catch(e => console.error("[yukgo-ingest-bot]", e)));

    return NextResponse.json({ ok: true });
}
