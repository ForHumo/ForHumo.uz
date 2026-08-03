import { NextResponse } from "next/server";
import { requireFounder } from "@/lib/admin-guard";
import { prisma } from "@/lib/prisma";

// GET /api/admin/ban-appeals — ariza yuborilgan lekin hali ko'rilmagan ban'lar
export async function GET() {
    const founder = await requireFounder();
    if (!founder) return NextResponse.json({ error: "Ruxsat yo'q" }, { status: 403 });

    const bans = await prisma.userBan.findMany({
        where: { appealAt: { not: null }, reviewedAt: null, lifted: false },
        orderBy: { appealAt: "asc" }, take: 100,
    });

    const ids = [...new Set(bans.map(b => b.profileId))];
    const profs = ids.length
        ? await prisma.userProfile.findMany({
            where: { id: { in: ids } },
            select: { id: true, name: true, username: true, image: true, humoId: true },
        })
        : [];
    const pMap = Object.fromEntries(profs.map(p => [p.id, p]));

    return NextResponse.json({
        appeals: bans.map(b => ({
            id: b.id,
            profile: pMap[b.profileId] ?? null,
            level: b.level,
            reason: b.reason,
            category: b.category,
            contextSnippet: b.contextSnippet,
            aiVerdict: b.aiVerdict,
            aiSeverity: b.aiSeverity,
            aiRelationScore: b.aiRelationScore,
            issuedAt: b.issuedAt,
            expiresAt: b.expiresAt,
            appealAt: b.appealAt,
            appealText: b.appealText,
        })),
    });
}

// POST /api/admin/ban-appeals — ariza bo'yicha qaror
// body: { banId: string, action: "lift" | "keep", note?: string }
export async function POST(req: Request) {
    const founder = await requireFounder();
    if (!founder) return NextResponse.json({ error: "Ruxsat yo'q" }, { status: 403 });

    const { banId, action, note } = (await req.json()) as { banId?: string; action?: string; note?: string };
    if (!banId || (action !== "lift" && action !== "keep")) {
        return NextResponse.json({ error: "Noto'g'ri parametrlar" }, { status: 400 });
    }

    const ban = await prisma.userBan.findUnique({ where: { id: banId }, select: { id: true, lifted: true } });
    if (!ban) return NextResponse.json({ error: "Bloklash topilmadi" }, { status: 404 });
    if (ban.lifted) return NextResponse.json({ error: "Allaqachon bekor qilingan" }, { status: 400 });

    if (action === "lift") {
        await prisma.userBan.update({
            where: { id: banId },
            data: { lifted: true, reviewedById: founder.id, reviewedAt: new Date(), liftReason: (note || "").slice(0, 300) || null },
        });
        return NextResponse.json({ ok: true, action: "lift" });
    }

    // "keep" — ariza rad etildi, blok o'z holida qoladi
    await prisma.userBan.update({
        where: { id: banId },
        data: { reviewedById: founder.id, reviewedAt: new Date(), liftReason: (note || "").slice(0, 300) || null },
    });
    return NextResponse.json({ ok: true, action: "keep" });
}
