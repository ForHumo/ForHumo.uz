// DM ichida For Pay orqali pul yuborish (darhol o'tkaziladi).
//
// POST /api/nexus/messages/[id]/transfer
//   [id] = NexusConversation.id
//   body: { amount: number, note?: string }
//
// Xulq: yuboruvchi hamyonidan qabul qiluvchi hamyoniga (valyuta konvert) — darhol.
// Suhbatga "transfer" turidagi xabar-karta yoziladi.

import { NextResponse } from "next/server";
import crypto from "crypto";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { otherId } from "@/lib/nexus-dm";
import { getOrCreateWallet, walletCurrency } from "@/lib/wallet";
import { minAmount, roundMoney, convert, formatMoney } from "@/lib/money";
import { isBlockedBetween } from "@/lib/nexus-block";
import { nexusRateLimited, RATE_MSG } from "@/lib/nexus-rate";

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const { id } = await params;

    const me = await prisma.userProfile.findUnique({
        where: { email: session.user.email },
        select: { id: true, username: true, name: true, country: true },
    });
    if (!me) return NextResponse.json({ error: "Profil topilmadi" }, { status: 404 });

    const conv = await prisma.nexusConversation.findUnique({ where: { id } });
    if (!conv) return NextResponse.json({ error: "Suhbat topilmadi" }, { status: 404 });
    if (conv.user1Id !== me.id && conv.user2Id !== me.id) {
        return NextResponse.json({ error: "Ruxsat yo'q" }, { status: 403 });
    }

    const peerId = otherId(conv, me.id);
    if (await isBlockedBetween(me.id, peerId)) {
        return NextResponse.json({ error: "Bu suhbatga yoza olmaysiz" }, { status: 403 });
    }

    const body = await req.json().catch(() => ({}));
    const rawAmount = Number(body?.amount);
    const noteRaw = typeof body?.note === "string" ? body.note.trim().slice(0, 120) : "";

    const receiver = await prisma.userProfile.findUnique({
        where: { id: peerId },
        select: { id: true, username: true, name: true, country: true },
    });
    if (!receiver) return NextResponse.json({ error: "Qabul qiluvchi topilmadi" }, { status: 404 });

    const senderWallet = await getOrCreateWallet(me.id, me.country);
    const receiverWallet = await getOrCreateWallet(receiver.id, receiver.country);
    const sCur = walletCurrency(senderWallet);
    const rCur = walletCurrency(receiverWallet);

    const sendAmount = roundMoney(rawAmount, sCur);
    if (!sendAmount || isNaN(sendAmount) || sendAmount < minAmount(sCur)) {
        return NextResponse.json({ error: `Kamida ${formatMoney(minAmount(sCur), sCur)} yuborish kerak` }, { status: 400 });
    }
    if (Number(senderWallet.balance) < sendAmount) {
        return NextResponse.json({ error: "Balans yetarli emas" }, { status: 400 });
    }

    if (await nexusRateLimited(me.id, "payTransfer")) {
        return NextResponse.json({ error: RATE_MSG }, { status: 429 });
    }

    const recvAmount = convert(sendAmount, sCur, rCur);
    const desc = noteRaw || `@${receiver.username ?? "foydalanuvchi"} ga (DM)`;
    const txRef = `dm-xfer:${crypto.randomUUID()}`;

    // Atomik: debit sender → credit receiver → 2 ta WalletTransaction → NexusMessage yaratamiz
    const result = await prisma.$transaction(async tx => {
        const debit = await tx.wallet.updateMany({
            where: { id: senderWallet.id, balance: { gte: sendAmount } },
            data: { balance: { decrement: sendAmount } },
        });
        if (debit.count === 0) return null;

        const afterS = await tx.wallet.findUnique({ where: { id: senderWallet.id }, select: { balance: true } });
        const senderNew = roundMoney(Number(afterS?.balance ?? 0), sCur);

        await tx.wallet.update({ where: { id: receiverWallet.id }, data: { balance: { increment: recvAmount } } });
        const afterR = await tx.wallet.findUnique({ where: { id: receiverWallet.id }, select: { balance: true } });
        const receiverNew = roundMoney(Number(afterR?.balance ?? 0), rCur);

        await tx.walletTransaction.create({
            data: {
                walletId: senderWallet.id, type: "TRANSFER_OUT",
                amount: sendAmount, currency: sCur, balanceAfter: senderNew,
                description: `DM: @${receiver.username ?? "foydalanuvchi"}${noteRaw ? ` — ${noteRaw}` : ""}`,
                ref: txRef,
            },
        });
        await tx.walletTransaction.create({
            data: {
                walletId: receiverWallet.id, type: "TRANSFER_IN",
                amount: recvAmount, currency: rCur, balanceAfter: receiverNew,
                description: `DM: @${me.username ?? "foydalanuvchi"}${noteRaw ? ` — ${noteRaw}` : ""}`,
                ref: txRef,
            },
        });

        const msg = await tx.nexusMessage.create({
            data: {
                conversationId: id, senderId: me.id,
                text: noteRaw,
                mediaType: "transfer",
                transferAmount: sendAmount, transferCurrency: sCur,
                transferRef: txRef, transferNote: noteRaw || null,
            },
        });

        await tx.nexusConversation.update({
            where: { id },
            data: {
                lastMessageAt: new Date(),
                lastMessageText: `Pul: ${formatMoney(sendAmount, sCur)}`,
                lastSenderId: me.id,
                ...(conv.user1Id === me.id ? { user1ReadAt: new Date() } : { user2ReadAt: new Date() }),
            },
        });

        return { msg, senderNew };
    });

    if (!result) return NextResponse.json({ error: "Balans yetarli emas" }, { status: 400 });

    return NextResponse.json({
        balance: result.senderNew, currency: sCur,
        message: {
            id: result.msg.id, text: result.msg.text, mine: true, createdAt: result.msg.createdAt,
            mediaType: "transfer",
            transferAmount: Number(result.msg.transferAmount ?? 0),
            transferCurrency: result.msg.transferCurrency,
            transferNote: result.msg.transferNote,
        },
    });
}
