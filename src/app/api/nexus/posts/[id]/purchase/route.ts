// POST /api/nexus/posts/[id]/purchase — pullik postni sotib olish
// Narx avtor valyutasida; xaridor o'z valyutasida to'laydi (FX konvert); avtor to'liq oladi.

import { NextResponse, after } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { nexusNotify } from "@/lib/nexus-notify";
import { roundMoney, convert, currencyForCountry, type Currency } from "@/lib/money";

const cur = (c: string): Currency => c === "USD" ? "USD" : "UZS";

export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const me = await prisma.userProfile.findUnique({ where: { email: session.user.email }, select: { id: true } });
    if (!me) return NextResponse.json({ error: "Profil topilmadi" }, { status: 404 });

    const { id } = await params;
    const post = await prisma.nexusPost.findUnique({
        where: { id }, select: { id: true, text: true, profileId: true, price: true, priceCurrency: true, hidden: true },
    });
    if (!post || post.hidden) return NextResponse.json({ error: "Topilmadi" }, { status: 404 });
    if (post.price <= 0) return NextResponse.json({ error: "Bu post bepul" }, { status: 400 });
    if (post.profileId === me.id) return NextResponse.json({ error: "O'z postingiz" }, { status: 400 });

    const existing = await prisma.nexusPostPurchase.findUnique({
        where: { postId_buyerId: { postId: id, buyerId: me.id } },
    });
    if (existing) return NextResponse.json({ ok: true, already: true });

    const author = await prisma.userProfile.findUnique({ where: { id: post.profileId }, select: { country: true } });
    const price = post.price;
    const aCur: Currency = post.priceCurrency === "USD" ? "USD" : "UZS";
    const short = (post.text || "").slice(0, 40) || "post";

    try {
        const result = await prisma.$transaction(async tx => {
            const wallet = await tx.wallet.findUnique({ where: { profileId: me.id } });
            const bCur = cur(wallet?.currency ?? "UZS");

            let aw = await tx.wallet.findUnique({ where: { profileId: post.profileId } });
            if (!aw) aw = await tx.wallet.create({ data: { profileId: post.profileId, currency: currencyForCountry(author?.country) } });

            const buyerPays = convert(price, aCur, bCur);
            if (!wallet) return "no_funds" as const;

            const dup = await tx.nexusPostPurchase.findUnique({
                where: { postId_buyerId: { postId: id, buyerId: me.id } },
            });
            if (dup) return "ok" as const;

            const debit = await tx.wallet.updateMany({
                where: { id: wallet.id, balance: { gte: buyerPays } },
                data: { balance: { decrement: buyerPays } },
            });
            if (debit.count === 0) return "no_funds" as const;
            const afterBuyer = await tx.wallet.findUnique({ where: { id: wallet.id }, select: { balance: true } });
            const newBuyerBal = roundMoney(Number(afterBuyer?.balance ?? 0), bCur);
            const txRef = `postbuy:${id}:${me.id}`;
            await tx.walletTransaction.create({
                data: { walletId: wallet.id, type: "PURCHASE", amount: buyerPays, currency: bCur, balanceAfter: newBuyerBal, description: `Nexus post xaridi: ${short}`, ref: txRef },
            });

            await tx.wallet.update({ where: { id: aw.id }, data: { balance: { increment: price } } });
            const afterAuthor = await tx.wallet.findUnique({ where: { id: aw.id }, select: { balance: true } });
            const newAuthorBal = roundMoney(Number(afterAuthor?.balance ?? 0), aCur);
            await tx.walletTransaction.create({
                data: { walletId: aw.id, type: "SALE", amount: price, currency: aCur, balanceAfter: newAuthorBal, description: `Nexus post sotuvi: ${short}`, ref: txRef },
            });

            await tx.nexusPostPurchase.create({ data: { postId: id, buyerId: me.id, price, currency: aCur } });
            return "ok" as const;
        });

        if (result === "no_funds") {
            return NextResponse.json({ error: "Mablag' yetarli emas — For Pay hamyoningizni to'ldiring" }, { status: 402 });
        }
        after(() => nexusNotify({ recipientId: post.profileId, actorId: me.id, type: "PURCHASE", postId: id }));
        return NextResponse.json({ ok: true });
    } catch {
        return NextResponse.json({ error: "Xarid amalga oshmadi, qayta urinib ko'ring" }, { status: 500 });
    }
}
