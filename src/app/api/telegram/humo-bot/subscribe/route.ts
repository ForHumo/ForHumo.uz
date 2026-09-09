// Humo AI Bot obuna — FAQAT For Pay hamyoni orqali (Payme/Click yo'q).
//
//   GET  /api/telegram/humo-bot/subscribe    → tariflar ro'yxati
//   POST /api/telegram/humo-bot/subscribe    body: { tier }
//     tier: basic | pro | enterprise | basic_yearly | pro_yearly | enterprise_yearly
//   → hamyondan pul chegiriladi (idempotent), obuna 30 yoki 365 kunga uzayadi.

import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getOrCreateWalletTx } from "@/lib/wallet";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

// Oylik narxlar (UZS) — hozircha test siffatida
const MONTHLY = {
    basic: 29_000,
    pro: 99_000,
    enterprise: 299_000,
} as const;

// Yillik chegirmalar
const YEARLY_DISCOUNT = {
    basic: 0.10,        // −10%
    pro: 0.15,          // −15%
    enterprise: 0.20,   // −20%
} as const;

// Oylik limitlar (xabar/oy)
const LIMITS = {
    free: 50,
    basic: 500,
    pro: 3_000,
    enterprise: 30_000,
} as const;

interface Plan { limit: number; priceUzs: number; days: number; base: keyof typeof MONTHLY | "free" }

function planFor(tier: string): Plan | null {
    if (tier === "free") return { limit: LIMITS.free, priceUzs: 0, days: 3650, base: "free" };
    if (tier in MONTHLY) {
        const t = tier as keyof typeof MONTHLY;
        return { limit: LIMITS[t], priceUzs: MONTHLY[t], days: 30, base: t };
    }
    if (tier.endsWith("_yearly")) {
        const base = tier.slice(0, -"_yearly".length) as keyof typeof MONTHLY;
        if (!(base in MONTHLY)) return null;
        const gross = MONTHLY[base] * 12;
        const discount = YEARLY_DISCOUNT[base];
        return {
            limit: LIMITS[base],
            priceUzs: Math.round((gross * (1 - discount)) / 1000) * 1000,   // eng yaqin 1000 so'mga
            days: 365,
            base,
        };
    }
    return null;
}

// For Humo daromadini oladigan hisob
const REVENUE_USERNAME = "abduvoris";
const REVENUE_HUMO_ID = "UZ6889574";

export async function GET() {
    const tiers = ["free", "basic", "pro", "enterprise", "basic_yearly", "pro_yearly", "enterprise_yearly"];
    return NextResponse.json({
        tiers: tiers.map(t => {
            const p = planFor(t)!;
            const monthlyEquivalent = t.endsWith("_yearly") ? Math.round(p.priceUzs / 12) : p.priceUzs;
            const savings = t.endsWith("_yearly")
                ? MONTHLY[p.base as keyof typeof MONTHLY] * 12 - p.priceUzs
                : 0;
            return {
                id: t,
                base: p.base,
                monthlyLimit: p.limit,
                priceUzs: p.priceUzs,
                monthlyEquivalent,
                days: p.days,
                yearly: t.endsWith("_yearly"),
                savings,
            };
        }),
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
    const tier = String(body?.tier ?? "");
    const plan = planFor(tier);
    if (!plan || tier === "free") return NextResponse.json({ error: "invalid_tier" }, { status: 400 });

    const priceUzs = plan.priceUzs;
    const isYearly = tier.endsWith("_yearly");

    try {
        const result = await prisma.$transaction(async tx => {
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

            const owner = await tx.userProfile.findFirst({
                where: { OR: [{ username: REVENUE_USERNAME }, { humoId: REVENUE_HUMO_ID }] },
                select: { id: true, country: true },
            });
            if (!owner) return { ok: false as const, error: "revenue_account_missing" as const };
            const ow = await getOrCreateWalletTx(tx, owner.id, owner.country);

            const ref = `humobot:sub:${profile.id}:${Date.now()}`;

            const newBuyerBal = balance - priceUzs;
            await tx.wallet.update({ where: { id: w.id }, data: { balance: newBuyerBal } });
            await tx.walletTransaction.create({
                data: {
                    walletId: w.id,
                    type: "TRANSFER_OUT",
                    amount: priceUzs,
                    currency: "UZS",
                    balanceAfter: newBuyerBal,
                    description: `Humo AI Bot ${tier.toUpperCase()} obuna (${plan.days} kun)`,
                    ref,
                },
            });

            const newOwnerBal = Number(ow.balance) + priceUzs;
            await tx.wallet.update({ where: { id: ow.id }, data: { balance: newOwnerBal } });
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

            const now = new Date();
            const expiresAt = new Date(now.getTime() + plan.days * 24 * 60 * 60 * 1000);
            const sub = await tx.humoBotSubscription.upsert({
                where: { profileId: profile.id },
                create: {
                    profileId: profile.id,
                    tier,
                    status: "active",
                    monthlyLimit: plan.limit,
                    usedThisMonth: 0,
                    billingCycle: isYearly ? "yearly" : "monthly",
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
                    billingCycle: isYearly ? "yearly" : "monthly",
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
