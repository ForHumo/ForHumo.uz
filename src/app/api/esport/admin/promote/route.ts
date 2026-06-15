import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getEsportAdmin } from "@/lib/esport";

const N = 3; // har divizionдан TOP 3 ko'tariladi / pastki 3 tushadi

// POST /api/esport/admin/promote — mavsum yakunida divizionlarni avtomatik yangilash
// { seasonId, reset? } — yuqori tier teamlari pastga, pastki tier TOP N yuqoriga
export async function POST(req: Request) {
    if (!await getEsportAdmin()) return NextResponse.json({ error: "Ruxsat yo'q" }, { status: 403 });
    const { seasonId, reset = true } = await req.json();
    if (!seasonId) return NextResponse.json({ error: "seasonId kerak" }, { status: 400 });

    const season = await prisma.esSeason.findUnique({ where: { id: seasonId }, select: { gameId: true } });
    if (!season) return NextResponse.json({ error: "Mavsum topilmadi" }, { status: 404 });

    const divisions = await prisma.esDivision.findMany({ where: { gameId: season.gameId }, orderBy: { tier: "asc" }, select: { id: true, tier: true } });
    if (divisions.length < 2) return NextResponse.json({ error: "Kamida 2 divizion kerak" }, { status: 400 });

    const standings = await prisma.esStanding.findMany({ where: { seasonId }, select: { id: true, teamId: true, divisionId: true, points: true, wins: true, losses: true } });
    const byDiv: Record<string, typeof standings> = {};
    for (const s of standings) (byDiv[s.divisionId] ||= []).push(s);
    // Eng yaxshi → eng yomon
    const sortBest = (arr: typeof standings) => [...arr].sort((a, b) => b.points - a.points || b.wins - a.wins || a.losses - b.losses);

    const moves: { id: string; toDivisionId: string }[] = [];
    for (let i = 0; i < divisions.length - 1; i++) {
        const upper = divisions[i], lower = divisions[i + 1];
        const up = sortBest(byDiv[lower.id] || []);     // pastki divizion (yaxshi → yomon)
        const dn = sortBest(byDiv[upper.id] || []);     // yuqori divizion (yaxshi → yomon)
        const k = Math.min(N, up.length, dn.length);
        if (k === 0) continue;
        // pastki TOP k → yuqoriga
        for (let j = 0; j < k; j++) moves.push({ id: up[j].id, toDivisionId: upper.id });
        // yuqori pastki k → pastga
        for (let j = 0; j < k; j++) moves.push({ id: dn[dn.length - 1 - j].id, toDivisionId: lower.id });
    }

    if (moves.length === 0) return NextResponse.json({ ok: true, moved: 0, message: "Ko'chirish uchun yetarli jamoa yo'q" });

    await prisma.$transaction(moves.map(m => prisma.esStanding.update({
        where: { id: m.id },
        data: { divisionId: m.toDivisionId, ...(reset ? { points: 0, wins: 0, losses: 0, played: 0 } : {}) },
    })));

    return NextResponse.json({ ok: true, moved: moves.length });
}
