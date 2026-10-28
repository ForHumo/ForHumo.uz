// Telegram Gateway API (gatewayapi.telegram.org) — telefon raqamiga kod yuborish/tekshirish.
// Kod @VerificationCodes orqali foydalanuvchi Telegramiga keladi (SMS emas).
// Kalit: TELEGRAM_GATEWAY_TOKEN (gateway.telegram.org → API). Yo'q bo'lsa 503.
//
// Kodни Telegram o'zi generatsiya qiladi (code_length) — biz saqlamaymiz, faqat
// checkVerificationStatus bilan foydalanuvchi kiritganini tasdiqlatamiz.

const TOKEN = process.env.TELEGRAM_GATEWAY_TOKEN;
const BASE = "https://gatewayapi.telegram.org";
const CODE_TTL = 300; // 5 daqiqa

export function gatewayReady(): boolean {
    return !!TOKEN;
}

/** Telefon raqamини E.164 (+...)ga keltirish. */
export function normalizePhone(raw: string): string {
    let p = (raw || "").replace(/[^\d+]/g, "");
    if (!p.startsWith("+")) {
        // 9 raqamli O'zbekiston mobil → +998; aks holda + qo'shamiz
        if (/^\d{9}$/.test(p)) p = "998" + p;
        p = "+" + p;
    }
    return p;
}

async function call(method: string, body: Record<string, unknown>): Promise<Record<string, unknown> | null> {
    if (!TOKEN) return null;
    try {
        const res = await fetch(`${BASE}/${method}`, {
            method: "POST",
            headers: { Authorization: `Bearer ${TOKEN}`, "Content-Type": "application/json" },
            body: JSON.stringify(body),
        });
        return (await res.json().catch(() => null)) as Record<string, unknown> | null;
    } catch (e) {
        console.error("[tg-gateway]", method, e);
        return null;
    }
}

/** Kod yuborish → { ok, requestId }. */
export async function sendCode(phone: string): Promise<{ ok: boolean; requestId?: string; error?: string }> {
    if (!TOKEN) return { ok: false, error: "not_configured" };
    const data = await call("sendVerificationMessage", {
        phone_number: normalizePhone(phone),
        code_length: 6,
        ttl: CODE_TTL,
    });
    const result = data?.result as { request_id?: string } | undefined;
    if (data?.ok && result?.request_id) return { ok: true, requestId: result.request_id };
    return { ok: false, error: String((data?.error as string) || "send_failed") };
}

/** Foydalanuvchi kiritgan kodни tekshirish → { verified }. */
export async function checkCode(requestId: string, code: string): Promise<{ ok: boolean; verified: boolean; error?: string }> {
    if (!TOKEN) return { ok: false, verified: false, error: "not_configured" };
    const data = await call("checkVerificationStatus", { request_id: requestId, code });
    const result = data?.result as { verification_status?: { status?: string } } | undefined;
    const status = result?.verification_status?.status;
    return { ok: !!data?.ok, verified: status === "code_valid", error: data?.ok ? undefined : String((data?.error as string) || "check_failed") };
}
