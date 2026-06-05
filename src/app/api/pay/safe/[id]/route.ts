import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// POST /api/pay/safe/[id] — seyfga pul tashlash yoki chiqarish
export async function POST(
    req: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email)
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id } = await params;
    const { action, amount } = await req.json(); // action: "deposit" | "withdraw"
    const zij = Number(amount);

    if (!zij || zij < 1)
        return NextResponse.json({ error: "Kamida 1 Ƶ" }, { status: 400 });

    const profile = await prisma.userProfile.findUnique({ where: { email: session.user.email } });
    if (!profile) return NextResponse.json({ error: "Profile not found" }, { status: 404 });

    const wallet = await prisma.zijWallet.findUnique({ where: { profileId: profile.id } });
    if (!wallet) return NextResponse.json({ error: "Wallet not found" }, { status: 404 });

    const safe = await prisma.zijSafe.findFirst({ where: { id, walletId: wallet.id } });
    if (!safe) return NextResponse.json({ error: "Seyf topilmadi" }, { status: 404 });

    if (action === "deposit") {
        // Hamyon → Seyf
        if (Number(wallet.balance) < zij)
            return NextResponse.json({ error: "Balans yetarli emas" }, { status: 400 });

        const newWalletBal = Number(wallet.balance) - zij;
        const newSafeBal   = Number(safe.balance) + zij;
        const isCompleted  = newSafeBal >= Number(safe.targetAmount);

        await prisma.$transaction([
            prisma.zijWallet.update({ where: { id: wallet.id }, data: { balance: newWalletBal } }),
            prisma.zijSafe.update({ where: { id: safe.id }, data: { balance: newSafeBal, isCompleted } }),
            prisma.zijTransaction.create({
                data: {
                    walletId: wallet.id,
                    type: "SAFE_IN",
                    amount: zij,
                    balanceAfter: newWalletBal,
                    description: `"${safe.name}" seyfi`,
                    ref: safe.id,
                },
            }),
        ]);

        return NextResponse.json({ walletBalance: newWalletBal, safeBalance: newSafeBal, isCompleted });
    }

    if (action === "withdraw") {
        // Seyf → Hamyon (faqat to'lgan seyf yoki ixtiyoriy)
        if (Number(safe.balance) < zij)
            return NextResponse.json({ error: "Seyf balansi yetarli emas" }, { status: 400 });

        const newWalletBal = Number(wallet.balance) + zij;
        const newSafeBal   = Number(safe.balance) - zij;

        await prisma.$transaction([
            prisma.zijWallet.update({ where: { id: wallet.id }, data: { balance: newWalletBal } }),
            prisma.zijSafe.update({ where: { id: safe.id }, data: { balance: newSafeBal, isCompleted: false } }),
            prisma.zijTransaction.create({
                data: {
                    walletId: wallet.id,
                    type: "SAFE_OUT",
                    amount: zij,
                    balanceAfter: newWalletBal,
                    description: `"${safe.name}" seyfidan`,
                    ref: safe.id,
                },
            }),
        ]);

        return NextResponse.json({ walletBalance: newWalletBal, safeBalance: newSafeBal });
    }

    return NextResponse.json({ error: "Noto'g'ri action" }, { status: 400 });
}
