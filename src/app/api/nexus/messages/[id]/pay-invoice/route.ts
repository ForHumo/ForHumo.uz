// Agent invoice to'lash — foydalanuvchi "To'lash X UZS" tugmasini bosadi,
// mablag' agent hamyoniga atomik o'tadi, agent webhook'iga event="invoice.paid" fire.
//
//   POST /api/nexus/messages/[id]/pay-invoice
//     body: { messageId }
//
// Xavfsizlik:
// - Faqat invoice yozilgan xabar (msg.invoice != null)
// - Faqat qabul qiluvchi (foydalanuvchi, agent emas) to'lay oladi
// - Bir marta to'lash (invoicePaidAt tekshiruv, atomik guard)
// - Balans yetarli emas → 400
// - Currency mismatch → serverside konvert (money.ts convert())

import { NextResponse } from "next/server";
import { after } from "next/server";
import crypto from "crypto";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { otherId } from "@/lib/nexus-dm";
import { getOrCreateWallet, walletCurrency } from "@/lib/wallet";
import { roundMoney, convert, formatMoney, minAmount } from "@/lib/money";
import { pusherTrigger, userChannel } from "@/lib/pusher-server";
import { sendToAgentWebhook } from "@/lib/agent-webhook";
import { nexusRateLimited, RATE_MSG } from "@/lib/nexus-rate";

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const me = await prisma.userProfile.findUnique({
        where: { email: session.user.email },
        select: { id: true, username: true, name: true, country: true },
    });
    if (!me) return NextResponse.json({ error: "Profil topilmadi" }, { status: 404 });

    const body = await req.json().catch(() => ({}));
    const messageId = typeof body.messageId === "string" ? body.messageId : null;
    if (!messageId) return NextResponse.json({ error: "messageId kerak" }, { status: 400 });

    if (await nexusRateLimited(me.id, "payTransfer")) {
        return NextResponse.json({ error: RATE_MSG }, { status: 429 });
    }

    const conv = await prisma.nexusConversation.findUnique({
        where: { id }, select: { user1Id: true, user2Id: true },
    });
    if (!conv) return NextResponse.json({ error: "Suhbat topilmadi" }, { status: 404 });
    if (conv.user1Id !== me.id && conv.user2Id !== me.id) {
        return NextResponse.json({ error: "Ruxsat yo'q" }, { status: 403 });
    }

    const msg = await prisma.nexusMessage.findUnique({
        where: { id: messageId },
        select: { id: true, conversationId: true, senderId: true, invoice: true, invoicePaidAt: true },
    });
    if (!msg || msg.conversationId !== id) return NextResponse.json({ error: "Xabar topilmadi" }, { status: 404 });

    const agentProfileId = otherId(conv, me.id);
    if (msg.senderId !== agentProfileId) {
        return NextResponse.json({ error: "Bu invoice agent'ga tegishli emas" }, { status: 400 });
    }
    if (msg.invoicePaidAt) return NextResponse.json({ error: "Allaqachon to'langan", code: "ALREADY_PAID" }, { status: 410 });

    const inv = msg.invoice as { amount?: number; currency?: string; description?: string; payload?: string } | null;
    if (!inv || typeof inv.amount !== "number" || inv.amount <= 0) {
        return NextResponse.json({ error: "Invoice noto'g'ri" }, { status: 400 });
    }
    const invAmount: number = inv.amount;
    const invCurrency = inv.currency === "USD" ? "USD" : "UZS";

    // Faqat aftida agent (yozuvchi) haqiqatan NexusAgent bo'lishi kerak
    const agent = await prisma.nexusAgent.findUnique({
        where: { profileId: agentProfileId },
        select: { profileId: true, webhookUrl: true, apiKey: true },
    });
    if (!agent) return NextResponse.json({ error: "Agent topilmadi" }, { status: 404 });

    const agentProfile = await prisma.userProfile.findUnique({
        where: { id: agentProfileId }, select: { country: true },
    });

    const payerWallet = await getOrCreateWallet(me.id, me.country);
    const agentWallet = await getOrCreateWallet(agentProfileId, agentProfile?.country);
    const pCur = walletCurrency(payerWallet);
    const aCur = walletCurrency(agentWallet);

    // Invoice foydalanuvchi valyutasida ko'rsatilgan; agent hamyoniga konvert qilamiz.
    // Agar invoice currency payerCur bilan mos bo'lmasa, convert (invoice → payerCur)
    const payAmount = roundMoney(convert(invAmount, invCurrency, pCur), pCur);
    if (payAmount < minAmount(pCur)) {
        return NextResponse.json({ error: `Kamida ${formatMoney(minAmount(pCur), pCur)}` }, { status: 400 });
    }
    if (Number(payerWallet.balance) < payAmount) {
        return NextResponse.json({ error: "Balans yetarli emas", code: "INSUFFICIENT" }, { status: 400 });
    }
    const receiveAmount = convert(payAmount, pCur, aCur);
    const desc = String(inv.description).slice(0, 200);
    const txRef = `invoice:${crypto.randomUUID()}`;

    // Atomik: balans debit + invoicePaidAt guard (bir marta to'lash)
    const result = await prisma.$transaction(async tx => {
        // Guard: agar boshqa so'rov allaqachon to'lagan bo'lsa (race), 0 qaytadi
        const guard = await tx.nexusMessage.updateMany({
            where: { id: messageId, invoicePaidAt: null },
            data: { invoicePaidAt: new Date() },
        });
        if (guard.count === 0) return null;

        const debit = await tx.wallet.updateMany({
            where: { id: payerWallet.id, balance: { gte: payAmount } },
            data: { balance: { decrement: payAmount } },
        });
        if (debit.count === 0) {
            // Race — invoicePaidAt yozilgan lekin balans yetmadi; rollback manual
            await tx.nexusMessage.update({ where: { id: messageId }, data: { invoicePaidAt: null } });
            return null;
        }

        const afterPayer = await tx.wallet.findUnique({ where: { id: payerWallet.id }, select: { balance: true } });
        const payerNew = roundMoney(Number(afterPayer?.balance ?? 0), pCur);
        await tx.wallet.update({ where: { id: agentWallet.id }, data: { balance: { increment: receiveAmount } } });
        const afterAgent = await tx.wallet.findUnique({ where: { id: agentWallet.id }, select: { balance: true } });
        const agentNew = roundMoney(Number(afterAgent?.balance ?? 0), aCur);

        await tx.walletTransaction.create({
            data: {
                walletId: payerWallet.id, type: "TRANSFER_OUT", amount: payAmount, currency: pCur,
                balanceAfter: payerNew, description: `Bot invoice: ${desc}`, ref: txRef,
            },
        });
        await tx.walletTransaction.create({
            data: {
                walletId: agentWallet.id, type: "TRANSFER_IN", amount: receiveAmount, currency: aCur,
                balanceAfter: agentNew, description: `Bot invoice: ${desc}`, ref: txRef,
            },
        });
        return { payerNew, agentNew };
    });

    if (result === null) {
        return NextResponse.json({ error: "To'lov muvaffaqiyatsiz (balans yoki boshqa to'lov)" }, { status: 400 });
    }

    // Agent webhook'iga bildirish
    if (agent.webhookUrl && agent.apiKey) {
        after(() => sendToAgentWebhook(agent, {
            event: "invoice.paid",
            chatId: id,
            messageId,
            from: {
                profileId: me.id,
                username: me.username ?? null,
                name: me.name ?? null,
            },
            text: "",
            mediaUrl: null,
            mediaType: null,
            invoice: {
                amount: invAmount, currency: invCurrency,
                description: desc, payload: inv.payload,
                txRef,
            },
            timestamp: Math.floor(Date.now() / 1000),
        }));
    }

    // Real-time — invoice tugmasi darhol yashiringan holatda ko'rsatiladi
    after(() => pusherTrigger(userChannel(me.id), "nx:msg:invoice-paid", {
        convId: id, messageId, paidAt: new Date().toISOString(),
    }));
    after(() => pusherTrigger(userChannel(agentProfileId), "nx:msg:invoice-paid", {
        convId: id, messageId, paidAt: new Date().toISOString(),
    }));

    return NextResponse.json({
        ok: true,
        balance: result.payerNew,
        currency: pCur,
        paid: payAmount,
        txRef,
    });
}
