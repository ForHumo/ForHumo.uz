// GET/POST/DELETE /api/nexus/e2e/keys — mening E2E kalitlarim.
//   GET    → { keys: [...] }
//   POST   { publicKey, keyAlgorithm?, deviceLabel? } — yangi kalit qo'shish
//   DELETE { keyId } — kalitni revoke qilish (bekor qilinmaydi — revokedAt yoziladi)

import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import crypto from "crypto";

async function me() {
    const s = await getServerSession(authOptions);
    if (!s?.user?.email) return null;
    return prisma.userProfile.findUnique({ where: { email: s.user.email }, select: { id: true } });
}

function fingerprintOf(publicKey: string): string {
    // SHA-256(publicKey) — foydalanuvchi visual verify qilishi uchun qisqartma
    const h = crypto.createHash("sha256");
    h.update(publicKey);
    return h.digest("hex").slice(0, 40); // 20 bayt hex
}

export async function GET() {
    const owner = await me();
    if (!owner) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const keys = await prisma.userE2eKey.findMany({
        where: { profileId: owner.id, revokedAt: null },
        orderBy: { createdAt: "desc" },
        select: { id: true, fingerprint: true, keyAlgorithm: true, deviceLabel: true, createdAt: true },
    });
    return NextResponse.json({ keys });
}

export async function POST(req: Request) {
    const owner = await me();
    if (!owner) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const body = await req.json().catch(() => ({}));
    const publicKey = String(body?.publicKey ?? "").trim();
    const keyAlgorithm = String(body?.keyAlgorithm ?? "ECDH-P256").slice(0, 32);
    const deviceLabel = typeof body?.deviceLabel === "string" ? body.deviceLabel.slice(0, 100) : null;
    if (!publicKey || publicKey.length < 20 || publicKey.length > 2000) {
        return NextResponse.json({ error: "publicKey noto'g'ri" }, { status: 400 });
    }
    const fp = fingerprintOf(publicKey);
    const created = await prisma.userE2eKey.create({
        data: {
            profileId: owner.id, publicKey, keyAlgorithm, fingerprint: fp, deviceLabel,
        },
    });
    return NextResponse.json({ ok: true, keyId: created.id, fingerprint: fp });
}

export async function DELETE(req: Request) {
    const owner = await me();
    if (!owner) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const body = await req.json().catch(() => ({}));
    const keyId = String(body?.keyId ?? "");
    if (!keyId) return NextResponse.json({ error: "keyId kerak" }, { status: 400 });
    await prisma.userE2eKey.updateMany({
        where: { id: keyId, profileId: owner.id, revokedAt: null },
        data: { revokedAt: new Date() },
    });
    return NextResponse.json({ ok: true });
}
