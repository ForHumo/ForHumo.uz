// Telegram Login Widget imzo tekshiruvi (BEPUL — balans talab qilmaydi).
// https://core.telegram.org/widgets/login#checking-authorization
//
// Widget @YukGo_tgbot nomidan foydalanuvchiga 1-bosqichli "Telegram bilan kirish"
// tugmasini beradi. Telegram qaytargan payload imzosi bot token bilan tekshiriladi:
//   secret_key = SHA256(bot_token)
//   data_check_string = payload'ning hash'dan boshqa maydonlari, kalit bo'yicha
//     alfavit tartibida, "k=v" ko'rinishida, "\n" bilan birlashtirilgan
//   HMAC_SHA256(data_check_string, secret_key) === payload.hash
//
// Telefon BERMAYDI — faqat Telegram ID + ism + username + foto. Telefon kerak
// bo'lganda (haydovchi e'lon joylaganda) bot orqali alohida so'raladi.

import crypto from "crypto";

const BOT_TOKEN = process.env.TELEGRAM_YUKGO_BOT_TOKEN;

// Imzo eskirgan deb hisoblanadigan muddat (soniya). Telegram auth_date UNIX.
const MAX_AGE_SEC = 60 * 60 * 24; // 24 soat

export interface TgWidgetUser {
    id: string;              // Telegram user id (raqam, string sifatida)
    firstName: string | null;
    lastName: string | null;
    username: string | null;
    photoUrl: string | null;
}

export function telegramWidgetReady(): boolean {
    return !!BOT_TOKEN;
}

// Telegram Login Widget payload'ini tekshiradi. To'g'ri bo'lsa foydalanuvchi
// ma'lumotini, aks holda null qaytaradi (fail-closed).
export function verifyTelegramWidget(raw: unknown): TgWidgetUser | null {
    if (!BOT_TOKEN) return null;
    if (!raw || typeof raw !== "object") return null;

    const data = raw as Record<string, unknown>;
    const hash = typeof data.hash === "string" ? data.hash : "";
    const authDate = Number(data.auth_date);
    const id = data.id != null ? String(data.id) : "";
    if (!hash || !id || !Number.isFinite(authDate)) return null;

    // Imzo eskirgan bo'lmasin (replay himoyasi)
    const nowSec = Math.floor(Date.now() / 1000);
    if (nowSec - authDate > MAX_AGE_SEC) return null;

    // data_check_string — hash'dan boshqa barcha maydonlar, kalit bo'yicha saralangan
    const checkString = Object.keys(data)
        .filter((k) => k !== "hash" && data[k] != null)
        .sort()
        .map((k) => `${k}=${String(data[k])}`)
        .join("\n");

    const secret = crypto.createHash("sha256").update(BOT_TOKEN).digest();
    const hmac = crypto.createHmac("sha256", secret).update(checkString).digest("hex");

    // Doimiy-vaqtli taqqoslash
    let ok = false;
    try {
        ok = hmac.length === hash.length &&
            crypto.timingSafeEqual(Buffer.from(hmac, "hex"), Buffer.from(hash, "hex"));
    } catch { ok = false; }
    if (!ok) return null;

    return {
        id,
        firstName: typeof data.first_name === "string" ? data.first_name : null,
        lastName: typeof data.last_name === "string" ? data.last_name : null,
        username: typeof data.username === "string" ? data.username : null,
        photoUrl: typeof data.photo_url === "string" ? data.photo_url : null,
    };
}
