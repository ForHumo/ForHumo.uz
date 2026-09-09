// Humo ID ↔ Telegram bog'lash logikasi.
// Foydalanuvchi web'da (Humo ID sahifasi) kod oladi → bot'ga yuboradi → bog'lanadi.
//
// Kod formati: 6 belgi A-Z0-9 (o'qish qulay). TTL 10 daqiqa.

import crypto from "node:crypto";
import { prisma } from "@/lib/prisma";
import type { BotKey } from "@/lib/telegram-bots";

const CODE_TTL_MS = 10 * 60 * 1000;   // 10 daqiqa
const CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";   // O/0, 1/I chetlab
const CODE_LEN = 6;

export function generateCode(): string {
    const bytes = crypto.randomBytes(CODE_LEN);
    let out = "";
    for (let i = 0; i < CODE_LEN; i++) out += CODE_ALPHABET[bytes[i] % CODE_ALPHABET.length];
    return out;
}

/** Foydalanuvchi Humo ID'da kod so'raganda chaqiriladi. Har safar yangi kod. */
export async function createLinkCode(profileId: string): Promise<{ code: string; expiresAt: Date }> {
    // Ilgari yaratilgan foydalanilmagan kodlarni tozalab qo'yamiz
    await prisma.telegramLinkCode.deleteMany({
        where: { profileId, usedAt: null, expiresAt: { lt: new Date() } },
    });

    const code = generateCode();
    const expiresAt = new Date(Date.now() + CODE_TTL_MS);
    await prisma.telegramLinkCode.create({
        data: { code, profileId, expiresAt },
    });
    return { code, expiresAt };
}

export interface ClaimResult {
    ok: boolean;
    profileId?: string;
    error?: "not_found" | "expired" | "already_used" | "already_linked_other";
    profile?: { name: string | null; username: string | null; humoId: string | null };
}

/**
 * Bot foydalanuvchi yuborgan kod'ni tekshiradi va Identity yaratadi.
 * Idempotent: agar Identity allaqachon bor bo'lsa (bir xil provider+providerId), qaytmasdan ok qaytaradi.
 */
export async function claimLinkCode(
    code: string,
    telegramUserId: string,
    telegramUsername: string | null,
    photoUrl: string | null,
    bot: BotKey,
): Promise<ClaimResult> {
    const link = await prisma.telegramLinkCode.findUnique({ where: { code: code.toUpperCase().trim() } });
    if (!link) return { ok: false, error: "not_found" };
    if (link.usedAt) return { ok: false, error: "already_used" };
    if (link.expiresAt.getTime() < Date.now()) return { ok: false, error: "expired" };

    // Bu Telegram id boshqa profilga bog'langanmi?
    const existing = await prisma.identity.findUnique({
        where: { provider_providerId: { provider: "TELEGRAM", providerId: telegramUserId } },
    });
    if (existing && existing.profileId !== link.profileId) {
        return { ok: false, error: "already_linked_other" };
    }

    // Identity yaratish yoki yangilash
    if (!existing) {
        await prisma.identity.create({
            data: {
                profileId: link.profileId,
                provider: "TELEGRAM",
                providerId: telegramUserId,
                username: telegramUsername,
                photoUrl,
            },
        });
    } else {
        await prisma.identity.update({
            where: { id: existing.id },
            data: { username: telegramUsername, photoUrl },
        });
    }

    await prisma.telegramLinkCode.update({
        where: { id: link.id },
        data: { usedAt: new Date(), usedByTgId: telegramUserId, usedByBot: bot },
    });

    const profile = await prisma.userProfile.findUnique({
        where: { id: link.profileId },
        select: { name: true, username: true, humoId: true },
    });

    return { ok: true, profileId: link.profileId, profile: profile ?? undefined };
}

/** Telegram user id bo'yicha Humo profilini topish (ulangan bo'lsa). */
export async function findLinkedProfile(telegramUserId: string): Promise<{ profileId: string; name: string | null; username: string | null; humoId: string | null } | null> {
    const identity = await prisma.identity.findUnique({
        where: { provider_providerId: { provider: "TELEGRAM", providerId: telegramUserId } },
        include: {
            profile: { select: { id: true, name: true, username: true, humoId: true } },
        },
    });
    if (!identity) return null;
    return {
        profileId: identity.profile.id,
        name: identity.profile.name,
        username: identity.profile.username,
        humoId: identity.profile.humoId,
    };
}
