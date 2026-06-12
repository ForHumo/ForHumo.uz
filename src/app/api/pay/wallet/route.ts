import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { currencyForCountry } from "@/lib/money";

// GET /api/pay/wallet — foydalanuvchi hamyonini olish (yoki yaratish)
export async function GET() {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const profile = await prisma.userProfile.findUnique({
        where: { email: session.user.email },
        select: { id: true, country: true },
    });
    if (!profile) {
        return NextResponse.json({ error: "Profile not found" }, { status: 404 });
    }

    // Lazy init: hamyon yo'q bo'lsa yaratamiz (valyuta davlatdan)
    let wallet = await prisma.zijWallet.findUnique({
        where: { profileId: profile.id },
        include: {
            transactions: { orderBy: { createdAt: "desc" }, take: 50 },
            safes: { orderBy: { createdAt: "desc" } },
        },
    });

    if (!wallet) {
        wallet = await prisma.zijWallet.create({
            data: { profileId: profile.id, currency: currencyForCountry(profile.country) },
            include: { transactions: true, safes: true },
        });
    }

    return NextResponse.json({
        balance: wallet.balance,
        currency: wallet.currency,
        transactions: wallet.transactions,
        safes: wallet.safes,
    });
}
