// DELETE /api/nexus/karaoke/performances/[id] — o'z performance'ni o'chirish
// POST /api/nexus/karaoke/performances/[id]/play — plays++
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) return NextResponse.json({ error: "auth" }, { status: 401 });
    const me = await prisma.userProfile.findUnique({ where: { email: session.user.email }, select: { id: true } });
    if (!me) return NextResponse.json({ error: "no_profile" }, { status: 404 });

    const perf = await prisma.nexusKaraokePerformance.findUnique({ where: { id }, select: { profileId: true } });
    if (!perf) return NextResponse.json({ error: "not_found" }, { status: 404 });
    if (perf.profileId !== me.id) return NextResponse.json({ error: "not_owner" }, { status: 403 });

    await prisma.nexusKaraokePerformance.delete({ where: { id } });
    return NextResponse.json({ ok: true });
}
