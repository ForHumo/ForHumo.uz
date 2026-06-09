import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// POST /api/nexus/stories/[id]/view — ko'rildi deb belgilash
export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const me = await prisma.userProfile.findUnique({ where: { email: session.user.email }, select: { id: true } });
    if (!me) return NextResponse.json({ error: "Profil topilmadi" }, { status: 404 });

    const { id } = await params;
    try {
        await prisma.nexusStoryView.upsert({
            where: { storyId_profileId: { storyId: id, profileId: me.id } },
            create: { storyId: id, profileId: me.id },
            update: {},
        });
    } catch { /* story o'chgan bo'lishi mumkin */ }

    return NextResponse.json({ ok: true });
}
