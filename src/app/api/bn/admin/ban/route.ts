// BN admin: ban qo'yish. OWNER va MODERATOR ikkalasi ham qo'ya oladi.
//
//   POST /api/bn/admin/ban
//   { shopId?, profileId?, type: "TEMP"|"PERM", reason, publicReason?, expiresAt?: ISO }
//
// shopId berilsa scope=SHOP. Aks holda profileId majburiy, scope=PROFILE.

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireBnAuth } from "@/lib/bn-auth";
import { isBnAdmin } from "@/lib/bn-admin";
import { applyBan } from "@/lib/bn-ban";

export async function POST(req: Request) {
    const auth = await requireBnAuth();
    if (auth instanceof NextResponse) return auth;
    if (!(await isBnAdmin(auth.profileId))) {
        return NextResponse.json({ error: "forbidden" }, { status: 403 });
    }

    const b = await req.json().catch(() => ({}));
    const type = b?.type === "PERM" ? "PERM" : "TEMP";
    const reason = typeof b?.reason === "string" ? b.reason.trim() : "";
    if (reason.length < 3) return NextResponse.json({ error: "reason_required" }, { status: 400 });

    let profileId: string | null = null;
    let shopId: string | null = null;

    if (b?.shopId) {
        const shop = await prisma.bnShop.findUnique({
            where: { id: String(b.shopId) }, select: { id: true, profileId: true },
        });
        if (!shop) return NextResponse.json({ error: "shop_not_found" }, { status: 404 });
        shopId = shop.id;
        profileId = shop.profileId;
    } else if (b?.profileId) {
        profileId = String(b.profileId);
    } else {
        return NextResponse.json({ error: "target_required" }, { status: 400 });
    }

    let expiresAt: Date | undefined;
    if (type === "TEMP") {
        const raw = b?.expiresAt ? new Date(b.expiresAt) : null;
        if (!raw || isNaN(raw.getTime()) || raw <= new Date()) {
            return NextResponse.json({ error: "expires_at_required" }, { status: 400 });
        }
        expiresAt = raw;
    }

    try {
        const ban = await applyBan({
            profileId: profileId!,
            shopId: shopId ?? undefined,
            type,
            reason,
            publicReason: typeof b?.publicReason === "string" ? b.publicReason.trim() : undefined,
            expiresAt,
            decidedBy: "OWNER",  // yoki MODERATOR — role ga qarab
            decidedById: auth.profileId,
        });
        return NextResponse.json({ ok: true, ban });
    } catch (e) {
        return NextResponse.json({ error: (e as Error).message || "server" }, { status: 500 });
    }
}
