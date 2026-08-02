import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getEsportOwner } from "@/lib/esport";
import { getOrCreateWalletTx } from "@/lib/wallet";
import { convert, roundMoney, type Currency } from "@/lib/money";

// POST /api/esport/admin/tournaments/[id]/fund — ega mukofot fondini O'Z hamyonidan to'ldiradi (escrow)
// { amount } — turnir valyutasida. Atomik: hamyondan yechiladi, prizeFunded oshadi, ledger yoziladi.
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
    const me = await getEsportOwner();
    if (!me) return NextResponse.json({ error: "Faqat ega" }, { status: 403 });
    const { id } = await params;

    const t = await prisma.esTournament.findUnique({ where: { id }, select: { id: true, currency: true } });
    if (!t) return NextResponse.json({ error: "Turnir topilmadi" }, { status: 404 });

    const body = await req.json().catch(() => ({}));
    const amount = Math.max(0, Math.round(Number(body.amount) || 0)); // turnir valyutasida
    if (amount <= 0) return NextResponse.json({ error: "Summa kiriting" }, { status: 400 });
    const tCur = (t.currency === "USD" ? "USD" : "UZS") as Currency;

    const result = await prisma.$transaction(async tx => {
        const profile = await tx.userProfile.findUnique({ where: { id: me.id }, select: { country: true } });
        const wallet = await getOrCreateWalletTx(tx, me.id, profile?.country);
        const wCur = (wallet.currency === "USD" ? "USD" : "UZS") as Currency;
        const pay = roundMoney(convert(amount, tCur, wCur), wCur);
        const debit = await tx.wallet.updateMany({ where: { id: wallet.id, balance: { gte: pay } }, data: { balance: { decrement: pay } } });
        if (debit.count === 0) return { ok: false as const };
        const after = await tx.wallet.findUnique({ where: { id: wallet.id }, select: { balance: true } });
        await tx.walletTransaction.create({ data: { walletId: wallet.id, type: "TRANSFER_OUT", amount: pay, currency: wCur, balanceAfter: roundMoney(Number(after?.balance ?? 0), wCur), description: "Turnir mukofot fondi (escrow)", ref: `tourfund:${id}:${Date.now()}` } });
        const upd = await tx.esTournament.update({ where: { id }, data: { prizeFunded: { increment: amount } }, select: { prizeFunded: true } });
        return { ok: true as const, funded: Number(upd.prizeFunded) };
    });

    if (!result.ok) return NextResponse.json({ error: "Hamyonda mablag' yetarli emas — ALKH Pay'ni to'ldiring" }, { status: 402 });
    return NextResponse.json({ ok: true, prizeFunded: result.funded });
}
