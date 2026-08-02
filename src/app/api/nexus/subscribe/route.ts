import { NextResponse, after } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { nexusNotify } from "@/lib/nexus-notify";
import { isBlockedBetween } from "@/lib/nexus-block";
import { SUB_DAYS } from "@/lib/nexus-sub";
import { roundMoney, convert, currencyForCountry, type Currency } from "@/lib/money";

const cur = (c: string): Currency => c === "USD" ? "USD" : "UZS";

// GET /api/nexus/subscribe?creator=<username> — obuna holati
export async function GET(req: Request) {
    const { searchParams } = new URL(req.url);
    const creatorUsername = searchParams.get("creator");
    if (!creatorUsername) return NextResponse.json({ error: "creator kerak" }, { status: 400 });

    const creator = await prisma.userProfile.findUnique({
        where: { username: creatorUsername }, select: { id: true, subPrice: true },
    });
    if (!creator) return NextResponse.json({ error: "Ijodkor topilmadi" }, { status: 404 });

    const session = await getServerSession(authOptions);
    let active = false, expiresAt: Date | null = null;
    if (session?.user?.email) {
        const me = await prisma.userProfile.findUnique({ where: { email: session.user.email }, select: { id: true } });
        if (me) {
            const sub = await prisma.nexusSubscription.findUnique({
                where: { subscriberId_creatorId: { subscriberId: me.id, creatorId: creator.id } },
                select: { expiresAt: true },
            });
            if (sub && sub.expiresAt.getTime() > Date.now()) { active = true; expiresAt = sub.expiresAt; }
        }
    }
    return NextResponse.json({ subPrice: creator.subPrice, active, expiresAt });
}

// POST /api/nexus/subscribe — { creatorUsername } obuna bo'lish / 30 kun uzaytirish (Zij to'lov)
export async function POST(req: Request) {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const me = await prisma.userProfile.findUnique({ where: { email: session.user.email }, select: { id: true } });
    if (!me) return NextResponse.json({ error: "Profil topilmadi" }, { status: 404 });

    const { creatorUsername, creatorId } = await req.json();
    let cId: string | null = creatorId ?? null;
    let price = 0;
    let creatorCountry: string | null = null;
    if (cId) {
        const c = await prisma.userProfile.findUnique({ where: { id: cId }, select: { id: true, subPrice: true, country: true } });
        cId = c?.id ?? null; price = c?.subPrice ?? 0; creatorCountry = c?.country ?? null;
    } else if (creatorUsername) {
        const c = await prisma.userProfile.findUnique({ where: { username: creatorUsername }, select: { id: true, subPrice: true, country: true } });
        cId = c?.id ?? null; price = c?.subPrice ?? 0; creatorCountry = c?.country ?? null;
    }
    if (!cId) return NextResponse.json({ error: "Ijodkor topilmadi" }, { status: 404 });
    if (cId === me.id) return NextResponse.json({ error: "O'zingizga obuna bo'la olmaysiz" }, { status: 400 });
    if (price <= 0) return NextResponse.json({ error: "Bu ijodkorda pullik obuna yo'q" }, { status: 400 });
    if (await isBlockedBetween(me.id, cId)) return NextResponse.json({ error: "Bu ijodkorga obuna bo'la olmaysiz" }, { status: 403 });

    const creatorId2 = cId;

    try {
        const result = await prisma.$transaction(async tx => {
            // Ijodkor hamyoni/valyutasi (narx shu valyutada)
            let aw = await tx.wallet.findUnique({ where: { profileId: creatorId2 } });
            if (!aw) aw = await tx.wallet.create({ data: { profileId: creatorId2, currency: currencyForCountry(creatorCountry) } });
            const aCur = cur(aw.currency);

            const wallet = await tx.wallet.findUnique({ where: { profileId: me.id } });
            if (!wallet) return "no_funds" as const;
            const bCur = cur(wallet.currency);
            const buyerPays = convert(price, aCur, bCur);   // obunachi o'z valyutasida to'laydi

            // Obunachi — atomik shartli debit (race-safe)
            const debit = await tx.wallet.updateMany({ where: { id: wallet.id, balance: { gte: buyerPays } }, data: { balance: { decrement: buyerPays } } });
            if (debit.count === 0) return "no_funds" as const;
            const afterBuyer = await tx.wallet.findUnique({ where: { id: wallet.id }, select: { balance: true } });
            const newBuyerBal = roundMoney(Number(afterBuyer?.balance ?? 0), bCur);
            await tx.walletTransaction.create({
                data: { walletId: wallet.id, type: "TRANSFER_OUT", amount: buyerPays, currency: bCur, balanceAfter: newBuyerBal, description: "Nexus pullik obuna", ref: creatorId2 },
            });

            // Ijodkor — TRANSFER_IN (narxni to'liq o'z valyutasida oladi)
            await tx.wallet.update({ where: { id: aw.id }, data: { balance: { increment: price } } });
            const afterAuthor = await tx.wallet.findUnique({ where: { id: aw.id }, select: { balance: true } });
            const newAuthorBal = roundMoney(Number(afterAuthor?.balance ?? 0), aCur);
            await tx.walletTransaction.create({
                data: { walletId: aw.id, type: "TRANSFER_IN", amount: price, currency: aCur, balanceAfter: newAuthorBal, description: "Nexus obuna daromadi", ref: me.id },
            });

            // Obuna yozuvi — faol bo'lsa uzaytiramiz, aks holda now+30
            const existing = await tx.nexusSubscription.findUnique({
                where: { subscriberId_creatorId: { subscriberId: me.id, creatorId: creatorId2 } },
            });
            const base = existing && existing.expiresAt.getTime() > Date.now() ? existing.expiresAt.getTime() : Date.now();
            const expiresAt = new Date(base + SUB_DAYS * 24 * 60 * 60 * 1000);
            await tx.nexusSubscription.upsert({
                where: { subscriberId_creatorId: { subscriberId: me.id, creatorId: creatorId2 } },
                create: { subscriberId: me.id, creatorId: creatorId2, price: price, expiresAt },
                update: { price: price, expiresAt, expiryNotifiedAt: null },
            });
            return { ok: true as const, expiresAt };
        });

        if (result === "no_funds") return NextResponse.json({ error: "Mablag' yetarli emas — ALKH Pay hamyoningizni to'ldiring" }, { status: 402 });

        after(() => nexusNotify({ recipientId: creatorId2, actorId: me.id, type: "TIP", amount: price }));
        return NextResponse.json({ ok: true, active: true, expiresAt: result.expiresAt });
    } catch {
        return NextResponse.json({ error: "Obuna amalga oshmadi, qayta urinib ko'ring" }, { status: 500 });
    }
}
