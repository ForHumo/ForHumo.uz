// BN Reklama (Boost) — sotuvchi mahsulotini yuqorida chiqarish uchun For Pay bilan to'laydi.
//
//   GET  /api/bn/seller/boost                              → mening boost'larim
//   POST /api/bn/seller/boost   body: { productId, days, dailyCost }
//     → For Pay hamyonidan totalBudget = days * dailyCost olinadi (atomik)
//     → BnAdBoost yaratiladi (ACTIVE)
//   DELETE /api/bn/seller/boost?id=…                        → boost'ni pauza (qaytarilmaydi)

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireBnAuth } from "@/lib/bn-auth";
import { getOrCreateWalletTx } from "@/lib/wallet";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const MIN_DAILY = 2000;      // Kunlik minimal 2 000 so'm
const MAX_DAYS = 30;

export async function GET() {
    const auth = await requireBnAuth();
    if (auth instanceof NextResponse) return auth;

    const boosts = await prisma.bnAdBoost.findMany({
        where: { ownerId: auth.profileId },
        orderBy: { createdAt: "desc" },
        take: 30,
        include: {
            product: { select: { slug: true, title: true, images: true, price: true } },
        },
    });

    return NextResponse.json({
        boosts: boosts.map(b => ({
            id: b.id,
            status: b.status,
            productId: b.productId,
            productTitle: b.product?.title ?? "",
            productSlug: b.product?.slug ?? "",
            productImage: b.product?.images?.[0] ?? null,
            totalBudget: b.totalBudget,
            dailyCost: b.dailyCost,
            spentEst: Math.min(
                b.totalBudget,
                Math.round(((Date.now() - b.startedAt.getTime()) / (24 * 60 * 60 * 1000)) * b.dailyCost),
            ),
            impressions: b.impressions,
            clicks: b.clicks,
            ctr: b.impressions > 0 ? Math.round((b.clicks / b.impressions) * 1000) / 10 : 0,
            startedAt: b.startedAt,
            expiresAt: b.expiresAt,
        })),
    });
}

export async function POST(req: Request) {
    const auth = await requireBnAuth();
    if (auth instanceof NextResponse) return auth;

    const body = await req.json().catch(() => ({}));
    const productId = String(body?.productId ?? "");
    const days = Math.max(1, Math.min(MAX_DAYS, Math.floor(Number(body?.days) || 0)));
    const dailyCost = Math.max(MIN_DAILY, Math.floor(Number(body?.dailyCost) || 0));

    if (!productId || days < 1) {
        return NextResponse.json({ error: "invalid_input" }, { status: 400 });
    }
    const totalBudget = days * dailyCost;

    // Mahsulot ega'sini tekshirish + oldingi aktiv boost bor-yo'qligini
    const product = await prisma.bnProduct.findUnique({
        where: { id: productId },
        select: {
            id: true, isActive: true, hidden: true,
            shop: { select: { profileId: true } },
        },
    });
    if (!product || product.shop?.profileId !== auth.profileId) {
        return NextResponse.json({ error: "not_your_product" }, { status: 403 });
    }
    if (!product.isActive || product.hidden) {
        return NextResponse.json({ error: "product_not_active" }, { status: 400 });
    }
    const existing = await prisma.bnAdBoost.findUnique({ where: { productId } });
    if (existing && existing.status === "ACTIVE") {
        return NextResponse.json({ error: "already_boosted" }, { status: 409 });
    }

    // For Pay dan totalBudget olish (atomik) va yangi boost yaratish
    try {
        const result = await prisma.$transaction(async tx => {
            const profile = await tx.userProfile.findUnique({
                where: { id: auth.profileId },
                select: { country: true },
            });
            if (!profile) return { ok: false as const, error: "profile_not_found" as const };

            const w = await getOrCreateWalletTx(tx, auth.profileId, profile.country);
            const balance = Number(w.balance);
            if (w.currency !== "UZS") return { ok: false as const, error: "currency_uzs_only" as const };
            if (balance < totalBudget) {
                return { ok: false as const, error: "insufficient_balance" as const, balance, required: totalBudget };
            }

            const ref = `bn:boost:${productId}:${Date.now()}`;
            const newBal = balance - totalBudget;
            await tx.wallet.update({ where: { id: w.id }, data: { balance: newBal } });
            await tx.walletTransaction.create({
                data: {
                    walletId: w.id,
                    type: "TRANSFER_OUT",
                    amount: totalBudget,
                    currency: "UZS",
                    balanceAfter: newBal,
                    description: `BN Boost: ${days} kun × ${new Intl.NumberFormat("uz-UZ").format(dailyCost)} so'm`,
                    ref,
                },
            });

            const now = new Date();
            const expiresAt = new Date(now.getTime() + days * 24 * 60 * 60 * 1000);
            // Awvalgi (ENDED yoki PAUSED) boost'ni yangilash yoki yangi
            const boost = existing
                ? await tx.bnAdBoost.update({
                    where: { productId },
                    data: {
                        ownerId: auth.profileId,
                        totalBudget, dailyCost, startedAt: now, expiresAt,
                        status: "ACTIVE", impressions: 0, clicks: 0, txRef: ref,
                    },
                })
                : await tx.bnAdBoost.create({
                    data: {
                        productId,
                        ownerId: auth.profileId,
                        totalBudget, dailyCost, startedAt: now, expiresAt,
                        status: "ACTIVE",
                        txRef: ref,
                    },
                });

            return { ok: true as const, boost, newBalance: newBal };
        });

        if (!result.ok) return NextResponse.json(result, { status: 400 });
        return NextResponse.json(result);
    } catch (e) {
        console.error("[bn boost create]", e);
        return NextResponse.json({ error: "internal" }, { status: 500 });
    }
}

export async function DELETE(req: Request) {
    const auth = await requireBnAuth();
    if (auth instanceof NextResponse) return auth;

    const url = new URL(req.url);
    const id = url.searchParams.get("id");
    if (!id) return NextResponse.json({ error: "id_required" }, { status: 400 });

    await prisma.bnAdBoost.updateMany({
        where: { id, ownerId: auth.profileId },
        data: { status: "PAUSED" },
    });
    return NextResponse.json({ ok: true });
}
