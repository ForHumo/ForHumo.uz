// Click Shop API webhook — form-post protocol.
// MChJ + merchant registratsiyasi'dan keyin `CLICK_SECRET`ni env'ga qo'shing.
//
// Ikki bosqich:
//   1. Prepare  (action=0) — biz "ok" bersak Click to'lovni oldindan ushlaydi
//   2. Complete (action=1) — Click balansni allaqachon yechgan, biz to'ldirish yozamiz
//
// Signature: md5(click_trans_id + service_id + SECRET_KEY + merchant_trans_id + amount + action + sign_time)

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import crypto from "crypto";

export async function POST(req: Request) {
    const secret = process.env.CLICK_SECRET;
    if (!secret || !process.env.CLICK_MERCHANT_ID) {
        return NextResponse.json({ error: "Click not configured" }, { status: 501 });
    }

    const form = await req.formData();
    const clickTransId = String(form.get("click_trans_id") ?? "");
    const serviceId = String(form.get("service_id") ?? "");
    const merchantTransId = String(form.get("merchant_trans_id") ?? ""); // = profileId
    const amount = Number(form.get("amount") ?? 0);
    const action = Number(form.get("action") ?? -1);
    const signTime = String(form.get("sign_time") ?? "");
    const signString = String(form.get("sign_string") ?? "");

    // Signature tekshiruvi
    const expected = crypto.createHash("md5")
        .update(`${clickTransId}${serviceId}${secret}${merchantTransId}${amount}${action}${signTime}`)
        .digest("hex");
    if (expected !== signString) {
        return NextResponse.json({ error: -1, error_note: "SIGN CHECK FAILED!" });
    }

    // Profil topilishi
    const profile = await prisma.userProfile.findUnique({ where: { id: merchantTransId }, select: { id: true } });
    if (!profile) {
        return NextResponse.json({ error: -5, error_note: "User does not exist" });
    }
    const wallet = await prisma.wallet.findUnique({ where: { profileId: profile.id } });
    if (!wallet) {
        return NextResponse.json({ error: -5, error_note: "Wallet not found" });
    }

    if (action === 0) {
        // Prepare — order valid, ruxsat berish
        return NextResponse.json({
            click_trans_id: clickTransId, merchant_trans_id: merchantTransId,
            merchant_prepare_id: Date.now(), error: 0, error_note: "Success",
        });
    }

    if (action === 1) {
        // Complete — balansga qo'shish (idempotent)
        const existing = await prisma.walletTransaction.findFirst({ where: { walletId: wallet.id, ref: clickTransId } });
        if (!existing) {
            const newBalance = Number(wallet.balance) + amount;
            await prisma.$transaction([
                prisma.wallet.update({ where: { id: wallet.id }, data: { balance: newBalance } }),
                prisma.walletTransaction.create({
                    data: {
                        walletId: wallet.id, type: "DEPOSIT", amount, currency: wallet.currency,
                        balanceAfter: newBalance, description: "Click to'ldirish", ref: clickTransId,
                    },
                }),
            ]);
        }
        return NextResponse.json({
            click_trans_id: clickTransId, merchant_trans_id: merchantTransId,
            merchant_confirm_id: Date.now(), error: 0, error_note: "Success",
        });
    }

    return NextResponse.json({ error: -3, error_note: "Action not found" });
}
