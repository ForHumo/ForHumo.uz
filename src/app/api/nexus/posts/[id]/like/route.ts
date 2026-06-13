import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { after } from "next/server";
import { nexusNotify } from "@/lib/nexus-notify";
import { isBlockedBetween } from "@/lib/nexus-block";

// POST /api/nexus/posts/[id]/like — like toggle
export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const profile = await prisma.userProfile.findUnique({ where: { email: session.user.email }, select: { id: true } });
    if (!profile) return NextResponse.json({ error: "Profil topilmadi" }, { status: 404 });

    const { id } = await params;
    const existing = await prisma.nexusLike.findUnique({ where: { postId_profileId: { postId: id, profileId: profile.id } } });
    if (existing) await prisma.nexusLike.delete({ where: { id: existing.id } });
    else {
        const post = await prisma.nexusPost.findUnique({ where: { id }, select: { profileId: true } });
        if (!post) return NextResponse.json({ error: "Post topilmadi" }, { status: 404 });
        // Blok — bloklangan foydalanuvchi like bosib bildirishnoma yubora olmaydi
        if (post.profileId !== profile.id && await isBlockedBetween(profile.id, post.profileId)) {
            return NextResponse.json({ error: "Ruxsat yo'q" }, { status: 403 });
        }
        // Bir vaqtda ikki marta bosilsa unique buzilmasin (idempotent — faqat birinchi marta bildirishnoma)
        let created = false;
        try { await prisma.nexusLike.create({ data: { postId: id, profileId: profile.id } }); created = true; } catch { /* allaqachon like */ }
        if (created) after(() => nexusNotify({ recipientId: post.profileId, actorId: profile.id, type: "LIKE", postId: id }));
    }

    const count = await prisma.nexusLike.count({ where: { postId: id } });
    return NextResponse.json({ liked: !existing, count });
}
