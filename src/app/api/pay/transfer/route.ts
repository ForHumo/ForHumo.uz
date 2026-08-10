import { NextResponse } from "next/server";
import crypto from "crypto";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getOrCreateWallet, walletCurrency } from "@/lib/wallet";
import { minAmount, roundMoney, convert, formatMoney } from "@/lib/money";
import { nexusRateLimited, RATE_MSG } from "@/lib/nexus-rate";
import { after } from "next/server";
import { triggerPayAgentDM } from "@/lib/pay-agent-trigger";

// POST /api/pay/transfer — username bo'yicha pul yuborish.
// Yuboruvchi o'z valyutasida tanlaydi; qabul qiluvchi o'z valyutasida (kerak bo'lsa konvert) oladi.
export async function POST(req: Request) {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { toUsername, amount, note } = await req.json();
    if (!toUsername?.trim()) return NextResponse.json({ error: "Username kiritilmagan" }, { status: 400 });

    const sender = await prisma.userProfile.findUnique({ where: { email: session.user.email }, select: { id: true, username: true, country: true } });
    if (!sender) return NextResponse.json({ error: "Profil topilmadi" }, { status: 404 });

    const cleanUsername = toUsername.replace(/^@/, "").trim();
    if (sender.username?.toLowerCase() === cleanUsername.toLowerCase())
        return NextResponse.json({ error: "O'zingizga yuborib bo'lmaydi" }, { status: 400 });

    const receiver = await prisma.userProfile.findUnique({ where: { username: cleanUsername }, select: { id: true, name: true, username: true, country: true } });
    if (!receiver) return NextResponse.json({ error: `@${cleanUsername} topilmadi` }, { status: 404 });

    const senderWallet = await getOrCreateWallet(sender.id, sender.country);
    const receiverWallet = await getOrCreateWallet(receiver.id, receiver.country);
    const sCur = walletCurrency(senderWallet);
    const rCur = walletCurrency(receiverWallet);

    const sendAmount = roundMoney(Number(amount), sCur);
    if (!sendAmount || isNaN(sendAmount) || sendAmount < minAmount(sCur))
        return NextResponse.json({ error: `Kamida ${formatMoney(minAmount(sCur), sCur)} yuborish kerak` }, { status: 400 });
    if (Number(senderWallet.balance) < sendAmount)
        return NextResponse.json({ error: "Balans yetarli emas" }, { status: 400 });

    if (await nexusRateLimited(sender.id, "payTransfer")) return NextResponse.json({ error: RATE_MSG }, { status: 429 });

    const recvAmount = convert(sendAmount, sCur, rCur);
    const desc = typeof note === "string" && note.trim() ? note.trim().slice(0, 120) : null;

    const result = await prisma.$transaction(async tx => {
        // Atomik shartli debit (race-safe)
        const debit = await tx.wallet.updateMany({ where: { id: senderWallet.id, balance: { gte: sendAmount } }, data: { balance: { decrement: sendAmount } } });
        if (debit.count === 0) return null;
        const afterS = await tx.wallet.findUnique({ where: { id: senderWallet.id }, select: { balance: true } });
        const senderNew = roundMoney(Number(afterS?.balance ?? 0), sCur);
        await tx.wallet.update({ where: { id: receiverWallet.id }, data: { balance: { increment: recvAmount } } });
        const afterR = await tx.wallet.findUnique({ where: { id: receiverWallet.id }, select: { balance: true } });
        const receiverNew = roundMoney(Number(afterR?.balance ?? 0), rCur);
        // Har o'tkazma noyob — UUID bilan (Date.now() bir vaqtda 2 so'rovda dublikat berishi mumkin)
        const txRef = `xfer:${crypto.randomUUID()}`;
        await tx.walletTransaction.create({ data: { walletId: senderWallet.id, type: "TRANSFER_OUT", amount: sendAmount, currency: sCur, balanceAfter: senderNew, description: desc ?? `@${cleanUsername} ga yuborildi`, ref: txRef } });
        await tx.walletTransaction.create({ data: { walletId: receiverWallet.id, type: "TRANSFER_IN", amount: recvAmount, currency: rCur, balanceAfter: receiverNew, description: desc ?? `@${sender.username ?? "Foydalanuvchi"} dan`, ref: txRef } });
        return senderNew;
    });
    if (result === null) return NextResponse.json({ error: "Balans yetarli emas" }, { status: 400 });

    // @pay_agent qabul qiluvchiga DM (o'tkazma keldi)
    after(() => triggerPayAgentDM({
        kind: "transfer_in", profileId: receiver.id,
        amount: recvAmount, currency: rCur as "UZS" | "USD",
        fromUsername: sender.username, note: desc,
    }));

    return NextResponse.json({
        balance: result, currency: sCur,
        to: { username: cleanUsername, name: receiver.name },
        amount: sendAmount, received: recvAmount, receiverCurrency: rCur,
    });
}
