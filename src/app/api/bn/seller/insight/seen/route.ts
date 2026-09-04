// AI insight ochilganda "ko'rildi" belgilash — badge/push nazorati uchun.
//
//   POST /api/bn/seller/insight/seen  { id }

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireBnAuth } from "@/lib/bn-auth";

export async function POST(req: Request) {
    const auth = await requireBnAuth();
    if (auth instanceof NextResponse) return auth;

    const b = await req.json().catch(() => ({}));
    const id = typeof b?.id === "string" ? b.id : null;
    if (!id) return NextResponse.json({ error: "id_required" }, { status: 400 });

    const insight = await prisma.bnSellerInsight.findFirst({
        where: { id, profileId: auth.profileId },
        select: { id: true, seenAt: true },
    });
    if (!insight) return NextResponse.json({ error: "not_found" }, { status: 404 });
    if (insight.seenAt) return NextResponse.json({ ok: true, alreadySeen: true });

    await prisma.bnSellerInsight.update({
        where: { id }, data: { seenAt: new Date() },
    });
    return NextResponse.json({ ok: true });
}
