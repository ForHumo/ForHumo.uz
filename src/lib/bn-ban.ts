// BN ban tizimi — bitta joyda tekshiruv va harakat.
//
// Ban semantikasi:
//   - Ban = do'kon (yoki butun profil) muzlatilgan. Elonlar hidden=true, do'kon status=SUSPENDED.
//   - TEMP bo'lsa expiresAt tekshiriladi; muddat tugasa avtomatik lift bo'ladi (isBanActive).
//   - PERM bo'lsa expiresAt=null, faqat qo'lda lift qilinadi.
//   - Balansdan pul yechish huquqi qoladi (Pay wallet ta'sirlanmaydi).
//   - Xarid huquqi ban da qoladi (faqat do'kon/mahsulot ko'rinmaydi).
//
// Termination (chiqarib yuborish):
//   - BnShop.status = TERMINATED. Do'kon abadiy o'lik, qayta ochib bo'lmaydi.
//   - Xarid huquqi qoladi.
//   - Xuddi shu marketId/onlineType uchun profil boshqa do'kon ochishga urina olmaydi (apply rejects).

import { prisma } from "@/lib/prisma";

export type BanDecidedBy = "AI" | "OWNER" | "MODERATOR";

/** Foydalanuvchining faol bani bormi (profile scope) */
export async function isProfileBanned(profileId: string): Promise<boolean> {
    const now = new Date();
    const b = await prisma.bnBan.findFirst({
        where: {
            profileId, scope: "PROFILE", status: "ACTIVE",
            OR: [{ expiresAt: null }, { expiresAt: { gt: now } }],
        },
        select: { id: true },
    });
    return !!b;
}

/** Do'kon faol banda ekanmi (yoki uning egasi PROFILE ban olganmi) */
export async function isShopBanned(shopId: string, profileId?: string): Promise<boolean> {
    const now = new Date();
    if (profileId && (await isProfileBanned(profileId))) return true;
    const b = await prisma.bnBan.findFirst({
        where: {
            shopId, scope: "SHOP", status: "ACTIVE",
            OR: [{ expiresAt: null }, { expiresAt: { gt: now } }],
        },
        select: { id: true },
    });
    return !!b;
}

/** ACTIVE + hozircha amal qiladigan barcha banlar (profilesId bo'yicha) */
export async function getActiveBans(profileId: string) {
    const now = new Date();
    return prisma.bnBan.findMany({
        where: {
            profileId, status: "ACTIVE",
            OR: [{ expiresAt: null }, { expiresAt: { gt: now } }],
        },
        orderBy: { createdAt: "desc" },
    });
}

/**
 * Ban qo'yish. Do'konni SUSPENDED qiladi, mahsulotlarni yashiradi.
 * decidedBy=AI bo'lsa decidedById null.
 */
export async function applyBan(input: {
    profileId: string;
    shopId?: string;                 // undefined = butun profil
    type: "TEMP" | "PERM";
    reason: string;
    publicReason?: string;
    expiresAt?: Date;                // TEMP uchun majburiy
    decidedBy: BanDecidedBy;
    decidedById?: string;            // OWNER/MODERATOR uchun
}) {
    const scope = input.shopId ? "SHOP" : "PROFILE";
    if (input.type === "TEMP" && !input.expiresAt) {
        throw new Error("TEMP ban expiresAt kerak");
    }

    const ban = await prisma.$transaction(async (tx) => {
        const created = await tx.bnBan.create({
            data: {
                profileId: input.profileId,
                shopId: input.shopId,
                scope,
                type: input.type,
                reason: input.reason.slice(0, 500),
                publicReason: input.publicReason?.slice(0, 200),
                expiresAt: input.type === "TEMP" ? input.expiresAt : null,
                decidedBy: input.decidedBy,
                decidedById: input.decidedById,
            },
        });

        // Do'kon(lar)ni muzlatish
        if (scope === "SHOP" && input.shopId) {
            await tx.bnShop.update({
                where: { id: input.shopId },
                data: { status: "SUSPENDED", suspendedAt: new Date(), suspendReason: input.reason.slice(0, 200) },
            });
            await tx.bnProduct.updateMany({
                where: { shopId: input.shopId },
                data: { hidden: true, isActive: false },
            });
        } else {
            // PROFILE — barcha do'konlar
            const shops = await tx.bnShop.findMany({
                where: { profileId: input.profileId }, select: { id: true },
            });
            const ids = shops.map(s => s.id);
            if (ids.length > 0) {
                await tx.bnShop.updateMany({
                    where: { id: { in: ids } },
                    data: { status: "SUSPENDED", suspendedAt: new Date(), suspendReason: input.reason.slice(0, 200) },
                });
                await tx.bnProduct.updateMany({
                    where: { shopId: { in: ids } },
                    data: { hidden: true, isActive: false },
                });
            }
        }
        return created;
    });

    return ban;
}

