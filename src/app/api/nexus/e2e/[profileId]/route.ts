// GET /api/nexus/e2e/[profileId] — foydalanuvchining faol E2E kalitlari (fingerprint verify uchun).
// UserE2eKey mavjud modeldan foydalanadi.

import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(_req: Request, { params }: { params: Promise<{ profileId: string }> }) {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const { profileId } = await params;

    const keys = await prisma.userE2eKey.findMany({
        where: { profileId, revokedAt: null },
        orderBy: { createdAt: "desc" }, take: 10,
        select: { id: true, fingerprint: true, keyAlgorithm: true, deviceLabel: true, createdAt: true },
    });
    return NextResponse.json({ keys });
}
