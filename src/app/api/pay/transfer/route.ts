import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getOrCreateWallet, walletCurrency } from "@/lib/wallet";
import { minAmount, roundMoney, convert, formatMoney } from "@/lib/money";

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

    const recvAmount = convert(sendAmount, sCur, rCur);
    const senderNew = roundMoney(Number(senderWallet.balance) - sendAmount, sCur);
    const receiverNew = roundMoney(Number(receiverWallet.balance) + recvAmount, rCur);
    const desc = typeof note === "string" && note.trim() ? note.trim().slice(0, 120) : null;

    await prisma.$transaction([
        prisma.zijWallet.update({ where: { id: senderWallet.id }, data: { balance: senderNew } }),
        prisma.zijWallet.update({ where: { id: receiverWallet.id }, data: { balance: receiverNew } }),
        prisma.zijTransaction.create({
            data: { walletId: senderWallet.id, type: "TRANSFER_OUT", amount: sendAmount, currency: sCur, balanceAfter: senderNew, description: desc ?? `@${cleanUsername} ga yuborildi`, ref: receiver.id },
        }),
        prisma.zijTransaction.create({
            data: { walletId: receiverWallet.id, type: "TRANSFER_IN", amount: recvAmount, currency: rCur, balanceAfter: receiverNew, description: desc ?? `@${sender.username ?? "Foydalanuvchi"} dan`, ref: sender.id },
        }),
    ]);

    return NextResponse.json({
        balance: senderNew, currency: sCur,
        to: { username: cleanUsername, name: receiver.name },
        amount: sendAmount, received: recvAmount, receiverCurrency: rCur,
    });
}
