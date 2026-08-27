// Chat Lock (PIN) helper — pin hash + verify.
// pinHash = sha256(pin + ownerId) hex.

import crypto from "crypto";

export function hashPin(pin: string, ownerId: string): string {
    const h = crypto.createHash("sha256");
    h.update(pin);
    h.update(":");
    h.update(ownerId);
    return h.digest("hex");
}

export function isPinValid(pin: string): boolean {
    return /^\d{4,8}$/.test(pin);
}

// Session token — foydalanuvchi PIN'ni sessiya ichida qayta so'ramaslik uchun
// server tokendan foydalanmaydi; client cookie/session storage ishlatadi (30 daq).
// Bu helper faqat schema uchun.
