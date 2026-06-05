import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// POST /api/pay/transfer — username bo'yicha Zij yuborish
export async function POST(req: Request) {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email)
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { toUsername, amount, note } = await req.json();
    const zij = Number(amount);

    if (!toUsername?.trim())
        return NextResponse.json({ error: "Username kiritilmagan" }, { status: 400 });
    if (!zij || isNaN(zij) || zij < 1)
        return NextResponse.json({ error: "Kamida 1 Ƶ yuborish kerak" }, { status: 400 });

    // Yuboruvchi
    const senderProfile = await prisma.userProfile.findUnique({
        where: { email: session.user.email },
    });
    if (!senderProfile)
        return NextResponse.json({ error: "Profile topilmadi" }, { status: 404 });

    // O'ziga yuborishni bloklash
    const cleanUsername = toUsername.replace(/^@/, "").trim();
    if (senderProfile.username?.toLowerCase() === cleanUsername.toLowerCase())
        return NextResponse.json({ error: "O'zingizga yuborib bo'lmaydi" }, { status: 400 });

    // Qabul qiluvchi
    const receiverProfile = await prisma.userProfile.findUnique({
        where: { username: cleanUsername },
    });
    if (!receiverProfile)
        return NextResponse.json({ error: `@${cleanUsername} topilmadi` }, { status: 404 });

    // Yuboruvchi hamyoni
    let senderWallet = await prisma.zijWallet.findUnique({ where: { profileId: senderProfile.id } });
    if (!senderWallet) senderWallet = await prisma.zijWallet.create({ data: { profileId: senderProfile.id } });

    if (Number(senderWallet.balance) < zij)
        return NextResponse.json({ error: "Balans yetarli emas" }, { status: 400 });

    // Qabul qiluvchi hamyoni (lazy init)
    let receiverWallet = await prisma.zijWallet.findUnique({ where: { profileId: receiverProfile.id } });
    if (!receiverWallet) receiverWallet = await prisma.zijWallet.create({ data: { profileId: receiverProfile.id } });

    const senderNewBalance   = Number(senderWallet.balance)   - zij;
    const receiverNewBalance = Number(receiverWallet.balance) + zij;
    const desc = note?.trim() || null;

    await prisma.$transaction([
        // Yuboruvchi balansi kamayadi
        prisma.zijWallet.update({ where: { id: senderWallet.id }, data: { balance: senderNewBalance } }),
        // Qabul qiluvchi balansi oshadi
        prisma.zijWallet.update({ where: { id: receiverWallet.id }, data: { balance: receiverNewBalance } }),
        // Yuboruvchi tranzaksiyasi
        prisma.zijTransaction.create({
            data: {
                walletId: senderWallet.id,
                type: "TRANSFER_OUT",
                amount: zij,
                balanceAfter: senderNewBalance,
                description: desc ?? `@${cleanUsername} ga yuborildi`,
                ref: receiverProfile.id,
            },
        }),
        // Qabul qiluvchi tranzaksiyasi
        prisma.zijTransaction.create({
            data: {
                walletId: receiverWallet.id,
                type: "TRANSFER_IN",
                amount: zij,
                balanceAfter: receiverNewBalance,
                description: desc ?? `@${senderProfile.username ?? senderProfile.email} dan`,
                ref: senderProfile.id,
            },
        }),
    ]);

    return NextResponse.json({
        balance: senderNewBalance,
        to: { username: cleanUsername, name: receiverProfile.name },
        amount: zij,
    });
}
