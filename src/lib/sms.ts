// SMS yuborish — Eskiz.uz orqali (O'zbekistondagi eng ommabop SMS provayder).
// Env: ESKIZ_EMAIL, ESKIZ_PASSWORD (yoki ESKIZ_TOKEN — 30 kun amal qiladi).
// Docs: https://documenter.getpostman.com/view/663428/RzfmES4z
//
// Bo'sh env → sms yuborilmaydi (fail-open), log yoziladi.

interface EskizTokenState { token: string; expiresAt: number }
let cachedToken: EskizTokenState | null = null;

async function getEskizToken(): Promise<string | null> {
    // Token env'da tayyor bo'lsa — undan foydalanish
    if (process.env.ESKIZ_TOKEN) return process.env.ESKIZ_TOKEN;

    // Cache (30 kunlik token, biz 25 kunda yangilaymiz)
    if (cachedToken && cachedToken.expiresAt > Date.now()) return cachedToken.token;

    const email = process.env.ESKIZ_EMAIL;
    const password = process.env.ESKIZ_PASSWORD;
    if (!email || !password) return null;

    try {
        const form = new FormData();
        form.append("email", email);
        form.append("password", password);
        const res = await fetch("https://notify.eskiz.uz/api/auth/login", { method: "POST", body: form });
        const d = await res.json();
        if (!d?.data?.token) return null;
        cachedToken = { token: d.data.token, expiresAt: Date.now() + 25 * 24 * 60 * 60 * 1000 };
        return cachedToken.token;
    } catch { return null; }
}

/**
 * SMS yuborish (fail-open — env sozlanmagan bo'lsa false qaytaradi).
 * `to` — 998XXXXXXXXX formatida (12 raqam), plus/probel'siz.
 */
export async function sendSms(to: string, text: string): Promise<boolean> {
    const phone = to.replace(/\D/g, "");
    if (phone.length !== 12 || !phone.startsWith("998")) return false;

    const token = await getEskizToken();
    if (!token) {
        console.info("[sms] Eskiz env sozlanmagan — SMS yuborilmadi:", { phone, text });
        return false;
    }
    const from = process.env.ESKIZ_FROM || "4546";  // Eskiz "test" alpha-name, real hisobda o'z brendi
    try {
        const form = new FormData();
        form.append("mobile_phone", phone);
        form.append("message", text);
        form.append("from", from);
        const res = await fetch("https://notify.eskiz.uz/api/message/sms/send", {
            method: "POST",
            headers: { Authorization: `Bearer ${token}` },
            body: form,
        });
        return res.ok;
    } catch { return false; }
}
