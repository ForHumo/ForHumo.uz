// Nexus admin — reklamani qayta ochish.
// POST /api/nexus/admin/ads/[id]/unhide

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { FOUNDER_HUMO_IDS } from "@/lib/founders";

async function requireAdmin() {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) return null;
    const me = await prisma.userProfile.findUnique({
        where: { email: session.user.email },
        select: { id: true, humoId: true },
    });
    if (!me) return null;
    if (me.humoId && FOUNDER_HUMO_IDS.includes(me.humoId)) return me;
    const bnAdmin = await prisma.bnAdmin.findUnique({
        where: { profileId: me.id },
        select: { role: true },
    });
    if (bnAdmin && (bnAdmin.role === "OWNER" || bnAdmin.role === "MODERATOR")) return me;
    return null;
}

export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
    const me = await requireAdmin();
    if (!me) return NextResponse.json({ error: "forbidden" }, { status: 403 });

    const { id } = await params;
    const ad = await prisma.nexusAdSlot.findUnique({ where: { id }, select: { id: true } });
    if (!ad) return NextResponse.json({ error: "not_found" }, { status: 404 });

    await prisma.nexusAdSlot.update({
        where: { id },
        data: { hidden: false, moderationNote: null },
    });
    return NextResponse.json({ ok: true });
}
