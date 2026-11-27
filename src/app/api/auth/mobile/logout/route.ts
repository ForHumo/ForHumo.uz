// POST /api/auth/mobile/logout — joriy mobil sessiyani bekor qiladi (jti revoke).
// Bearer tokendan sid olinadi; AuthSession.revokedAt qo'yiladi + cache invalidatsiya.
// Idempotent: token yaroqsiz bo'lsa ham { ok: true }.

import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { prisma } from "@/lib/prisma";
import { verifyMobileToken } from "@/lib/mobile-token";
import { invalidateJti } from "@/lib/auth-session-cache";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST() {
    try {
        const h = await headers();
        const auth = h.get("authorization") ?? "";
        const m = auth.match(/^Bearer\s+(.+)$/i);
        if (m) {
            const payload = await verifyMobileToken(m[1].trim());
            if (payload) {
                await prisma.authSession.updateMany({
                    where: { jti: payload.jti, revokedAt: null },
                    data: { revokedAt: new Date() },
                });
                invalidateJti(payload.jti);
            }
        }
    } catch { /* jim — logout idempotent */ }
    return NextResponse.json({ ok: true });
}
