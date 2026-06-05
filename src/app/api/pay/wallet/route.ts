import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// GET /api/pay/wallet — foydalanuvchi hamyonini olish (yoki yaratish)
export async function GET() {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const profile = await prisma.userProfile.findUnique({
        where: { email: session.user.email },
    });
    if (!profile) {
        return NextResponse.json({ error: "Profile not found" }, { status: 404 });
    }

    // Lazy init: hamyon yo'q bo'lsa yaratamiz
    let wallet = await prisma.zijWallet.findUnique({
        where: { profileId: profile.id },
        include: {
            transactions: {
                orderBy: { createdAt: "desc" },
                take: 20,
            },
        },
    });

    if (!wallet) {
        wallet = await prisma.zijWallet.create({
            data: { profileId: profile.id },
            include: {
                transactions: true,
            },
        });
    }

    return NextResponse.json({
        balance: wallet.balance,
        transactions: wallet.transactions,
    });
}
