import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { sendTip } from "@/lib/nexus-tip";
import { after } from "next/server";
import { sendPushToProfile } from "@/lib/push";

// Batch AJ — Streamer subscription (30 kunlik)
// GET  ?username=X — my sub to that streamer (yoki umumiy count)
// POST { username, tier } — obuna bo'lish (wallet'dan yechiladi)
// DELETE ?username=X — bekor qilish (active=false, refund yo'q)

const TIER_PRICES: Record<string, number> = {
    // UZS asosli — streamer valyutasida
    SUPPORTER: 25_000,   // ~2 USD
    GOLD: 100_000,       // ~8 USD
    PLATINUM: 500_000,   // ~40 USD
};

export async function GET(req: Request) {
    const session = await getServerSession(authOptions);
    const { searchParams } = new URL(req.url);
    const username = searchParams.get("username");

    // Umumiy streamer sub count (public)
    if (username && !session?.user?.email) {
        const p = await prisma.userProfile.findUnique({ where: { username }, select: { id: true } });
        if (!p) return NextResponse.json({ count: 0, mySub: null });
        const count = await prisma.nexusLiveSub.count({
            where: { streamerId: p.id, active: true, expiresAt: { gt: new Date() } },
        });
        return NextResponse.json({ count, mySub: null });
    }

    if (!session?.user?.email) return NextResponse.json({ count: 0, mySub: null });
    const me = await prisma.userProfile.findUnique({ where: { email: session.user.email }, select: { id: true } });
    if (!me) return NextResponse.json({ count: 0, mySub: null });

    if (username) {
        const target = await prisma.userProfile.findUnique({ where: { username }, select: { id: true } });
        if (!target) return NextResponse.json({ count: 0, mySub: null });
        const [count, mySub] = await Promise.all([
            prisma.nexusLiveSub.count({ where: { streamerId: target.id, active: true, expiresAt: { gt: new Date() } } }),
            prisma.nexusLiveSub.findUnique({
                where: { subscriberId_streamerId: { subscriberId: me.id, streamerId: target.id } },
            }),
        ]);
        return NextResponse.json({ count, mySub });
    }

    // Mening barcha obunalarim
    const subs = await prisma.nexusLiveSub.findMany({
        where: { subscriberId: me.id, active: true, expiresAt: { gt: new Date() } },
        orderBy: { expiresAt: "asc" },
    });
    return NextResponse.json({ subs });
}

export async function POST(req: Request) {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const me = await prisma.userProfile.findUnique({ where: { email: session.user.email }, select: { id: true } });
    if (!me) return NextResponse.json({ error: "Profil topilmadi" }, { status: 404 });

    const { username, tier } = await req.json();
    if (!username || !TIER_PRICES[tier]) return NextResponse.json({ error: "Noto'g'ri tier" }, { status: 400 });
    const target = await prisma.userProfile.findUnique({ where: { username }, select: { id: true, country: true, name: true, username: true } });
    if (!target) return NextResponse.json({ error: "Topilmadi" }, { status: 404 });
    if (target.id === me.id) return NextResponse.json({ error: "O'zingizni obuna bo'la olmaysiz" }, { status: 400 });

    const price = TIER_PRICES[tier];
    // Wallet tranzaksiyasi (streamer valyutasida — hozircha UZS)
    const tipRes = await sendTip({
        donorId: me.id, recipientId: target.id, amount: price,
        targetType: "PROFILE", targetId: target.id,
        message: `Obuna: ${tier}`,
        recipientCountry: target.country,
    });
    if (tipRes.result === "no_funds") return NextResponse.json({ error: "Mablag' yetarli emas" }, { status: 402 });
    if (tipRes.result !== "ok") return NextResponse.json({ error: "To'lov muvaffaqiyatsiz" }, { status: 400 });

    const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
    const sub = await prisma.nexusLiveSub.upsert({
        where: { subscriberId_streamerId: { subscriberId: me.id, streamerId: target.id } },
        create: {
            subscriberId: me.id, streamerId: target.id, tier, monthlyPrice: price, currency: "UZS",
            expiresAt, active: true, wasCancelled: false,
        },
        update: {
            tier, monthlyPrice: price,
            expiresAt, active: true, wasCancelled: false,
            startedAt: new Date(),
        },
    });

    // Push streamer'ga
    after(() => sendPushToProfile(target.id, {
        title: "Yangi obunachi 🎉",
        body: `${tier} tier obuna — ${username}`,
        url: `/nexus/u/${target.username}`,
        tag: `nx-sub-${me.id}`,
    }).catch(() => null));

    return NextResponse.json({ ok: true, sub });
}

export async function DELETE(req: Request) {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const me = await prisma.userProfile.findUnique({ where: { email: session.user.email }, select: { id: true } });
    if (!me) return NextResponse.json({ error: "Profil topilmadi" }, { status: 404 });
    const { searchParams } = new URL(req.url);
    const username = searchParams.get("username");
    if (!username) return NextResponse.json({ error: "username kerak" }, { status: 400 });
    const target = await prisma.userProfile.findUnique({ where: { username }, select: { id: true } });
    if (!target) return NextResponse.json({ error: "Topilmadi" }, { status: 404 });
    // Refund yo'q — active=false, expiresAt qoladi (30 kun tugaguncha ishlaydi)
    await prisma.nexusLiveSub.updateMany({
        where: { subscriberId: me.id, streamerId: target.id },
        data: { wasCancelled: true, active: false },
    });
    return NextResponse.json({ ok: true });
}
