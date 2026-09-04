// 2FA verify — setup jarayonida TOTP kodni tekshiradi va yoqadi.
// Muvaffaqiyatli bo'lsa: totpEnabled=true, zaxira kodlar yaratiladi (bir marta ko'rsatiladi).
//
//   POST /api/user/2fa/verify   Body: { code: "123456" }
//   → { ok: true, backupCodes: [...] }   (backupCodes faqat shu javobda ko'rsatiladi!)

import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { verifyTotp, generateBackupCodes, hashBackupCode } from "@/lib/totp";
import { getTotpSecret } from "@/lib/user-secrets";

export async function POST(req: Request) {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const code = String(body?.code || "").trim();
    if (!/^\d{6}$/.test(code)) return NextResponse.json({ error: "Kod 6 raqamdan iborat bo'lishi kerak" }, { status: 400 });

    const me = await prisma.userProfile.findUnique({
        where: { email: session.user.email },
        select: { id: true, totpEnabled: true },
    });
    if (!me) return NextResponse.json({ error: "Profil topilmadi" }, { status: 404 });
    const secret = await getTotpSecret(me.id);
    if (!secret) return NextResponse.json({ error: "Avval setup'ni ishga tushiring" }, { status: 400 });
    if (me.totpEnabled) return NextResponse.json({ error: "2FA allaqachon yoqilgan" }, { status: 400 });

    if (!verifyTotp(secret, code)) {
        return NextResponse.json({ error: "Kod noto'g'ri. Telefon soatingiz to'g'rimi?" }, { status: 400 });
    }

    const codes = generateBackupCodes(8);
    const hashed = codes.map(hashBackupCode);

    await prisma.userProfile.update({
        where: { id: me.id },
        data:  {
            totpEnabled:     true,
            totpEnabledAt:   new Date(),
            totpBackupCodes: hashed,
        },
    });

    return NextResponse.json({
        ok: true,
        backupCodes: codes,       // XATIRA: shu javobda oxirgi marta ko'rsatiladi. Foydalanuvchi saqlab qo'yishi shart.
    });
}
