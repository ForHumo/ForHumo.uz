// BN admin — so'nggi broadcast tarixi (audit paneli uchun).
// Faqat OWNER ko'radi. So'nggi 30 ta xabar.

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireBnAuth } from "@/lib/bn-auth";
import { isBnOwner } from "@/lib/bn-admin";

export const dynamic = "force-dynamic";

export async function GET() {
    const auth = await requireBnAuth();
    if (auth instanceof NextResponse) return auth;
    if (!(await isBnOwner(auth.profileId))) {
        return NextResponse.json({ error: "forbidden" }, { status: 403 });
    }

    const rows = await prisma.bnBroadcast.findMany({
        orderBy: { createdAt: "desc" },
        take: 30,
    });

    // Owner profillari (kim yubordi)
    const ownerIds = [...new Set(rows.map(r => r.ownerId))];
    const owners = ownerIds.length ? await prisma.userProfile.findMany({
        where: { id: { in: ownerIds } },
        select: { id: true, username: true, humoId: true, name: true, image: true },
    }) : [];
    const byId = new Map(owners.map(o => [o.id, o]));

    return NextResponse.json({
        history: rows.map(r => ({
            id: r.id,
            title: r.title,
            body: r.body,
            url: r.url,
            segment: r.segment,
            recipients: r.recipients,
            clickCount: r.clickCount,
            ctr: r.recipients > 0 ? Math.round((r.clickCount / r.recipients) * 1000) / 10 : 0,
            tookMs: r.tookMs,
            createdAt: r.createdAt.toISOString(),
            owner: byId.get(r.ownerId) ?? null,
        })),
    });
}
