import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ACHIEVEMENTS, getUserAchievements } from "@/lib/achievements";

// GET /api/user/achievements?username=...
// - username yo'q → o'z yutuqlari
// - username bilan → ommaviy ko'rish
export async function GET(req: Request) {
    const url = new URL(req.url);
    const username = url.searchParams.get("username");

    let profileId: string | null = null;
    if (username) {
        const p = await prisma.userProfile.findUnique({ where: { username }, select: { id: true } });
        if (!p) return NextResponse.json({ error: "Foydalanuvchi topilmadi" }, { status: 404 });
        profileId = p.id;
    } else {
        const session = await getServerSession(authOptions);
        if (!session?.user?.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        const me = await prisma.userProfile.findUnique({ where: { email: session.user.email }, select: { id: true } });
        if (!me) return NextResponse.json({ error: "Profil topilmadi" }, { status: 404 });
        profileId = me.id;
    }

    const earned = await getUserAchievements(profileId);
    const earnedCodes = new Set(earned.map(a => a.code));

    return NextResponse.json({
        earned: earned.map(a => ({
            code: a.code, title: a.title, icon: a.icon,
            category: a.category, tier: a.tier, earnedAt: a.earnedAt,
        })),
        catalog: ACHIEVEMENTS.map(a => ({ ...a, unlocked: earnedCodes.has(a.code) })),
    });
}
