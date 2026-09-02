// BN Reklama banner sotib olish + o'z bannerlar ro'yxati.
// POST /api/bn/ads → banner sotib olish (bo'sh slot avto-tanlanadi)
//   body: { imageUrl, title, ctaUrl, days: 1-30, shopSlug? }
// GET /api/bn/ads/mine → o'z bannerlar

import { NextResponse } from "next/server";
import { after } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireBnAuth } from "@/lib/bn-auth";
import { computeAdPrice } from "@/lib/bn-ad-pricing";
import { getOrCreateWalletTx } from "@/lib/wallet";
import { moderateContent } from "@/lib/ai-moderate";

export const dynamic = "force-dynamic";

const TOTAL_SLOTS = 5;

function isHttpUrl(s: string): boolean {
    try {
        const u = new URL(s);
        return u.protocol === "http:" || u.protocol === "https:";
    } catch { return false; }
}

export async function POST(req: Request) {
    const auth = await requireBnAuth();
    if (auth instanceof NextResponse) return auth;

    const body = await req.json().catch(() => ({}));
    const imageUrl = String(body?.imageUrl ?? "").trim();
    const title = String(body?.title ?? "").trim().slice(0, 80);
    const ctaUrl = String(body?.ctaUrl ?? "").trim();
    const days = Math.max(1, Math.min(30, Math.floor(Number(body?.days) || 1)));
    const shopSlug = body?.shopSlug ? String(body.shopSlug).trim() : null;

    if (!imageUrl || !isHttpUrl(imageUrl)) return NextResponse.json({ error: "invalid_image" }, { status: 400 });
    if (title.length < 3) return NextResponse.json({ error: "invalid_title" }, { status: 400 });
    if (!ctaUrl || !isHttpUrl(ctaUrl)) return NextResponse.json({ error: "invalid_url" }, { status: 400 });

    // Slot avto-tanlash: bo'sh (yoki eskirgan) slot
    const now = new Date();
    const activeBanners = await prisma.bnAdBanner.findMany({
        where: { active: true, hidden: false, startsAt: { lte: now }, expiresAt: { gt: now } },
        select: { slot: true },
    });
    const busy = new Set(activeBanners.map(b => b.slot));
    let freeSlot = 0;
    for (let s = 1; s <= TOTAL_SLOTS; s++) {
        if (!busy.has(s)) { freeSlot = s; break; }
    }
    if (freeSlot === 0) return NextResponse.json({ error: "all_slots_busy", tryLater: true }, { status: 409 });

    // Narxni hisoblash (live CBU kursi)
    const price = await computeAdPrice(days);
    const total = price.grossUzsTotal;

    // Atomik: Wallet dan yechish + banner yaratish
    try {
        const created = await prisma.$transaction(async (tx) => {
            const wallet = await getOrCreateWalletTx(tx, auth.profileId);
            if (Number(wallet.balance) < total) throw new Error("insufficient_balance");
            const newBal = Number(wallet.balance) - total;
            await tx.wallet.update({ where: { id: wallet.id }, data: { balance: newBal } });

            const expiresAt = new Date(Date.now() + days * 24 * 3600 * 1000);
            const banner = await tx.bnAdBanner.create({
                data: {
                    slot: freeSlot,
                    imageUrl,
                    title,
                    ctaUrl,
                    ownerId: auth.profileId,
                    shopSlug,
                    startsAt: new Date(),
                    expiresAt,
                    active: true,
                    daysCount: days,
                    netUsdPerDay: price.netUsdPerDay,
                    usdUzsRateSnap: price.usdUzsRate,
                    itParkAtPurchase: price.itPark,
                    paidAmountUzs: total,
                },
                select: { id: true, slot: true, expiresAt: true, imageUrl: true, title: true },
            });
            await tx.walletTransaction.create({
                data: {
                    walletId: wallet.id,
                    type: "PURCHASE",
                    amount: total,
                    currency: wallet.currency,
                    balanceAfter: newBal,
                    description: `BN reklama slot ${freeSlot} × ${days} kun (kurs ${price.usdUzsRate})`,
                    ref: `bn:ad:${banner.id}`,
                },
            });
            return banner;
        });

        // AI moderation — fon rejimda (javobni kechiktirmaydi)
        after(async () => {
            const verdict = await moderateContent({ kind: "ad", text: `${title}\n${ctaUrl}`, imageUrl }).catch(() => null);
            if (verdict?.verdict === "BLOCK" && (verdict.severity ?? 0) >= 0.7) {
                await prisma.bnAdBanner.update({
                    where: { id: created.id },
                    data: { hidden: true, moderationNote: verdict.reason ?? "policy_violation" },
                }).catch(() => null);
            }
        });

        return NextResponse.json({ ok: true, banner: created, priceSnapshot: price });
    } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : String(e);
        if (msg.includes("insufficient_balance")) return NextResponse.json({ error: "insufficient_balance" }, { status: 402 });
        return NextResponse.json({ error: "failed", detail: msg }, { status: 500 });
    }
}

export async function GET() {
    const auth = await requireBnAuth();
    if (auth instanceof NextResponse) return auth;

    const banners = await prisma.bnAdBanner.findMany({
        where: { ownerId: auth.profileId },
        orderBy: { createdAt: "desc" },
        select: {
            id: true, slot: true, imageUrl: true, title: true, ctaUrl: true,
            startsAt: true, expiresAt: true, active: true, hidden: true,
            daysCount: true, paidAmountUzs: true,
            impressions: true, clicks: true,
            moderationNote: true,
        },
    });
    const now = new Date();
    return NextResponse.json({
        banners: banners.map(b => ({
            ...b,
            startsAt: b.startsAt.toISOString(),
            expiresAt: b.expiresAt.toISOString(),
            isLive: b.active && !b.hidden && b.expiresAt > now && b.startsAt <= now,
        })),
    });
}
