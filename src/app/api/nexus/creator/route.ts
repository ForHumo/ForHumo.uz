import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { currencyForCountry } from "@/lib/money";

// GET /api/nexus/creator — o'z ijodkor sozlamalarim (obuna narxi)
export async function GET() {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const me = await prisma.userProfile.findUnique({ where: { email: session.user.email }, select: { id: true, subPrice: true, country: true, autoRepostToOwnChannel: true } });
    if (!me) return NextResponse.json({ error: "Profil topilmadi" }, { status: 404 });

    const [subscribers, subIncome, ownChannel] = await prisma.$transaction([
        prisma.nexusSubscription.count({ where: { creatorId: me.id, expiresAt: { gt: new Date() } } }),
        prisma.nexusSubscription.aggregate({ where: { creatorId: me.id, expiresAt: { gt: new Date() } }, _sum: { price: true } }),
        prisma.nexusChannel.findFirst({ where: { ownerId: me.id, type: "CHANNEL", systemOwned: false }, select: { id: true } }),
    ]);
    return NextResponse.json({
        subPrice: me.subPrice,
        currency: currencyForCountry(me.country),
        activeSubscribers: subscribers,
        monthlyIncome: subIncome._sum.price ?? 0,
        hasChannel: !!ownChannel,
        autoRepost: me.autoRepostToOwnChannel,
    });
}

// PATCH /api/nexus/creator — { subPrice } obuna narxini o'rnatish (0 = o'chirish)
export async function PATCH(req: Request) {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const me = await prisma.userProfile.findUnique({ where: { email: session.user.email }, select: { id: true } });
    if (!me) return NextResponse.json({ error: "Profil topilmadi" }, { status: 404 });

    const body = await req.json();
    const data: { subPrice?: number; autoRepostToOwnChannel?: boolean } = {};
    if (body.subPrice !== undefined) {
        data.subPrice = Math.max(0, Math.min(1_000_000, Math.round(Number(body.subPrice) || 0)));
    }
    if (typeof body.autoRepost === "boolean") {
        data.autoRepostToOwnChannel = body.autoRepost;
    }
    await prisma.userProfile.update({ where: { id: me.id }, data });
    return NextResponse.json({ ok: true, ...data });
}
