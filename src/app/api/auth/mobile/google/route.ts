// POST /api/auth/mobile/google — native ilova Google login.
// Body: { idToken }  (expo-auth-session native Google ID token).
// Google ID tokenni tekshiradi → UserProfile upsert (web signIn callback bilan bir xil)
// → AuthSession (jti=sid, origin:"mobile") → imzolangan mobil JWT qaytaradi.
//
// Env: GOOGLE_MOBILE_CLIENT_IDS — vergulli ro'yxat (Android/web/iOS OAuth client ID'lari);
// ID token `aud`'i shulardan biriga mos bo'lishi shart.

import { NextResponse } from "next/server";
import { headers } from "next/headers";
import crypto from "crypto";
import { OAuth2Client } from "google-auth-library";
import { prisma } from "@/lib/prisma";
import { mintMobileToken } from "@/lib/mobile-token";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function allowedClientIds(): string[] {
    return (process.env.GOOGLE_MOBILE_CLIENT_IDS ?? "")
        .split(",").map(s => s.trim()).filter(Boolean);
}

export async function POST(req: Request) {
    const ids = allowedClientIds();
    if (ids.length === 0) {
        return NextResponse.json({ error: "mobile_auth_not_configured" }, { status: 500 });
    }

    let idToken: string | undefined;
    try {
        const body = await req.json();
        idToken = typeof body?.idToken === "string" ? body.idToken : undefined;
    } catch {
        return NextResponse.json({ error: "invalid_body" }, { status: 400 });
    }
    if (!idToken) return NextResponse.json({ error: "missing_idToken" }, { status: 400 });

    // Google ID token tekshiruvi (audience = ruxsat etilgan client ID'lar)
    let email: string | null = null;
    let name: string | null = null;
    let picture: string | null = null;
    let googleSub: string | null = null;
    try {
        const client = new OAuth2Client();
        const ticket = await client.verifyIdToken({ idToken, audience: ids });
        const p = ticket.getPayload();
        if (!p?.email) return NextResponse.json({ error: "no_email" }, { status: 401 });
        // Tasdiqlanmagan email bilan mavjud (email-keyli) profilга ulanish/hijack oldini olish
        if (p.email_verified !== true) return NextResponse.json({ error: "email_not_verified" }, { status: 401 });
        email = p.email;
        name = p.name ?? null;
        picture = p.picture ?? null;
        googleSub = p.sub ?? null;
    } catch {
        return NextResponse.json({ error: "invalid_token" }, { status: 401 });
    }

    // UserProfile upsert — web signIn callback bilan bir xil
    const profile = await prisma.userProfile.upsert({
        where: { email },
        create: {
            email,
            googleId: googleSub,
            accountType: "GOOGLE",
            name,
            image: picture,
            emailVerified: true,
            level: 1,
            lastLoginAt: new Date(),
        },
        update: {
            googleId: googleSub ?? undefined,
            emailVerified: true,
            lastLoginAt: new Date(),
        },
        select: { id: true, humoId: true, username: true, name: true, image: true, onboardingDone: true },
    });
    // Rasm backfill (mavjud profil rasmi bo'lmasa) — signIn callback kabi
    if (picture && !profile.image) {
        await prisma.userProfile.update({ where: { id: profile.id }, data: { image: picture } }).catch(() => { });
    }
    // Login eventi (fail-safe)
    try {
        const h = await headers();
        const xff = h.get("x-forwarded-for");
        const ip = xff ? xff.split(",")[0].trim() : (h.get("x-real-ip") ?? null);
        await prisma.loginEvent.create({ data: { profileId: profile.id, ip, userAgent: h.get("user-agent") ?? null } });
    } catch { /* jim */ }

    // AuthSession (revocation parity) + token — FAIL-CLOSED: yozuv yaratilmasa token
    // BERILMAYDI. Aks holda isJtiRevoked fail-open bo'lgani uchun revoke qilib
    // bo'lmaydigan 1-yillik token chiqadi (logout updateMany 0 qator topadi).
    const sid = crypto.randomBytes(16).toString("hex");
    try {
        const h = await headers();
        await prisma.authSession.create({
            data: { jti: sid, profileId: profile.id, origin: "mobile", deviceHint: h.get("user-agent")?.slice(0, 200) ?? null },
        });
    } catch {
        return NextResponse.json({ error: "session_create_failed" }, { status: 500 });
    }

    const token = await mintMobileToken({
        profileId: profile.id, humoId: profile.humoId, email, jti: sid,
    });

    return NextResponse.json({
        token,
        profile: {
            id: profile.id, humoId: profile.humoId, username: profile.username,
            name: profile.name, image: profile.image ?? picture, onboardingDone: profile.onboardingDone,
        },
    });
}
