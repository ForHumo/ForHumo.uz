import { createHmac, timingSafeEqual } from "node:crypto";

// Hamkor (Sevinch Sweets) server-aro chaqiruvlari. Ikki usul qo'llanadi:
//  1) HMAC imzo (afzal): `X-Partner-Timestamp` + `X-Partner-Signature` =
//     HMAC-SHA256(`${ts}.${rawBody}`, key). Replay (5 daqiqa oynasi) va
//     buzib-yuborishdan himoya qiladi; kalit tarmoqda uzatilmaydi.
//  2) Bearer (zaxira / rotatsiya davri): `Authorization: Bearer <key>`.
//
// Kalit rotatsiyasi: yangi kalitni SEVINCH_PARTNER_KEY ga, eskisini
// SEVINCH_PARTNER_KEY_OLD ga qo'ying — ikkalasi ham bir muddat qabul qilinadi.

type Partner = { name: string; keys: string[] };

function partners(): Partner[] {
  const keys = [
    process.env.SEVINCH_PARTNER_KEY,
    process.env.SEVINCH_PARTNER_KEY_OLD,
  ].filter((k): k is string => !!k);
  return keys.length ? [{ name: "sevinch", keys }] : [];
}

function safeEq(a: string, b: string): boolean {
  const ba = Buffer.from(a);
  const bb = Buffer.from(b);
  return ba.length === bb.length && timingSafeEqual(ba, bb);
}

// Tasdiqlangan hamkor nomini qaytaradi, aks holda null. rawBody — so'rov tanasi
// (GET uchun "").
export function authPartner(req: Request, rawBody: string): string | null {
  const ts = req.headers.get("x-partner-timestamp");
  const sig = req.headers.get("x-partner-signature");
  const bearer = (req.headers.get("authorization") ?? "").replace(/^Bearer\s+/i, "");

  for (const p of partners()) {
    for (const key of p.keys) {
      if (ts && sig) {
        const n = Number(ts);
        if (Number.isFinite(n) && Math.abs(Date.now() - n) <= 5 * 60 * 1000) {
          const expected = createHmac("sha256", key)
            .update(`${ts}.${rawBody}`)
            .digest("hex");
          if (safeEq(expected, sig)) return p.name;
        }
      }
      if (bearer && safeEq(bearer, key)) return p.name;
    }
  }
  return null;
}

// Yengil rate-limit (sliding window). DIQQAT: bu xotirada, INSTANCE bo'yicha —
// serverless'da bir necha instance bo'lishi mumkin, shuning uchun bu mutlaq emas,
// faqat sodda flood'ga to'siq. To'liq himoya uchun shared store (Upstash) kerak.
const WINDOW_MS = 10_000;
const MAX_PER_WINDOW = 120;
const hits = new Map<string, number[]>();

export function withinRateLimit(partner: string): boolean {
  const now = Date.now();
  const recent = (hits.get(partner) ?? []).filter((t) => now - t < WINDOW_MS);
  recent.push(now);
  hits.set(partner, recent);
  return recent.length <= MAX_PER_WINDOW;
}
