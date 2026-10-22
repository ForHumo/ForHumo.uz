// YukGo/For Humo — Telegram-telefon login: kod yuborish.
// POST { phone } → Telegram Gateway kod yuboradi → { requestId }.
// Keyin client signIn("telegram-phone", { phone, requestId, code }) qiladi.

import { NextResponse } from "next/server";
import { sendCode, gatewayReady } from "@/lib/telegram-gateway";
import { normalizePhone } from "@/lib/phone-hash";

export const dynamic = "force-dynamic";

// Oddiy cooldown — bir raqamga tez-tez yubormaslik (v1; serverless'da har lambda alohida, keyin DB)
const recent = new Map<string, number>();
const COOLDOWN_MS = 60_000;

export async function POST(req: Request) {
    if (!gatewayReady()) return NextResponse.json({ error: "not_configured" }, { status: 503 });

    const body = await req.json().catch(() => ({}));
    const e164 = normalizePhone(String(body?.phone || ""));
    if (!e164) return NextResponse.json({ error: "invalid_phone" }, { status: 400 });

    const last = recent.get(e164);
    if (last && Date.now() - last < COOLDOWN_MS) {
        return NextResponse.json({ error: "too_soon", retryAfter: Math.ceil((COOLDOWN_MS - (Date.now() - last)) / 1000) }, { status: 429 });
    }

    const res = await sendCode(e164);
    if (!res.ok || !res.requestId) return NextResponse.json({ error: res.error || "send_failed" }, { status: 502 });

    recent.set(e164, Date.now());
    return NextResponse.json({ ok: true, requestId: res.requestId });
}
