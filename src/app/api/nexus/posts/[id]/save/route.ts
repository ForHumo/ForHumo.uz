import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// POST /api/nexus/posts/[id]/save — saqlash (bookmark) toggle
export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const profile = await prisma.userProfile.findUnique({ where: { email: session.user.email }, select: { id: true } });
    if (!profile) return NextResponse.json({ error: "Profil topilmadi" }, { status: 404 });

    const { id } = await params;
    const existing = await prisma.nexusSave.findUnique({ where: { postId_profileId: { postId: id, profileId: profile.id } } });
    if (existing) await prisma.nexusSave.delete({ where: { id: existing.id } });
    else {
        // Idempotent — bir vaqtda ikki bosishda unique buzilmasin
        try { await prisma.nexusSave.create({ data: { postId: id, profileId: profile.id } }); } catch { /* allaqachon saqlangan */ }
    }

    return NextResponse.json({ saved: !existing });
}
