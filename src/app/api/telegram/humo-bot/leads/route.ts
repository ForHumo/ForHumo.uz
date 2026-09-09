// Humo AI Bot buyurtmalar (leads) — ega uchun.
//   GET  /api/telegram/humo-bot/leads?status=OPEN
//   PATCH /api/telegram/humo-bot/leads  body: { id, status?, ownerNote?, wonAmountUzs? }

import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

async function requireProfile() {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) return null;
    return prisma.userProfile.findUnique({
        where: { email: session.user.email },
        select: { id: true },
    });
}

export async function GET(req: Request) {
    const profile = await requireProfile();
    if (!profile) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

    const url = new URL(req.url);
    const status = url.searchParams.get("status") ?? undefined;
    const limit = Math.min(100, Math.max(1, parseInt(url.searchParams.get("limit") ?? "30")));

    const where: { profileId: string; status?: string } = { profileId: profile.id };
    if (status && ["OPEN", "CONTACTED", "WON", "LOST"].includes(status)) where.status = status;

    const [leads, counts] = await Promise.all([
        prisma.humoBotLead.findMany({
            where, orderBy: { createdAt: "desc" }, take: limit,
        }),
        prisma.humoBotLead.groupBy({
            by: ["status"],
            where: { profileId: profile.id },
            _count: { _all: true },
        }),
    ]);

    return NextResponse.json({
        leads,
        counts: Object.fromEntries(counts.map(c => [c.status, c._count._all])),
    });
}

export async function PATCH(req: Request) {
    const profile = await requireProfile();
    if (!profile) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const id = typeof body.id === "string" ? body.id : "";
    if (!id) return NextResponse.json({ error: "id_required" }, { status: 400 });

    const patch: { status?: string; ownerNote?: string; wonAmountUzs?: number; contactedAt?: Date } = {};
    if (typeof body.status === "string" && ["OPEN", "CONTACTED", "WON", "LOST"].includes(body.status)) {
        patch.status = body.status;
        if (body.status === "CONTACTED") patch.contactedAt = new Date();
    }
    if (typeof body.ownerNote === "string") patch.ownerNote = body.ownerNote.slice(0, 500);
    if (typeof body.wonAmountUzs === "number" && body.wonAmountUzs >= 0) patch.wonAmountUzs = Math.floor(body.wonAmountUzs);

    const updated = await prisma.humoBotLead.updateMany({
        where: { id, profileId: profile.id },
        data: patch,
    });
    if (updated.count === 0) return NextResponse.json({ error: "not_found" }, { status: 404 });
    return NextResponse.json({ ok: true });
}
