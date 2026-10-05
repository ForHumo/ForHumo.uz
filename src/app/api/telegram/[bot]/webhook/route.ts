// Umumiy Telegram webhook — "generic" botlar uchun (BOTS[key].generic === true):
//   forhumo, humo_id, nexus, esport, market, pay, ummi, support
// humo_ai va bozor_narxida o'z static route'lariga ega (ular bu yerga tushmaydi —
// Next.js static segmentni dinamikdan ustun qo'yadi).
//
//   POST /api/telegram/<botKey>/webhook
//   Xavfsizlik: X-Telegram-Bot-Api-Secret-Token (agar <KEY>_WEBHOOK_SECRET env bo'lsa).

import { NextResponse, after } from "next/server";
import { BOTS, secretFor, type BotKey } from "@/lib/telegram-bots";
import { handleGenericUpdate } from "@/lib/telegram-bot-generic";
import type { TgUpdate } from "@/lib/telegram-bot";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 30;

function genericBotKey(key: string): BotKey | null {
    return (key in BOTS && BOTS[key as BotKey].generic === true) ? (key as BotKey) : null;
}

export async function POST(req: Request, { params }: { params: Promise<{ bot: string }> }) {
    const { bot } = await params;
    const botKey = genericBotKey(bot);
    if (!botKey) {
        return NextResponse.json({ ok: false, error: "unknown_bot" }, { status: 404 });
    }

    // Secret tekshiruvi (sozlangan bo'lsa)
    const secret = secretFor(botKey);
    if (secret) {
        const provided = req.headers.get("x-telegram-bot-api-secret-token");
        if (provided !== secret) {
            return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
        }
    }

    let update: TgUpdate;
    try {
        update = await req.json();
    } catch {
        return NextResponse.json({ ok: false, error: "invalid_json" }, { status: 400 });
    }

    after(async () => {
        try { await handleGenericUpdate(botKey, update); }
        catch (e) { console.error(`[tg-generic:${botKey}]`, e); }
    });

    return NextResponse.json({ ok: true });
}
