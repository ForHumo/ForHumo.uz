// 2FA setup — TOTP secret yaratadi (hali YOQILMAYDI, faqat pending).
// UI QR chizadi → foydalanuvchi authenticator app'ga qo'shadi → verify endpointida yoqadi.
//
//   POST /api/user/2fa/setup
//   → { secret, otpauth, alreadyEnabled }
//
// Xavfsizlik: 2FA yoqilgan bo'lsa qayta setup mumkin emas (avval disable qilinsin).

import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { generateSecretBase32, otpauthUri } from "@/lib/totp";

export async function POST() {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const me = await prisma.userProfile.findUnique({
        where: { email: session.user.email },
        select: { id: true, email: true, username: true, humoId: true, totpEnabled: true },
    });
    if (!me) return NextResponse.json({ error: "Profil topilmadi" }, { status: 404 });
    if (me.totpEnabled) return NextResponse.json({ error: "2FA allaqachon yoqilgan. Avval o'chirib, keyin qayta sozlang." }, { status: 400 });

    const secret = generateSecretBase32(20);
    // Faqat DB'ga saqlab qo'yamiz — verify muvaffaqiyatli bo'lsagina totpEnabled=true bo'ladi.
    await prisma.userProfile.update({
        where: { id: me.id },
        data:  { totpSecret: secret, totpEnabled: false },
    });

    const account = me.username || me.humoId || me.email || "user";
    const uri = otpauthUri({ secretBase32: secret, accountName: account, issuer: "ForHumo.uz" });

    return NextResponse.json({
        secret,           // foydalanuvchi qo'lda kiritishi uchun (agar QR ishlamasa)
        otpauth: uri,     // QR generatsiyasi uchun
        alreadyEnabled: false,
    });
}
