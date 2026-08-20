// BN admin — waitlist bulk status yangilash.
// POST /api/bn/admin/waitlist/bulk
//   body: { ids: string[], status: BnSellerWaitlistStatus }
// Max 100 ID bir chaqiruvda. Har status o'zgarishda contactedAt/By avto yoziladi.

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireBnAuth } from "@/lib/bn-auth";
import type { BnSellerWaitlistStatus } from "@prisma/client";

const ALLOWED_STATUS: BnSellerWaitlistStatus[] = ["PENDING", "CONTACTED", "CONVERTED", "REJECTED"];
const MAX_BULK = 100;

async function requireBnAdmin(profileId: string): Promise<boolean> {
    const a = await prisma.bnAdmin.findUnique({
        where: { profileId }, select: { role: true },
    });
    return a?.role === "OWNER" || a?.role === "MODERATOR";
}

export async function POST(req: Request) {
    const auth = await requireBnAuth();
    if (auth instanceof NextResponse) return auth;
    if (!(await requireBnAdmin(auth.profileId))) {
        return NextResponse.json({ error: "forbidden" }, { status: 403 });
    }

    const body = await req.json().catch(() => ({}));
    const ids = Array.isArray(body?.ids) ? body.ids.filter((x: unknown) => typeof x === "string") : [];
    const nextStatus = body?.status as BnSellerWaitlistStatus | undefined;

    if (!nextStatus || !ALLOWED_STATUS.includes(nextStatus)) {
        return NextResponse.json({ error: "invalid_status" }, { status: 400 });
    }
    if (ids.length === 0) {
        return NextResponse.json({ error: "no_ids" }, { status: 400 });
    }
    if (ids.length > MAX_BULK) {
        return NextResponse.json({ error: "too_many", max: MAX_BULK }, { status: 400 });
    }

    // 1-oyoq: PENDING'dan chiqadigan yozuvlar ID'sini olamiz (contactedAt/By uchun)
    const wasPending = nextStatus !== "PENDING"
        ? await prisma.bnSellerWaitlist.findMany({
            where: { id: { in: ids }, status: "PENDING" },
            select: { id: true },
        }).catch(() => [])
        : [];
    const wasPendingIds = wasPending.map(r => r.id);

    // 2-oyoq: Barcha ID'lar uchun status yangilanadi
    const updated = await prisma.bnSellerWaitlist.updateMany({
        where: { id: { in: ids } },
        data: { status: nextStatus },
    }).catch(() => ({ count: 0 }));

    // 3-oyoq: PENDING'dan chiqqanlar uchun contactedAt/By
    if (wasPendingIds.length > 0) {
        await prisma.bnSellerWaitlist.updateMany({
            where: { id: { in: wasPendingIds } },
            data: { contactedAt: new Date(), contactedById: auth.profileId },
        }).catch(() => { /* jim */ });
    }

    return NextResponse.json({
        ok: true,
        updated: updated.count,
        contactedMarked: wasPendingIds.length,
    });
}
