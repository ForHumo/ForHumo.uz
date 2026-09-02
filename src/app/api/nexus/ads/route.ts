// Nexus reklama sotib olish + o'z reklamalar ro'yxati.
// POST /api/nexus/ads → { imageUrl, title, body?, ctaUrl, ctaText?, days: 1-30 }
// GET → mine list

import { NextResponse, after } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { computeAdPrice } from "@/lib/bn-ad-pricing";
import { getOrCreateWalletTx } from "@/lib/wallet";
import { moderateContent } from "@/lib/ai-moderate";

export const dynamic = "force-dynamic";

const TOTAL_SLOTS = 3;

function isHttpUrl(s: string): boolean {
    try {
        const u = new URL(s);
        return u.protocol === "http:" || u.protocol === "https:";
    } catch { return false; }
}

async function requireAuth() {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) return null;
    const profile = await prisma.userProfile.findUnique({
        where: { email: session.user.email },
        select: { id: true, username: true, image: true },
    });
    return profile;
}

export async function POST(req: Request) {
    const profile = await requireAuth();
    if (!profile) return NextResponse.json({ error: "auth_required" }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const imageUrl = String(body?.imageUrl ?? "").trim();
    const title = String(body?.title ?? "").trim().slice(0, 100);
    const bodyText = body?.body ? String(body.body).trim().slice(0, 280) : null;
    const ctaUrl = String(body?.ctaUrl ?? "").trim();
    const ctaText = String(body?.ctaText ?? "Batafsil").trim().slice(0, 40);
    const days = Math.max(1, Math.min(30, Math.floor(Number(body?.days) || 1)));

    if (!imageUrl || !isHttpUrl(imageUrl)) return NextResponse.json({ error: "invalid_image" }, { status: 400 });
    if (title.length < 3) return NextResponse.json({ error: "invalid_title" }, { status: 400 });
    if (!ctaUrl || !isHttpUrl(ctaUrl)) return NextResponse.json({ error: "invalid_url" }, { status: 400 });

    // Bo'sh slot avto-tanlash
    const now = new Date();
    const activeSlots = await prisma.nexusAdSlot.findMany({
        where: { active: true, hidden: false, startsAt: { lte: now }, expiresAt: { gt: now } },
        select: { slot: true },
    });
    const busy = new Set(activeSlots.map(s => s.slot));
    let freeSlot = 0;
    for (let s = 1; s <= TOTAL_SLOTS; s++) if (!busy.has(s)) { freeSlot = s; break; }
    if (freeSlot === 0) return NextResponse.json({ error: "all_slots_busy" }, { status: 409 });

    const price = await computeAdPrice(days);
    const total = price.grossUzsTotal;

    try {
        const created = await prisma.$transaction(async (tx) => {
            const wallet = await getOrCreateWalletTx(tx, profile.id);
            if (Number(wallet.balance) < total) throw new Error("insufficient_balance");
            const newBal = Number(wallet.balance) - total;
            await tx.wallet.update({ where: { id: wallet.id }, data: { balance: newBal } });

            const expiresAt = new Date(Date.now() + days * 24 * 3600 * 1000);
            const ad = await tx.nexusAdSlot.create({
                data: {
                    slot: freeSlot,
                    imageUrl, title, body: bodyText, ctaUrl, ctaText,
                    ownerId: profile.id,
                    ownerUsername: profile.username,
                    ownerAvatar: profile.image,
                    startsAt: new Date(),
                    expiresAt,
                    active: true,
                    daysCount: days,
                    netUsdPerDay: price.netUsdPerDay,
                    usdUzsRateSnap: price.usdUzsRate,
                    itParkAtPurchase: price.itPark,
                    paidAmountUzs: total,
                },
                select: { id: true, slot: true, expiresAt: true, title: true },
            });
            await tx.walletTransaction.create({
                data: {
                    walletId: wallet.id,
                    type: "PURCHASE",
                    amount: total,
                    currency: wallet.currency,
                    balanceAfter: newBal,
                    description: `Nexus reklama slot ${freeSlot} × ${days} kun`,
                    ref: `nx:ad:${ad.id}`,
                },
            });
            return ad;
        });

        after(async () => {
            const verdict = await moderateContent({ kind: "ad", text: `${title}\n${bodyText ?? ""}\n${ctaUrl}`, imageUrl }).catch(() => null);
            if (verdict?.verdict === "BLOCK" && (verdict.severity ?? 0) >= 0.7) {
                await prisma.nexusAdSlot.update({
                    where: { id: created.id },
                    data: { hidden: true, moderationNote: verdict.reason ?? "policy_violation" },
                }).catch(() => null);
            }
        });

        return NextResponse.json({ ok: true, ad: created, priceSnapshot: price });
    } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : String(e);
        if (msg.includes("insufficient_balance")) return NextResponse.json({ error: "insufficient_balance" }, { status: 402 });
        return NextResponse.json({ error: "failed", detail: msg }, { status: 500 });
    }
}

export async function GET() {
    const profile = await requireAuth();
    if (!profile) return NextResponse.json({ error: "auth_required" }, { status: 401 });

    const ads = await prisma.nexusAdSlot.findMany({
        where: { ownerId: profile.id },
        orderBy: { createdAt: "desc" },
    });
    const now = new Date();
    return NextResponse.json({
        ads: ads.map(a => ({
            ...a,
            startsAt: a.startsAt.toISOString(),
            expiresAt: a.expiresAt.toISOString(),
            createdAt: a.createdAt.toISOString(),
            updatedAt: a.updatedAt.toISOString(),
            isLive: a.active && !a.hidden && a.expiresAt > now && a.startsAt <= now,
        })),
    });
}
