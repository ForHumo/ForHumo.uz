// AI moderation guard — kontent yaratishdan oldin foydalanuvchi bloklanganmi tekshiradi.
// Har qanday POST endpoint'da chaqiriladi: post, comment, video, track, live chat, ...
//
// Foydalanish:
//   const banned = await banGuard(profileId);
//   if (banned) return banned;   // NextResponse (403) qaytariladi

import { NextResponse } from "next/server";
import { getActiveBan } from "@/lib/moderation-ladder";
import { BAN_LABELS } from "@/lib/moderation-ladder";

/** Foydalanuvchi ban ostidami? Bo'lsa 403 NextResponse qaytaradi, aks holda null. */
export async function banGuard(profileId: string): Promise<NextResponse | null> {
    const ban = await getActiveBan(profileId);
    if (!ban) return null;

    const remaining = ban.expiresAt
        ? `${BAN_LABELS[ban.level]} (${ban.expiresAt.toLocaleString("uz-UZ")} gacha)`
        : "Abadiy";

    return NextResponse.json({
        error: `Sizga kontent yaratish taqiqlangan. Muddat: ${remaining}. Sabab: ${ban.reason}. Adolatsiz deb hisoblasangiz, ariza berishingiz mumkin.`,
        code: "USER_BANNED",
        banId: ban.id,
        expiresAt: ban.expiresAt,
        reason: ban.reason,
        category: ban.category,
        level: ban.level,
    }, { status: 403 });
}
