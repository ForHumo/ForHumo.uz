// 2FA sign-in challenge — Google OAuth'dan keyin qo'shimcha bosqich.
//   POST /api/user/2fa/challenge   Body: { code }
//   Success: HttpOnly cookie "fh_2fa_ok" qo'yiladi (30 kun).
//
// GET — joriy holat: enabled, verified (cookie mavjudmi va yaroqli).

import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { cookies } from "next/headers";
import { verifyTotp, verifyBackupCode, hashBackupCode } from "@/lib/totp";
import { sign2faToken, verify2faToken, TWO_FA_COOKIE_NAME, TWO_FA_COOKIE_TTL_SEC } from "@/lib/2fa-cookie";
import { getTotpSecret } from "@/lib/user-secrets";

export async function GET() {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) return NextResponse.json({ enabled: false, verified: false });

    const me = await prisma.userProfile.findUnique({
        where: { email: session.user.email },
        select: { id: true, totpEnabled: true },
    });
    if (!me) return NextResponse.json({ enabled: false, verified: false });

    const cookieStore = await cookies();
    const token = cookieStore.get(TWO_FA_COOKIE_NAME)?.value;
    const verified = me.totpEnabled ? verify2faToken(token, me.id) : true;
    return NextResponse.json({ enabled: me.totpEnabled, verified });
}

export async function POST(req: Request) {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const code = String(body?.code || "").trim();
    if (!code) return NextResponse.json({ error: "Kod majburiy" }, { status: 400 });

    const me = await prisma.userProfile.findUnique({
        where: { email: session.user.email },
        select: { id: true, totpEnabled: true, totpBackupCodes: true },
    });
    if (!me) return NextResponse.json({ error: "Profil topilmadi" }, { status: 404 });
    const secret = await getTotpSecret(me.id);
    if (!me.totpEnabled || !secret) return NextResponse.json({ error: "2FA yoqilmagan" }, { status: 400 });

    const isTotpFormat = /^\d{6}$/.test(code.replace(/\s/g, ""));
    let verified = false;
    let usedBackupHash: string | undefined;

    if (isTotpFormat) {
        verified = verifyTotp(secret, code);
    } else {
        const list = Array.isArray(me.totpBackupCodes) ? (me.totpBackupCodes as string[]) : [];
        const r = verifyBackupCode(code, list);
        verified = r.ok;
        usedBackupHash = r.usedHash;
    }

    if (!verified) return NextResponse.json({ error: "Kod noto'g'ri" }, { status: 400 });

    // Ishlatilgan zaxira kodni ro'yxatdan chiqarish (bir marta ishlaydi)
    if (usedBackupHash) {
        const list = (me.totpBackupCodes as string[]) || [];
        const filtered = list.filter(h => h !== usedBackupHash);
        await prisma.userProfile.update({
            where: { id: me.id },
            data:  { totpBackupCodes: filtered },
        });
    }

    const token = sign2faToken(me.id);
    const cookieStore = await cookies();
    cookieStore.set(TWO_FA_COOKIE_NAME, token, {
        httpOnly: true,
        secure:   process.env.NODE_ENV === "production",
        sameSite: "lax",
        path:     "/",
        maxAge:   TWO_FA_COOKIE_TTL_SEC,
    });

    return NextResponse.json({
        ok: true,
        backupUsed: !!usedBackupHash,
        remainingBackupCodes: usedBackupHash
            ? ((me.totpBackupCodes as string[])?.length ?? 1) - 1
            : ((me.totpBackupCodes as string[])?.length ?? 0),
    });
}
