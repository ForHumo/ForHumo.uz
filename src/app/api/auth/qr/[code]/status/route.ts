// QR login status polling — desktop tomonidan har 2 sekundda chaqiriladi.
//   GET /api/auth/qr/[code]/status
//   → { status: "PENDING" | "APPROVED" | "CONSUMED" | "EXPIRED" | "NOT_FOUND", expiresAt? }

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(_req: Request, { params }: { params: Promise<{ code: string }> }) {
    const { code } = await params;
    if (!code || code.length !== 12) return NextResponse.json({ status: "NOT_FOUND" }, { status: 404 });

    const r = await prisma.authQrRequest.findUnique({
        where: { code }, select: { status: true, expiresAt: true, consumedAt: true },
    });
    if (!r) return NextResponse.json({ status: "NOT_FOUND" }, { status: 404 });

    // Muddati o'tgan bo'lsa avto-EXPIRED (agar hali PENDING/APPROVED bo'lsa)
    if (r.status !== "CONSUMED" && r.expiresAt.getTime() < Date.now()) {
        await prisma.authQrRequest.update({ where: { code }, data: { status: "EXPIRED" } });
        return NextResponse.json({ status: "EXPIRED" });
    }

    return NextResponse.json({
        status:    r.status,
        expiresAt: r.expiresAt.toISOString(),
    });
}
