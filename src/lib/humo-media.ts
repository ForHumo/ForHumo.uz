// Humo Media (GIF & Sticker) — yordamchi funksiyalar.

import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { moderateContent } from "@/lib/ai-moderate";
import type { HumoMediaKind } from "@prisma/client";

/** Auth talab qiladi — profil topib beradi yoki null qaytaradi. */
export async function requireHumoAuth(): Promise<{ profileId: string } | null> {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) return null;
    const me = await prisma.userProfile.findUnique({
        where: { email: session.user.email },
        select: { id: true },
    });
    return me ? { profileId: me.id } : null;
}

/** Pack slug generatsiya — nomdan lotin translit + 6-belgi noyob suffix. */
export function slugifyPackName(name: string, ownerHandle: string): string {
    const base = name.toLowerCase()
        .replace(/[^a-z0-9а-яё\s-]/gi, "")
        .replace(/\s+/g, "-")
        .replace(/-+/g, "-")
        .slice(0, 24)
        .replace(/^-+|-+$/g, "");
    const handle = (ownerHandle || "u").toLowerCase().replace(/[^a-z0-9]/g, "").slice(0, 10);
    const rand = Math.random().toString(36).slice(2, 8);
    return `${base || "pack"}-${handle}-${rand}`;
}

/**
 * Item upload'idan keyin AI moderatsiya (fail-safe).
 * Rasm/thumbnail'ni tekshiradi. BLOCK bo'lsa item hidden qilinadi va
 * pack cover yangilanmaydi.
 */
export async function moderateHumoItem(itemId: string, imageUrl: string): Promise<void> {
    try {
        const verdict = await moderateContent({
            kind: "humo_media_item",
            text: null,
            imageUrl,
        });
        if (verdict?.verdict === "BLOCK") {
            await prisma.humoMediaItem.update({
                where: { id: itemId },
                data: { hidden: true },
            });
            // TODO: user'ga notification: "Item bloklandi — 18+ kontent"
        }
    } catch { /* jim */ }
}

/** Pack cover'ni birinchi ko'rinadigan (hidden emas) item'dan avto olish. */
export async function refreshPackCover(packId: string): Promise<void> {
    const first = await prisma.humoMediaItem.findFirst({
        where: { packId, hidden: false },
        orderBy: { order: "asc" },
        select: { thumbUrl: true, mediaUrl: true },
    });
    if (!first) return;
    await prisma.humoMediaPack.update({
        where: { id: packId },
        data: { coverUrl: first.thumbUrl ?? first.mediaUrl },
    });
}

export const PACK_MAX_ITEMS = 120;
export const USER_MAX_PACKS = 20;
export const GIF_MAX_BYTES = 8 * 1024 * 1024;      // 8 MB
export const STICKER_MAX_BYTES = 1 * 1024 * 1024;  // 1 MB

export function limitForKind(kind: HumoMediaKind): number {
    return kind === "GIF" ? GIF_MAX_BYTES : STICKER_MAX_BYTES;
}
