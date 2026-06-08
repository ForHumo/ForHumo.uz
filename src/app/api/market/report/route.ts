import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const TARGETS = ["PRODUCT", "REVIEW", "REPLY", "QUESTION", "ANSWER"] as const;
type Target = typeof TARGETS[number];

// POST /api/market/report — kontentni shikoyat qilish
export async function POST(req: Request) {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const profile = await prisma.userProfile.findUnique({ where: { email: session.user.email } });
    if (!profile) return NextResponse.json({ error: "Profil topilmadi" }, { status: 404 });

    const { targetType, targetId, reason } = await req.json();
    if (!TARGETS.includes(targetType) || !targetId)
        return NextResponse.json({ error: "Noto'g'ri so'rov" }, { status: 400 });

    // Takroriy shikoyatni jim o'tkazamiz (unique profileId+target)
    await prisma.marketReport.upsert({
        where: { profileId_targetType_targetId: { profileId: profile.id, targetType: targetType as Target, targetId } },
        update: { reason: reason?.slice(0, 300) ?? undefined },
        create: { profileId: profile.id, targetType: targetType as Target, targetId, reason: reason?.slice(0, 300) ?? null },
    });
    return NextResponse.json({ ok: true });
}
