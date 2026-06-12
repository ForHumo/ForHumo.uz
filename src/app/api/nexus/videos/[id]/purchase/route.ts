import { NextResponse, after } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { nexusNotify } from "@/lib/nexus-notify";

// POST /api/nexus/videos/[id]/purchase — pullik videoni Zij'ga sotib olish.
// Atomik: xaridor PURCHASE (balans kamayadi) + avtor SALE (to'liq summa) + NexusVideoPurchase.
export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const me = await prisma.userProfile.findUnique({ where: { email: session.user.email }, select: { id: true } });
    if (!me) return NextResponse.json({ error: "Profil topilmadi" }, { status: 404 });

    const { id } = await params;
    const video = await prisma.nexusVideo.findUnique({
        where: { id }, select: { id: true, title: true, profileId: true, priceZij: true, hidden: true },
    });
    if (!video || video.hidden) return NextResponse.json({ error: "Topilmadi" }, { status: 404 });
    if (video.priceZij <= 0) return NextResponse.json({ error: "Bu video bepul" }, { status: 400 });
    if (video.profileId === me.id) return NextResponse.json({ error: "O'z videongiz" }, { status: 400 });

    const existing = await prisma.nexusVideoPurchase.findUnique({
        where: { videoId_buyerId: { videoId: id, buyerId: me.id } },
    });
    if (existing) return NextResponse.json({ ok: true, already: true });

    const price = video.priceZij;
    const short = video.title.slice(0, 40);

    try {
        const result = await prisma.$transaction(async tx => {
            const wallet = await tx.zijWallet.findUnique({ where: { profileId: me.id } });
            const bal = Number(wallet?.balance ?? 0);
            if (!wallet || bal < price) return "no_funds" as const;

            // Race himoyasi — tranzaksiya ichida qayta tekshirish
            const dup = await tx.nexusVideoPurchase.findUnique({
                where: { videoId_buyerId: { videoId: id, buyerId: me.id } },
            });
            if (dup) return "ok" as const;

            const newBuyerBal = Math.round((bal - price) * 100) / 100;
            await tx.zijWallet.update({ where: { id: wallet.id }, data: { balance: newBuyerBal } });
            await tx.zijTransaction.create({
                data: { walletId: wallet.id, type: "PURCHASE", amount: price, balanceAfter: newBuyerBal, description: `Nexus video xaridi: ${short}`, ref: id },
            });

            let aw = await tx.zijWallet.findUnique({ where: { profileId: video.profileId } });
            if (!aw) aw = await tx.zijWallet.create({ data: { profileId: video.profileId } });
            const newAuthorBal = Math.round((Number(aw.balance) + price) * 100) / 100;
            await tx.zijWallet.update({ where: { id: aw.id }, data: { balance: newAuthorBal } });
            await tx.zijTransaction.create({
                data: { walletId: aw.id, type: "SALE", amount: price, balanceAfter: newAuthorBal, description: `Nexus video sotuvi: ${short}`, ref: id },
            });

            await tx.nexusVideoPurchase.create({ data: { videoId: id, buyerId: me.id, priceZij: price } });
            return "ok" as const;
        });

        if (result === "no_funds") {
            return NextResponse.json({ error: "Mablag' yetarli emas — ALKH Pay hamyoningizni to'ldiring" }, { status: 402 });
        }
        // Avtorga "videongiz sotib olindi" bildirishnomasi
        after(() => nexusNotify({ recipientId: video.profileId, actorId: me.id, type: "PURCHASE", videoId: id }));
        return NextResponse.json({ ok: true });
    } catch {
        return NextResponse.json({ error: "Xarid amalga oshmadi, qayta urinib ko'ring" }, { status: 500 });
    }
}
