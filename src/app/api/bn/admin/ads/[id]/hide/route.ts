// Admin — reklamani yashirish (K7). moderationNote saqlanadi.
// POST /api/bn/admin/ads/[id]/hide  { note?: string }

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireBnAuth } from "@/lib/bn-auth";
import { bnNotify } from "@/lib/bn-notify";
import { after } from "next/server";

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

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
    const auth = await requireBnAuth();
    if (auth instanceof NextResponse) return auth;
    const guard = await requireAdmin(auth.profileId);
    if (guard) return guard;

    const { id } = await params;
    const body = await req.json().catch(() => ({}));
    const note = String(body?.note ?? "").trim().slice(0, 300) || null;

    const banner = await prisma.bnAdBanner.findUnique({
        where: { id },
        select: { id: true, ownerId: true, title: true, hidden: true },
    });
    if (!banner) return NextResponse.json({ error: "not_found" }, { status: 404 });

    await prisma.bnAdBanner.update({
        where: { id },
        data: { hidden: true, moderationNote: note },
    });

    // Sohibga bildirishnoma
    after(async () => {
        await bnNotify({
            profileId: banner.ownerId,
            type: "BAN_APPLIED",
            title: "Reklamangiz yashirildi",
            body: note ? `Sabab: ${note}` : `"${banner.title}" — moderatsiya bo'yicha yashirildi`,
            link: "/kabinet",
        });
    });

    return NextResponse.json({ ok: true });
}
