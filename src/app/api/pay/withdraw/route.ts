import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getOrCreateWallet, walletCurrency } from "@/lib/wallet";
import { minAmount, roundMoney, formatMoney } from "@/lib/money";
import { getPayoutProvider } from "@/lib/payments";
import { nexusRateLimited, RATE_MSG } from "@/lib/nexus-rate";

// Karta raqamini maskalash — faqat oxirgi 4 raqam saqlanadi
function maskCard(s: string): string {
    const digits = s.replace(/\D/g, "");
    if (digits.length < 4) return "****";
    return `**** **** **** ${digits.slice(-4)}`;
}

// GET /api/pay/withdraw — mening payout so'rovlarim
export async function GET() {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const profile = await prisma.userProfile.findUnique({ where: { email: session.user.email }, select: { id: true } });
    if (!profile) return NextResponse.json({ error: "Profil topilmadi" }, { status: 404 });
    const wallet = await prisma.zijWallet.findUnique({ where: { profileId: profile.id } });
    if (!wallet) return NextResponse.json({ payouts: [] });
    const payouts = await prisma.payoutRequest.findMany({ where: { walletId: wallet.id }, orderBy: { createdAt: "desc" }, take: 30 });
    return NextResponse.json({ payouts });
}

// POST /api/pay/withdraw — pul yechish (payout). Balans darhol kamayadi (escrow).
// Test rejimda payout darhol COMPLETED; real shlyuzda PROCESSING (webhook'da yakunlanadi).
export async function POST(req: Request) {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const profile = await prisma.userProfile.findUnique({ where: { email: session.user.email }, select: { id: true, country: true } });
    if (!profile) return NextResponse.json({ error: "Profil topilmadi" }, { status: 404 });

    const wallet = await getOrCreateWallet(profile.id, profile.country);
    const currency = walletCurrency(wallet);

    const body = await req.json();
    const amount = roundMoney(Number(body.amount), currency);
    const method = body.method === "bank" ? "bank" : "card";
    const destinationRaw = String(body.destination || "").trim();

    if (!amount || isNaN(amount) || amount < minAmount(currency))
        return NextResponse.json({ error: `Kamida ${formatMoney(minAmount(currency), currency)} yechish mumkin` }, { status: 400 });
    if (!destinationRaw) return NextResponse.json({ error: "Karta yoki hisob raqami kerak" }, { status: 400 });
    if (Number(wallet.balance) < amount) return NextResponse.json({ error: "Balans yetarli emas" }, { status: 400 });
    if (await nexusRateLimited(profile.id, "payWithdraw")) return NextResponse.json({ error: RATE_MSG }, { status: 429 });

    const destination = method === "card" ? maskCard(destinationRaw) : destinationRaw.slice(0, 40);

    // Atomik shartli debit (race-safe) + payout + WITHDRAW tranzaksiya
    const txResult = await prisma.$transaction(async tx => {
        const debit = await tx.zijWallet.updateMany({ where: { id: wallet.id, balance: { gte: amount } }, data: { balance: { decrement: amount } } });
        if (debit.count === 0) return null;
        const after = await tx.zijWallet.findUnique({ where: { id: wallet.id }, select: { balance: true } });
        const newBal = roundMoney(Number(after?.balance ?? 0), currency);
        const p = await tx.payoutRequest.create({
            data: { walletId: wallet.id, amount, currency, method, destination, status: "PENDING" },
        });
        await tx.zijTransaction.create({
            data: { walletId: wallet.id, type: "WITHDRAW", amount, currency, balanceAfter: newBal, description: `Pul yechish (${destination})`, ref: p.id },
        });
        return { payout: p, newBalance: newBal };
    });
    if (!txResult) return NextResponse.json({ error: "Balans yetarli emas" }, { status: 400 });
    const { payout, newBalance } = txResult;

    // Shlyuzga yuborish
    const provider = getPayoutProvider(currency);
    const res = await provider.createPayout({ amount, currency, profileId: profile.id, method, destination });
    const status = res.status === "completed" ? "COMPLETED" : res.status === "processing" ? "PROCESSING" : "FAILED";

    if (status === "FAILED") {
        // Muvaffaqiyatsiz — balansni qaytaramiz (increment)
        const restored = roundMoney(newBalance + amount, currency);
        await prisma.$transaction([
            prisma.zijWallet.update({ where: { id: wallet.id }, data: { balance: { increment: amount } } }),
            prisma.payoutRequest.update({ where: { id: payout.id }, data: { status: "FAILED", providerRef: res.providerRef ?? null } }),
            prisma.zijTransaction.create({ data: { walletId: wallet.id, type: "REFUND", amount, currency, balanceAfter: restored, description: "Pul yechish bekor qilindi", ref: payout.id } }),
        ]);
        return NextResponse.json({ error: res.error || "Pul yechish amalga oshmadi" }, { status: 502 });
    }

    await prisma.payoutRequest.update({ where: { id: payout.id }, data: { status, providerRef: res.providerRef ?? null } });
    return NextResponse.json({ ok: true, balance: newBalance, currency, payout: { ...payout, status } });
}
