// QR login consume — desktop (anonim) status APPROVED bo'lganda chaqiradi.
// Server NextAuth JWT session cookie'sini yaratib qaytaradi → desktop reload → login.
//
//   POST /api/auth/qr/[code]/consume
//   → { ok: true }   (Set-Cookie: next-auth.session-token=...)
//
// Xavfsizlik:
//   - Faqat APPROVED holatida
//   - Bir marta ishlatiladi (CONSUMED bo'ladi)
//   - Cookie NextAuth Google login berganidek to'liq JWT (jwt-encode)

import { NextResponse } from "next/server";
import { encode } from "next-auth/jwt";
import { prisma } from "@/lib/prisma";

const SESSION_MAX_AGE_SEC = 30 * 24 * 60 * 60;   // 30 kun (NextAuth default)

export async function POST(_req: Request, { params }: { params: Promise<{ code: string }> }) {
    const { code } = await params;

    const r = await prisma.authQrRequest.findUnique({ where: { code } });
    if (!r) return NextResponse.json({ error: "So'rov topilmadi" }, { status: 404 });
    if (r.status === "CONSUMED") return NextResponse.json({ error: "Allaqachon ishlatilgan" }, { status: 400 });
    if (r.status !== "APPROVED") return NextResponse.json({ error: `Holat: ${r.status}` }, { status: 400 });
    if (r.expiresAt.getTime() < Date.now()) {
        await prisma.authQrRequest.update({ where: { code }, data: { status: "EXPIRED" } });
        return NextResponse.json({ error: "Muddati o'tgan" }, { status: 400 });
    }
    if (!r.approvedProfileId) return NextResponse.json({ error: "Tasdiqlovchi topilmadi" }, { status: 500 });

    const me = await prisma.userProfile.findUnique({
        where: { id: r.approvedProfileId },
        select: {
            id: true, email: true, name: true, image: true, googleId: true,
            humoId: true, username: true, coverImage: true, onboardingDone: true,
        },
    });
    if (!me || !me.email) return NextResponse.json({ error: "Profil topilmadi" }, { status: 404 });

    // NextAuth JWT payload — auth.ts callbacks'da yozilgan maydonlar bilan mos
    const now = Math.floor(Date.now() / 1000);
    const secret = process.env.NEXTAUTH_SECRET;
    if (!secret) return NextResponse.json({ error: "Server sozlanmagan" }, { status: 500 });

    const token = await encode({
        secret,
        maxAge: SESSION_MAX_AGE_SEC,
        token: {
            // NextAuth standart maydonlar
            sub:     me.googleId ?? me.id,   // NextAuth `session.user.id` shu yerdan oladi
            email:   me.email,
            name:    me.name ?? undefined,
            picture: me.image ?? undefined,
            iat:     now,
            // Loyihaga xos JWT maydonlar (auth.ts jwt callback'da yoziladi)
            profileId:      me.id,
            humoId:         me.humoId,
            username:       me.username,
            coverImage:     me.coverImage,
            onboardingDone: me.onboardingDone,
        },
    });

    // CONSUMED belgilash
    await prisma.authQrRequest.update({
        where: { code }, data: { status: "CONSUMED", consumedAt: new Date() },
    });

    const isProd = process.env.NODE_ENV === "production";
    const cookieName = isProd ? "__Secure-next-auth.session-token" : "next-auth.session-token";

    const res = NextResponse.json({ ok: true });
    res.cookies.set(cookieName, token, {
        httpOnly: true,
        secure:   isProd,
        sameSite: "lax",
        path:     "/",
        maxAge:   SESSION_MAX_AGE_SEC,
    });
    return res;
}
