// QR login boshlash — desktop anonim tomonidan chaqiriladi.
//   POST /api/auth/qr/start   Body: {} (bo'sh)
//   → { code, url, expiresAt }
//
// Rate-limit: bir IP dan 30 so'rov / 10 daqiqa (in-memory).

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import crypto from "crypto";

const TTL_MS = 3 * 60 * 1000;   // 3 daq
const CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";   // O, 0, 1, I chiqarilgan

function makeCode(): string {
    const buf = crypto.randomBytes(12);
    let out = "";
    for (const b of buf) out += CODE_ALPHABET[b % CODE_ALPHABET.length];
    return out;
}

// In-memory IP rate limit
const ipHits = new Map<string, { count: number; resetAt: number }>();
function limited(ip: string, max = 30, windowMs = 10 * 60 * 1000): boolean {
    const now = Date.now();
    const rec = ipHits.get(ip);
    if (!rec || rec.resetAt < now) { ipHits.set(ip, { count: 1, resetAt: now + windowMs }); return false; }
    rec.count++;
    return rec.count > max;
}

export async function POST(req: Request) {
    const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
    if (limited(ip)) return NextResponse.json({ error: "Juda ko'p urinish" }, { status: 429 });

    const ua = req.headers.get("user-agent") || "";
    // UA'dan qisqa qismini olamiz (browser + OS)
    const uaSnip = ua.slice(0, 200);

    const code = makeCode();
    const expiresAt = new Date(Date.now() + TTL_MS);
    await prisma.authQrRequest.create({
        data: { code, deviceHint: uaSnip, ipHint: ip, expiresAt },
    });

    // Xotira o'sishini oldini olish
    if (ipHits.size > 5000) {
        const now = Date.now();
        for (const [k, v] of ipHits) if (v.resetAt < now) ipHits.delete(k);
    }

    return NextResponse.json({
        code,
        url:       `/nexus/qr/${code}`,      // absolyut manzil client tomon prefiks bilan qo'yiladi
        expiresAt: expiresAt.toISOString(),
    });
}