/** Ban ni bekor qilish. Do'konlar APPROVED holatiga qaytadi. */
export async function liftBan(banId: string, opts: { liftedById?: string; liftReason?: string }) {
    return prisma.$transaction(async (tx) => {
        const ban = await tx.bnBan.findUnique({ where: { id: banId } });
        if (!ban) throw new Error("Ban topilmadi");
        if (ban.status !== "ACTIVE") throw new Error("Ban allaqachon lift/expired");

        await tx.bnBan.update({
            where: { id: banId },
            data: {
                status: "LIFTED",
                liftedAt: new Date(),
                liftedById: opts.liftedById,
                liftReason: opts.liftReason?.slice(0, 500),
            },
        });

        // Do'konlar boshqa faol banda bo'lmasa qayta APPROVED
        const shopIds = ban.scope === "SHOP" && ban.shopId
            ? [ban.shopId]
            : (await tx.bnShop.findMany({ where: { profileId: ban.profileId }, select: { id: true } })).map(s => s.id);

        for (const sid of shopIds) {
            const still = await tx.bnBan.findFirst({
                where: {
                    OR: [
                        { shopId: sid, status: "ACTIVE" },
                        { profileId: ban.profileId, scope: "PROFILE", status: "ACTIVE" },
                    ],
                },
                select: { id: true },
            });
            if (still) continue;
            // TERMINATED bo'lsa qaytarilmaydi
            const shop = await tx.bnShop.findUnique({ where: { id: sid }, select: { status: true } });
            if (shop && shop.status === "SUSPENDED") {
                await tx.bnShop.update({
                    where: { id: sid },
                    data: { status: "APPROVED", suspendedAt: null, suspendReason: null },
                });
                await tx.bnProduct.updateMany({
                    where: { shopId: sid },
                    data: { hidden: false, isActive: true },
                });
            }
        }

        return { ok: true };
    });
}

/** Do'konni abadiy chiqarib yuborish. Qayta ochib bo'lmaydi. */
export async function terminateShop(shopId: string, opts: {
    reason: string;
    decidedBy: BanDecidedBy;
    decidedById?: string;
}) {
    return prisma.$transaction(async (tx) => {
        const shop = await tx.bnShop.findUnique({ where: { id: shopId }, select: { id: true, profileId: true } });
        if (!shop) throw new Error("Do'kon topilmadi");

        await tx.bnShop.update({
            where: { id: shopId },
            data: { status: "TERMINATED", suspendedAt: new Date(), suspendReason: opts.reason.slice(0, 200) },
        });
        await tx.bnProduct.updateMany({
            where: { shopId },
            data: { hidden: true, isActive: false },
        });
        // Ban ham yaratamiz (log uchun, scope=SHOP, PERM)
        await tx.bnBan.create({
            data: {
                profileId: shop.profileId,
                shopId,
                scope: "SHOP",
                type: "PERM",
                reason: `TERMINATED: ${opts.reason.slice(0, 400)}`,
                decidedBy: opts.decidedBy,
                decidedById: opts.decidedById,
            },
        });
        return { ok: true };
    });
}

/** Ariza yuborayotganda: profilning shu bozor/online turida terminated do'koni bo'lmasin */
export async function canApplyForShop(profileId: string, opts: {
    marketId?: string | null;
    locationType: "IN_MARKET" | "STANDALONE" | "ONLINE";
}): Promise<{ ok: boolean; reason?: string }> {
    // Butun profil banda bo'lsa yangi do'kon ochishga ruxsat berilmaydi
    if (await isProfileBanned(profileId)) return { ok: false, reason: "profile_banned" };

    // Aynan bozorda TERMINATED do'kon bor bo'lsa — qayta ochib bo'lmaydi
    if (opts.locationType === "IN_MARKET" && opts.marketId) {
        const dup = await prisma.bnShop.findFirst({
            where: { profileId, marketId: opts.marketId, status: "TERMINATED" },
            select: { id: true },
        });
        if (dup) return { ok: false, reason: "market_terminated" };
    }
    if (opts.locationType === "ONLINE") {
        const dup = await prisma.bnShop.findFirst({
            where: { profileId, locationType: "ONLINE", status: "TERMINATED" },
            select: { id: true },
        });
        if (dup) return { ok: false, reason: "online_terminated" };
    }
    // STANDALONE — filial ochsa bo'ladi (parentShopId bilan)
    return { ok: true };
}
