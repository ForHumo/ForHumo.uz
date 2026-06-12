import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// POST /api/nexus/tracks/[id]/like — sevimli toggle
export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const me = await prisma.userProfile.findUnique({ where: { email: session.user.email }, select: { id: true } });
    if (!me) return NextResponse.json({ error: "Profil topilmadi" }, { status: 404 });

    const { id } = await params;
    const existing = await prisma.nexusTrackLike.findUnique({
        where: { trackId_profileId: { trackId: id, profileId: me.id } },
    });
    if (existing) {
        await prisma.nexusTrackLike.delete({ where: { id: existing.id } });
    } else {
        try { await prisma.nexusTrackLike.create({ data: { trackId: id, profileId: me.id } }); }
        catch { return NextResponse.json({ error: "Topilmadi" }, { status: 404 }); }
    }
    const count = await prisma.nexusTrackLike.count({ where: { trackId: id } });
    return NextResponse.json({ liked: !existing, count });
}

// DELETE /api/nexus/tracks/[id]/like emas — trekni o'chirish uchun pastdagi route
