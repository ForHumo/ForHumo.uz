// Humo AI Bot obuna — FAQAT For Pay hamyoni orqali (Payme/Click yo'q).
//   POST /api/telegram/humo-bot/subscribe
//     body: { tier: "basic" | "pro" | "enterprise" }
//   → hamyondan pul chegiriladi (idempotent), obuna 30 kunga uzayadi.

import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getOrCreateWalletTx } from "@/lib/wallet";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

// Tarif rejalari (UZS)
const TIERS = {
    free: { limit: 50, priceUzs: 0 },
    basic: { limit: 500, priceUzs: 29_000 },
    pro: { limit: 3_000, priceUzs: 99_000 },
    enterprise: { limit: 30_000, priceUzs: 299_000 },
} as const;

type Tier = keyof typeof TIERS;

// For Humo daromadini oladigan hisob
const REVENUE_USERNAME = "abduvoris";
const REVENUE_HUMO_ID = "UZ6889574";

export async function GET() {
    return NextResponse.json({
        tiers: Object.entries(TIERS).map(([id, t]) => ({
            id,
            monthlyLimit: t.limit,
            priceUzs: t.priceUzs,
        })),
    });
}

export async function POST(req: Request) {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

    const profile = await prisma.userProfile.findUnique({
        where: { email: session.user.email },
        select: { id: true, country: true },
    });
    if (!profile) return NextResponse.json({ error: "profile_not_found" }, { status: 404 });

    const body = await req.json().catch(() => ({}));
    const tier = String(body?.tier ?? "") as Tier;
    if (!(tier in TIERS) || tier === "free") {
        return NextResponse.json({ error: "invalid_tier" }, { status: 400 });
    }

    const plan = TIERS[tier];
    const priceUzs = plan.priceUzs;

    try {
        const result = await prisma.$transaction(async tx => {
            // 1. Xaridor hamyoni
            const w = await getOrCreateWalletTx(tx, profile.id, profile.country);
            const balance = Number(w.balance);
            if (w.currency !== "UZS") {
                return { ok: false as const, error: "currency_uzs_only" as const };
            }
            if (balance < priceUzs) {
                return {
                    ok: false as const, error: "insufficient_balance" as const,
                    balance, required: priceUzs,
                };
            }

            // 2. Founder hamyoni (daromad)
            const owner = await tx.userProfile.findFirst({
                where: { OR: [{ username: REVENUE_USERNAME }, { humoId: REVENUE_HUMO_ID }] },
                select: { id: true, country: true },
            });
            if (!owner) return { ok: false as const, error: "revenue_account_missing" as const };
            const ow = await getOrCreateWalletTx(tx, owner.id, owner.country);

            // 3. Idempotency ref (bir soniyada faqat 1 marta)
            const ref = `humobot:sub:${profile.id}:${Date.now()}`;

            // 4. Xaridordan chegirish
            const newBuyerBal = balance - priceUzs;
            await tx.wallet.update({
                where: { id: w.id },
                data: { balance: newBuyerBal },
            });
            await tx.walletTransaction.create({
                data: {
                    walletId: w.id,
                    type: "TRANSFER_OUT",
                    amount: priceUzs,
                    currency: "UZS",
                    balanceAfter: newBuyerBal,
                    description: `Humo AI Bot ${tier.toUpperCase()} obuna (30 kun)`,
                    ref,
                },
            });

            // 5. Founder ga tushirish
            const newOwnerBal = Number(ow.balance) + priceUzs;
            await tx.wallet.update({
                where: { id: ow.id },
                data: { balance: newOwnerBal },
            });
            await tx.walletTransaction.create({
                data: {
                    walletId: ow.id,
                    type: "SALE",
                    amount: priceUzs,
                    currency: "UZS",
                    balanceAfter: newOwnerBal,
                    description: `Humo AI Bot ${tier.toUpperCase()} obuna daromadi`,
                    ref: `${ref}:in`,
                },
            });

            // 6. Obunani yangilash
            const now = new Date();
            const expiresAt = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
            const sub = await tx.humoBotSubscription.upsert({
                where: { profileId: profile.id },
                create: {
                    profileId: profile.id,
                    tier,
                    status: "active",
                    monthlyLimit: plan.limit,
                    usedThisMonth: 0,   // yangi davrda 0 dan
                    billingCycle: "monthly",
                    priceUzs,
                    startedAt: now,
                    expiresAt,
                    lastPayTxRef: ref,
                },
                update: {
                    tier,
                    status: "active",
                    monthlyLimit: plan.limit,
                    usedThisMonth: 0,
                    priceUzs,
                    expiresAt,
                    cancelledAt: null,
                    lastPayTxRef: ref,
                },
            });

            return { ok: true as const, subscription: sub, newBalance: newBuyerBal };
        });

        if (!result.ok) return NextResponse.json(result, { status: 400 });
        return NextResponse.json(result);
    } catch (e) {
        console.error("[humo-bot subscribe]", e);
        return NextResponse.json({ error: "internal" }, { status: 500 });
    }
}
