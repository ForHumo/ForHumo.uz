import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// Maksimal test deposit (1000 Zij)
const MAX_DEPOSIT = 1000;
const MIN_DEPOSIT = 1;

// POST /api/pay/deposit — test rejimida Zij kiritish
export async function POST(req: Request) {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const amount = Number(body.amount);

    if (!amount || isNaN(amount) || amount < MIN_DEPOSIT || amount > MAX_DEPOSIT) {
        return NextResponse.json(
            { error: `Miqdor ${MIN_DEPOSIT} dan ${MAX_DEPOSIT} Ƶ oralig'ida bo'lishi kerak` },
            { status: 400 }
        );
    }

    const profile = await prisma.userProfile.findUnique({
        where: { email: session.user.email },
    });
    if (!profile) {
        return NextResponse.json({ error: "Profile not found" }, { status: 404 });
    }

    // Hamyon yo'q bo'lsa yaratamiz
    let wallet = await prisma.zijWallet.findUnique({
        where: { profileId: profile.id },
    });
    if (!wallet) {
        wallet = await prisma.zijWallet.create({
            data: { profileId: profile.id },
        });
    }

    const newBalance = Number(wallet.balance) + amount;

    // Tranzaksiya yozamiz (atomic)
    const [updatedWallet, tx] = await prisma.$transaction([
        prisma.zijWallet.update({
            where: { id: wallet.id },
            data: { balance: newBalance },
        }),
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

    return NextResponse.json({
        balance: updatedWallet.balance,
        transaction: tx,
    });
}
