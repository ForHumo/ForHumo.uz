import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// Limit yo'q — test rejim (real pul kirganda qaytadi)
const MIN_DEPOSIT = 1;

export async function POST(req: Request) {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email)
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json();
    const amount = Number(body.amount);

    if (!amount || isNaN(amount) || amount < MIN_DEPOSIT)
        return NextResponse.json({ error: `Kamida ${MIN_DEPOSIT} Ƶ kiritish kerak` }, { status: 400 });

    const profile = await prisma.userProfile.findUnique({ where: { email: session.user.email } });
    if (!profile) return NextResponse.json({ error: "Profile not found" }, { status: 404 });

    let wallet = await prisma.zijWallet.findUnique({ where: { profileId: profile.id } });
    if (!wallet) wallet = await prisma.zijWallet.create({ data: { profileId: profile.id } });

    const newBalance = Number(wallet.balance) + amount;
    const [updatedWallet, tx] = await prisma.$transaction([
        prisma.zijWallet.update({ where: { id: wallet.id }, data: { balance: newBalance } }),
        prisma.zijTransaction.create({
            data: {
                walletId: wallet.id,
                type: "DEPOSIT",
                amount,
                balanceAfter: newBalance,
                description: "Test to'ldirish",
            },
        }),
    ]);

    return NextResponse.json({ balance: updatedWallet.balance, transaction: tx });
}
