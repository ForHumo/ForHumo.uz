import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// GET /api/nexus/creator — o'z ijodkor sozlamalarim (obuna narxi)
export async function GET() {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const me = await prisma.userProfile.findUnique({ where: { email: session.user.email }, select: { id: true, subPriceZij: true } });
    if (!me) return NextResponse.json({ error: "Profil topilmadi" }, { status: 404 });

    const [subscribers, subIncome] = await prisma.$transaction([
        prisma.nexusSubscription.count({ where: { creatorId: me.id, expiresAt: { gt: new Date() } } }),
        prisma.nexusSubscription.aggregate({ where: { creatorId: me.id, expiresAt: { gt: new Date() } }, _sum: { priceZij: true } }),
    ]);
    return NextResponse.json({ subPriceZij: me.subPriceZij, activeSubscribers: subscribers, monthlyIncome: subIncome._sum.priceZij ?? 0 });
}

// PATCH /api/nexus/creator — { subPriceZij } obuna narxini o'rnatish (0 = o'chirish)
export async function PATCH(req: Request) {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const me = await prisma.userProfile.findUnique({ where: { email: session.user.email }, select: { id: true } });
    if (!me) return NextResponse.json({ error: "Profil topilmadi" }, { status: 404 });

    const { subPriceZij } = await req.json();
    const price = Math.max(0, Math.min(1_000_000, Math.round(Number(subPriceZij) || 0)));
    await prisma.userProfile.update({ where: { id: me.id }, data: { subPriceZij: price } });
    return NextResponse.json({ ok: true, subPriceZij: price });
}
