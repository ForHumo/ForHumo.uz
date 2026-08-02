// Stripe webhook — checkout.session.completed hodisasi.
// Env: STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET
// Stripe imzosini raw body ustidan tekshiradi.

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import crypto from "crypto";

// Stripe imzo tekshiruvi: t=<ts>,v1=<sig>
function verifyStripeSignature(payload: string, sigHeader: string, secret: string): boolean {
    const parts = sigHeader.split(",").reduce<Record<string, string>>((acc, p) => {
        const [k, v] = p.split("=");
        if (k && v) acc[k.trim()] = v.trim();
        return acc;
    }, {});
    const ts = parts.t;
    const sig = parts.v1;
    if (!ts || !sig) return false;
    const signed = `${ts}.${payload}`;
    const expected = crypto.createHmac("sha256", secret).update(signed).digest("hex");
    // timingSafeEqual bo'yicha taqqoslash
    if (expected.length !== sig.length) return false;
    return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(sig));
}

export async function POST(req: Request) {
    const secret = process.env.STRIPE_WEBHOOK_SECRET;
    if (!process.env.STRIPE_SECRET_KEY || !secret) {
        return NextResponse.json({ error: "Stripe not configured" }, { status: 501 });
    }

    const sigHeader = req.headers.get("stripe-signature");
    if (!sigHeader) return NextResponse.json({ error: "Missing signature" }, { status: 400 });

    const payload = await req.text();
    if (!verifyStripeSignature(payload, sigHeader, secret)) {
        return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
    }

    const event = JSON.parse(payload);
    if (event.type !== "checkout.session.completed") {
        return NextResponse.json({ received: true, ignored: event.type });
    }

    const session = event.data?.object;
    const profileId = session?.metadata?.profileId;
    const amountUsd = Number(session?.amount_total ?? 0) / 100;
    const sessionId = String(session?.id ?? "");

    if (!profileId || !amountUsd) {
        return NextResponse.json({ error: "Invalid session data" }, { status: 400 });
    }

    const wallet = await prisma.wallet.findUnique({ where: { profileId } });
    if (!wallet) return NextResponse.json({ error: "Wallet not found" }, { status: 404 });

    // Idempotent (unique constraint bilan race-safe)
    try {
        const newBalance = Number(wallet.balance) + amountUsd;
        await prisma.$transaction([
            prisma.walletTransaction.create({
                data: {
                    walletId: wallet.id, type: "DEPOSIT", amount: amountUsd, currency: wallet.currency,
                    balanceAfter: newBalance, description: "Stripe to'ldirish", ref: sessionId,
                },
            }),
            prisma.wallet.update({ where: { id: wallet.id }, data: { balance: newBalance } }),
        ]);
    } catch (e) {
        const code = (e as { code?: string }).code;
        if (code !== "P2002") throw e;
        return NextResponse.json({ received: true, duplicate: true });
    }

    return NextResponse.json({ received: true });
}
