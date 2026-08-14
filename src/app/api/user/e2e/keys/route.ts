// E2E kalitlarni boshqarish (o'zim).
//   GET   /api/user/e2e/keys                                    → { keys: [{id, publicKey, fingerprint, createdAt, revokedAt, deviceLabel}] }
//   POST  /api/user/e2e/keys   Body: { publicKey, fingerprint }  → yangi kalit yaratadi, mavjud aktivlarni revoke qiladi
//
// Xavfsizlik:
//   - publicKey SPKI base64 (Web Crypto exportKey formati)
//   - fingerprint client tomon hisoblanadi (server yana tekshirmaydi — konkret barmoq
//     izini foydalanuvchi ko'rishi uchun UI'ga qulaylik)
//   - Yangi kalit yuklanganda oldingi aktivlar revokedAt olinadi (bir vaqtda 1 ta aktiv)

import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { headers } from "next/headers";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const me = await prisma.userProfile.findUnique({
        where: { email: session.user.email }, select: { id: true },
    });
    if (!me) return NextResponse.json({ error: "Profil topilmadi" }, { status: 404 });

    const keys = await prisma.userE2eKey.findMany({
        where: { profileId: me.id },
        orderBy: { createdAt: "desc" },
        select: { id: true, publicKey: true, fingerprint: true, keyAlgorithm: true, deviceLabel: true, createdAt: true, revokedAt: true },
    });
    return NextResponse.json({ keys });
}

export async function POST(req: Request) {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const me = await prisma.userProfile.findUnique({
        where: { email: session.user.email }, select: { id: true },
    });
    if (!me) return NextResponse.json({ error: "Profil topilmadi" }, { status: 404 });

    const body = await req.json().catch(() => ({}));
    const publicKey = String(body?.publicKey || "").trim();
    const fingerprint = String(body?.fingerprint || "").trim();
    const algo = String(body?.keyAlgorithm || "ECDH-P256").trim();

    if (!publicKey || publicKey.length > 800) return NextResponse.json({ error: "publicKey noto'g'ri" }, { status: 400 });
    if (!fingerprint || fingerprint.length > 64) return NextResponse.json({ error: "fingerprint noto'g'ri" }, { status: 400 });
    if (!/^[A-Za-z0-9+/=]+$/.test(publicKey)) return NextResponse.json({ error: "publicKey base64 emas" }, { status: 400 });

    // Qurilma yorlig'i — headerdan
    const h = await headers();
    const ua = h.get("user-agent") || "";
    const os = ua.match(/Windows|Mac OS|Linux|Android|iPhone|iPad/i)?.[0] ?? null;
    const browser = ua.match(/Edg|Chrome|Firefox|Safari/i)?.[0] ?? null;
    const deviceLabel = browser && os ? `${browser} · ${os}` : browser || os || null;

    // Atomik: yangi yaratamiz + eski aktivlarni revoke
    const created = await prisma.$transaction(async tx => {
        await tx.userE2eKey.updateMany({
            where: { profileId: me.id, revokedAt: null },
            data:  { revokedAt: new Date() },
        });
        return tx.userE2eKey.create({
            data: { profileId: me.id, publicKey, fingerprint, keyAlgorithm: algo, deviceLabel },
            select: { id: true, publicKey: true, fingerprint: true, keyAlgorithm: true, deviceLabel: true, createdAt: true, revokedAt: true },
        });
    });

    return NextResponse.json({ key: created });
}
