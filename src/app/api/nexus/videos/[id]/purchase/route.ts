import { NextResponse, after } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { nexusNotify } from "@/lib/nexus-notify";
import { roundMoney, convert, currencyForCountry, type Currency } from "@/lib/money";

const cur = (c: string): Currency => c === "USD" ? "USD" : "UZS";

// POST /api/nexus/videos/[id]/purchase — pullik videoni sotib olish (real pul).
// Narx avtor valyutasida; xaridor o'z valyutasida (FX konvert) to'laydi; avtor narxni to'liq oladi.
export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const me = await prisma.userProfile.findUnique({ where: { email: session.user.email }, select: { id: true } });
    if (!me) return NextResponse.json({ error: "Profil topilmadi" }, { status: 404 });

    const { id } = await params;
    const video = await prisma.nexusVideo.findUnique({
        where: { id }, select: { id: true, title: true, profileId: true, price: true, hidden: true },
    });
    if (!video || video.hidden) return NextResponse.json({ error: "Topilmadi" }, { status: 404 });
    if (video.price <= 0) return NextResponse.json({ error: "Bu video bepul" }, { status: 400 });
    if (video.profileId === me.id) return NextResponse.json({ error: "O'z videongiz" }, { status: 400 });

    const existing = await prisma.nexusVideoPurchase.findUnique({
        where: { videoId_buyerId: { videoId: id, buyerId: me.id } },
    });
    if (existing) return NextResponse.json({ ok: true, already: true });

    const author = await prisma.userProfile.findUnique({ where: { id: video.profileId }, select: { country: true } });
    const price = video.price;                 // avtor valyutasidagi narx
    const short = video.title.slice(0, 40);

    try {
        const result = await prisma.$transaction(async tx => {
            const wallet = await tx.wallet.findUnique({ where: { profileId: me.id } });
            const bCur = cur(wallet?.currency ?? "UZS");

            // Avtor hamyoni/valyutasi (narx shu valyutada)
            let aw = await tx.wallet.findUnique({ where: { profileId: video.profileId } });
            if (!aw) aw = await tx.wallet.create({ data: { profileId: video.profileId, currency: currencyForCountry(author?.country) } });
            const aCur = cur(aw.currency);

            const buyerPays = convert(price, aCur, bCur);   // xaridor o'z valyutasida to'laydi
            if (!wallet) return "no_funds" as const;

            const dup = await tx.nexusVideoPurchase.findUnique({
                where: { videoId_buyerId: { videoId: id, buyerId: me.id } },
            });
            if (dup) return "ok" as const;

            // Atomik shartli debit (race-safe)
            const debit = await tx.wallet.updateMany({ where: { id: wallet.id, balance: { gte: buyerPays } }, data: { balance: { decrement: buyerPays } } });
            if (debit.count === 0) return "no_funds" as const;
            const afterBuyer = await tx.wallet.findUnique({ where: { id: wallet.id }, select: { balance: true } });
            const newBuyerBal = roundMoney(Number(afterBuyer?.balance ?? 0), bCur);
            // Har buyer-video kombinatsiyasi noyob (author'da har xaridor uchun alohida SALE)
            const txRef = `vidbuy:${id}:${me.id}`;
            await tx.walletTransaction.create({
                data: { walletId: wallet.id, type: "PURCHASE", amount: buyerPays, currency: bCur, balanceAfter: newBuyerBal, description: `Nexus video xaridi: ${short}`, ref: txRef },
            });

            await tx.wallet.update({ where: { id: aw.id }, data: { balance: { increment: price } } });
            const afterAuthor = await tx.wallet.findUnique({ where: { id: aw.id }, select: { balance: true } });
            const newAuthorBal = roundMoney(Number(afterAuthor?.balance ?? 0), aCur);
            await tx.walletTransaction.create({
                data: { walletId: aw.id, type: "SALE", amount: price, currency: aCur, balanceAfter: newAuthorBal, description: `Nexus video sotuvi: ${short}`, ref: txRef },
            });

            await tx.nexusVideoPurchase.create({ data: { videoId: id, buyerId: me.id, price: price } });
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
