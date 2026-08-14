// 2FA disable — TOTP kod yoki zaxira kod bilan.
//   POST /api/user/2fa/disable   Body: { code: "123456" | "AAAA-BBBB-CCCC" }
// Muvaffaqiyat: totpEnabled=false, secret+backup codes tozalanadi.

import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { verifyTotp, verifyBackupCode } from "@/lib/totp";

export async function POST(req: Request) {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const code = String(body?.code || "").trim();
    if (!code) return NextResponse.json({ error: "Kod majburiy" }, { status: 400 });

    const me = await prisma.userProfile.findUnique({
        where: { email: session.user.email },
        select: { id: true, totpSecret: true, totpEnabled: true, totpBackupCodes: true },
    });
    if (!me) return NextResponse.json({ error: "Profil topilmadi" }, { status: 404 });
    if (!me.totpEnabled || !me.totpSecret) return NextResponse.json({ error: "2FA yoqilmagan" }, { status: 400 });

    const isTotpFormat = /^\d{6}$/.test(code.replace(/\s/g, ""));
    let verified = false;
    if (isTotpFormat) {
        verified = verifyTotp(me.totpSecret, code);
    } else {
        const list = Array.isArray(me.totpBackupCodes) ? (me.totpBackupCodes as string[]) : [];
        verified = verifyBackupCode(code, list).ok;
    }

    if (!verified) return NextResponse.json({ error: "Kod noto'g'ri" }, { status: 400 });

    await prisma.userProfile.update({
        where: { id: me.id },
        data:  {
            totpEnabled:     false,
            totpSecret:      null,
            totpEnabledAt:   null,
            totpBackupCodes: [],
        },
    });

    return NextResponse.json({ ok: true });
}
