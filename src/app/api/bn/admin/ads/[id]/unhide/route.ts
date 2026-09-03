// Admin — yashirilgan reklamani qayta ochish (K7).
// POST /api/bn/admin/ads/[id]/unhide

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireBnAuth } from "@/lib/bn-auth";

async function requireAdmin(profileId: string) {
    const admin = await prisma.bnAdmin.findUnique({
        where: { profileId },
        select: { role: true },
    });
    if (!admin || (admin.role !== "OWNER" && admin.role !== "MODERATOR")) {
        return NextResponse.json({ error: "forbidden" }, { status: 403 });
    }
    return null;
}

export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
    const auth = await requireBnAuth();
    if (auth instanceof NextResponse) return auth;
    const guard = await requireAdmin(auth.profileId);
    if (guard) return guard;

    const { id } = await params;
    const banner = await prisma.bnAdBanner.findUnique({ where: { id }, select: { id: true } });
    if (!banner) return NextResponse.json({ error: "not_found" }, { status: 404 });

    await prisma.bnAdBanner.update({
        where: { id },
        data: { hidden: false, moderationNote: null },
    });
    return NextResponse.json({ ok: true });
}
