import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { after } from "next/server";
import { nexusNotify } from "@/lib/nexus-notify";
import { isBlockedBetween } from "@/lib/nexus-block";
import { grantAchievement } from "@/lib/achievements";
import { sendPushToProfile } from "@/lib/push";

// POST /api/nexus/follow — follow toggle ({ username } yoki { profileId })
export async function POST(req: Request) {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const me = await prisma.userProfile.findUnique({ where: { email: session.user.email }, select: { id: true } });
    if (!me) return NextResponse.json({ error: "Profil topilmadi" }, { status: 404 });

    const { username, profileId } = await req.json();
    let targetId: string | null = profileId ?? null;
    if (!targetId && username) {
        const t = await prisma.userProfile.findUnique({ where: { username }, select: { id: true } });
        targetId = t?.id ?? null;
    }
    if (!targetId) return NextResponse.json({ error: "Foydalanuvchi topilmadi" }, { status: 404 });
    if (targetId === me.id) return NextResponse.json({ error: "O'zingizni follow qila olmaysiz" }, { status: 400 });
    if (await isBlockedBetween(me.id, targetId)) return NextResponse.json({ error: "Bu foydalanuvchini kuzata olmaysiz" }, { status: 403 });

    const existing = await prisma.nexusFollow.findUnique({
        where: { followerId_followingId: { followerId: me.id, followingId: targetId } },
    });
    if (existing) await prisma.nexusFollow.delete({ where: { id: existing.id } });
    else {
        // Idempotent — bir vaqtda ikki marta bosilsa unique buzilmasin (faqat birinchi marta bildirishnoma)
        let created = false;
        try { await prisma.nexusFollow.create({ data: { followerId: me.id, followingId: targetId } }); created = true; } catch { /* allaqachon kuzatadi */ }
        if (created) {
            after(() => nexusNotify({ recipientId: targetId, actorId: me.id, type: "FOLLOW" }));
            // Batch DD — Web Push (yangi kuzatuvchi)
            after(async () => {
                const actor = await prisma.userProfile.findUnique({ where: { id: me.id }, select: { name: true, username: true } });
                await sendPushToProfile(targetId, {
                    title: "Yangi kuzatuvchi",
                    body: `${actor?.name || actor?.username || "Foydalanuvchi"} sizni kuzata boshladi`,
                    url: actor?.username ? `/nexus/u/${actor.username}` : "/nexus",
                    tag: `nx-follow-${me.id}`,
                }).catch(() => null);
            });
        }
    }

    const followerCount = await prisma.nexusFollow.count({ where: { followingId: targetId } });

    // Tier-based yutuqlar (obunachi kuzatuvchi soniga qarab)
    if (!existing) {
        after(async () => {
            if (followerCount >= 10) await grantAchievement(targetId, "nexus.10_followers");
            if (followerCount >= 100) await grantAchievement(targetId, "nexus.100_followers");
            if (followerCount >= 1000) await grantAchievement(targetId, "nexus.1k_followers");
        });
    }

    return NextResponse.json({ following: !existing, followerCount });
}
