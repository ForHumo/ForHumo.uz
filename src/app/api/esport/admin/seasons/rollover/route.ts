import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getEsportOwner } from "@/lib/esport";

const N = 3; // har divizionдан TOP 3 ko'tariladi / pastki 3 tushadi

// POST /api/esport/admin/seasons/rollover — mavsumni yakunlab keyingisini ochadi (faqat ega)
// { seasonId, nextName, nextStartsAt?, nextEndsAt? }
// Joriy mavsum yopiladi (tarix saqlanadi); promotion/relegation qo'llanib jamoalar
// keyingi mavsum standings'iga ko'chiriladi (rekordlar 0).
export async function POST(req: Request) {
    if (!await getEsportOwner()) return NextResponse.json({ error: "Faqat ega" }, { status: 403 });
    const b = await req.json().catch(() => ({}));
    const seasonId = String(b.seasonId || "");
    const nextName = String(b.nextName || "").trim().slice(0, 40);
    if (!seasonId || !nextName) return NextResponse.json({ error: "Mavsum va keyingi nom kerak" }, { status: 400 });

    const season = await prisma.esSeason.findUnique({ where: { id: seasonId }, select: { id: true, gameId: true } });
    if (!season) return NextResponse.json({ error: "Mavsum topilmadi" }, { status: 404 });

    const [divisions, standings] = await Promise.all([
        prisma.esDivision.findMany({ where: { gameId: season.gameId }, orderBy: { tier: "asc" }, select: { id: true, tier: true } }),
        prisma.esStanding.findMany({ where: { seasonId }, select: { teamId: true, divisionId: true, points: true, wins: true, losses: true } }),
    ]);
    if (standings.length === 0) return NextResponse.json({ error: "Bu mavsumда jamoa yo'q" }, { status: 400 });

    // Promotion/relegation — keyingi divizionni hisoblaymiz (joriyni o'zgartirmaymiz)
    const byDiv: Record<string, typeof standings> = {};
    for (const s of standings) (byDiv[s.divisionId] ||= []).push(s);
    const sortBest = (arr: typeof standings) => [...arr].sort((a, b) => b.points - a.points || b.wins - a.wins || a.losses - b.losses);
    const nextDiv = new Map<string, string>();
    for (const s of standings) nextDiv.set(s.teamId, s.divisionId); // default — o'sha divizion
    const moved = new Set<string>();
    for (let i = 0; i < divisions.length - 1; i++) {
        const upper = divisions[i], lower = divisions[i + 1];
        const up = sortBest(byDiv[lower.id] || []);
        const dn = sortBest(byDiv[upper.id] || []);
        const k = Math.min(N, up.length, dn.length);
        for (let j = 0; j < k; j++) { const id = up[j].teamId; if (!moved.has(id)) { nextDiv.set(id, upper.id); moved.add(id); } }
        for (let j = 0; j < k; j++) { const id = dn[dn.length - 1 - j].teamId; if (!moved.has(id)) { nextDiv.set(id, lower.id); moved.add(id); } }
    }

    const nextStartsAt = b.nextStartsAt ? new Date(b.nextStartsAt) : new Date();
    const nextEndsAt = b.nextEndsAt ? new Date(b.nextEndsAt) : null;

    const result = await prisma.$transaction(async tx => {
        await tx.esSeason.update({ where: { id: seasonId }, data: { active: false, endsAt: new Date() } });
        const ns = await tx.esSeason.create({ data: { gameId: season.gameId, name: nextName, startsAt: nextStartsAt, endsAt: nextEndsAt, active: true } });
        const data = [...nextDiv.entries()].map(([teamId, divisionId]) => ({ seasonId: ns.id, divisionId, teamId }));
        if (data.length) await tx.esStanding.createMany({ data });
        return { nextId: ns.id, carried: data.length, promoted: moved.size };
    });

    return NextResponse.json({ ok: true, ...result });
}
