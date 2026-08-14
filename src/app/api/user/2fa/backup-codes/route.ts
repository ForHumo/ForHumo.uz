// Zaxira kodlarni qayta yaratish (avvalgilarini bekor qiladi).
//   POST /api/user/2fa/backup-codes   Body: { code: "123456" }   (joriy TOTP kod bilan)
//   → { backupCodes: [...] }
//
//   GET  /api/user/2fa/backup-codes   → { enabled, count, generatedAt }

import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { verifyTotp, generateBackupCodes, hashBackupCode } from "@/lib/totp";

export async function GET() {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const me = await prisma.userProfile.findUnique({
        where: { email: session.user.email },
        select: { totpEnabled: true, totpEnabledAt: true, totpBackupCodes: true },
    });
    if (!me) return NextResponse.json({ error: "Profil topilmadi" }, { status: 404 });

    const list = Array.isArray(me.totpBackupCodes) ? (me.totpBackupCodes as string[]) : [];
    return NextResponse.json({
        enabled: me.totpEnabled,
        count: list.length,
        generatedAt: me.totpEnabledAt,
    });
}

export async function POST(req: Request) {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const code = String(body?.code || "").trim();
    if (!/^\d{6}$/.test(code.replace(/\s/g, ""))) return NextResponse.json({ error: "TOTP kod majburiy" }, { status: 400 });

    const me = await prisma.userProfile.findUnique({
        where: { email: session.user.email },
        select: { id: true, totpEnabled: true, totpSecret: true },
    });
    if (!me) return NextResponse.json({ error: "Profil topilmadi" }, { status: 404 });
    if (!me.totpEnabled || !me.totpSecret) return NextResponse.json({ error: "2FA yoqilmagan" }, { status: 400 });

    if (!verifyTotp(me.totpSecret, code)) return NextResponse.json({ error: "Kod noto'g'ri" }, { status: 400 });

    const codes = generateBackupCodes(8);
    const hashed = codes.map(hashBackupCode);

    await prisma.userProfile.update({
        where: { id: me.id },
        data:  { totpBackupCodes: hashed },
    });

    return NextResponse.json({ backupCodes: codes });
}
