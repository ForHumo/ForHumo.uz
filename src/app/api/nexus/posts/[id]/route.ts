import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// DELETE /api/nexus/posts/[id] — o'z postini o'chirish
export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const profile = await prisma.userProfile.findUnique({ where: { email: session.user.email }, select: { id: true } });
    if (!profile) return NextResponse.json({ error: "Profil topilmadi" }, { status: 404 });

    const { id } = await params;
    const post = await prisma.nexusPost.findUnique({ where: { id }, select: { profileId: true } });
    if (!post) return NextResponse.json({ error: "Post topilmadi" }, { status: 404 });
    if (post.profileId !== profile.id) return NextResponse.json({ error: "Bu sizning postingiz emas" }, { status: 403 });

    // likes/comments/saves onDelete:Cascade orqali o'chadi
    await prisma.nexusPost.delete({ where: { id } });
    return NextResponse.json({ ok: true });
}
