import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// POST /api/nexus/videos/[id]/view — ko'rishni hisoblash (foydalanuvchi bo'yicha bir marta)
export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) return NextResponse.json({ ok: true });
    const me = await prisma.userProfile.findUnique({ where: { email: session.user.email }, select: { id: true } });
    if (!me) return NextResponse.json({ ok: true });

    const { id } = await params;
    try {
        const created = await prisma.nexusVideoView.createMany({
            data: [{ videoId: id, profileId: me.id }], skipDuplicates: true,
        });
        if (created.count > 0) {
            await prisma.nexusVideo.update({ where: { id }, data: { views: { increment: 1 } } });
        }
    } catch { /* video o'chgan bo'lishi mumkin */ }

    return NextResponse.json({ ok: true });
}
