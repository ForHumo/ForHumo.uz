import { NextResponse } from "next/server";
import { after } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getOrCreateWallet, walletCurrency } from "@/lib/wallet";
import { minAmount, maxAmount, roundMoney, formatMoney } from "@/lib/money";
import { getDepositProvider } from "@/lib/payments";
import { grantAchievement } from "@/lib/achievements";
import { triggerPayAgentForTransaction } from "@/lib/pay-agent-trigger";

// POST /api/pay/deposit — hamyonni to'ldirish.
// Test rejimda darhol tushadi; real shlyuzda redirectUrl qaytarib, webhook'da tasdiqlanadi.
export async function POST(req: Request) {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const profile = await prisma.userProfile.findUnique({ where: { email: session.user.email }, select: { id: true, country: true } });
    if (!profile) return NextResponse.json({ error: "Profil topilmadi" }, { status: 404 });

    const wallet = await getOrCreateWallet(profile.id, profile.country);
    const currency = walletCurrency(wallet);

    const amount = roundMoney(Number((await req.json()).amount), currency);
    if (!amount || isNaN(amount) || amount < minAmount(currency))
        return NextResponse.json({ error: `Kamida ${formatMoney(minAmount(currency), currency)} kiritish kerak` }, { status: 400 });
    if (amount > maxAmount(currency))
        return NextResponse.json({ error: "Miqdor juda katta" }, { status: 400 });

    const provider = getDepositProvider(currency);
    const res = await provider.createDeposit({ amount, currency, profileId: profile.id });

    // Real shlyuz to'lovga yo'naltirdi — balans webhook'da tushadi
    if (res.status === "redirect" && res.redirectUrl) {
        return NextResponse.json({ redirectUrl: res.redirectUrl });
    }

    // Test (yoki darhol tasdiqlangan) — balansga qo'shamiz
    const newBalance = roundMoney(Number(wallet.balance) + amount, currency);
    const [updated, tx] = await prisma.$transaction([
        prisma.wallet.update({ where: { id: wallet.id }, data: { balance: newBalance } }),
        prisma.walletTransaction.create({
            data: {
                walletId: wallet.id, type: "DEPOSIT", amount, currency, balanceAfter: newBalance,
                description: provider.live ? "To'ldirish" : "Test to'ldirish", ref: res.providerRef ?? null,
            },
        }),
    ]);

    after(() => { grantAchievement(profile.id, "pay.first_deposit"); });
    after(() => triggerPayAgentForTransaction(tx.id));

    return NextResponse.json({ balance: updated.balance, currency, transaction: tx });
}
