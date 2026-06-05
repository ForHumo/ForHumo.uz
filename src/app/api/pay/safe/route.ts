import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

async function getWallet(email: string) {
    const profile = await prisma.userProfile.findUnique({ where: { email } });
    if (!profile) return null;
    let wallet = await prisma.zijWallet.findUnique({ where: { profileId: profile.id } });
    if (!wallet) wallet = await prisma.zijWallet.create({ data: { profileId: profile.id } });
    return wallet;
}

// GET — barcha seyflarni olish
export async function GET() {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email)
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const wallet = await getWallet(session.user.email);
    if (!wallet) return NextResponse.json({ error: "Wallet not found" }, { status: 404 });

    const safes = await prisma.zijSafe.findMany({
        where: { walletId: wallet.id },
        orderBy: { createdAt: "desc" },
    });
    return NextResponse.json({ safes });
}

// POST — yangi seyf yaratish
export async function POST(req: Request) {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email)
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { name, emoji, targetAmount } = await req.json();
    const target = Number(targetAmount);

    if (!name?.trim()) return NextResponse.json({ error: "Seyf nomi kerak" }, { status: 400 });
    if (!target || target < 1) return NextResponse.json({ error: "Maqsad summa kamida 1 Ƶ" }, { status: 400 });

    const wallet = await getWallet(session.user.email);
    if (!wallet) return NextResponse.json({ error: "Wallet not found" }, { status: 404 });

    const safe = await prisma.zijSafe.create({
        data: {
            walletId: wallet.id,
            name: name.trim(),
            emoji: emoji ?? "🏦",
            targetAmount: target,
        },
    });
    return NextResponse.json({ safe });
}
