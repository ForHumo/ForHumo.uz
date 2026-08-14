// Boshqa foydalanuvchining aktiv E2E public kalitini olish.
// Xabar shifrlash uchun ishlatiladi.
//
//   GET /api/user/e2e/keys/by-username/[username]
//   → { publicKey, fingerprint, keyAlgorithm, keyId } | { publicKey: null }
//
// Faqat authenticated foydalanuvchi so'ray oladi (spam/scanning oldini olish).

import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(_req: Request, { params }: { params: Promise<{ username: string }> }) {
    const { username } = await params;
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const target = await prisma.userProfile.findUnique({
        where: { username }, select: { id: true },
    });
    if (!target) return NextResponse.json({ publicKey: null });

    const key = await prisma.userE2eKey.findFirst({
        where: { profileId: target.id, revokedAt: null },
        orderBy: { createdAt: "desc" },
        select: { id: true, publicKey: true, fingerprint: true, keyAlgorithm: true, createdAt: true },
    });
    if (!key) return NextResponse.json({ publicKey: null });

    return NextResponse.json({
        keyId:        key.id,
        publicKey:    key.publicKey,
        fingerprint:  key.fingerprint,
        keyAlgorithm: key.keyAlgorithm,
        createdAt:    key.createdAt,
    });
}
