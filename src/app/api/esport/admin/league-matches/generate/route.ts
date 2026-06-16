import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getEsportAdmin } from "@/lib/esport";

// Aylanma (circle) usuli — har jamoa har biri bilan o'ynaydi. Toq sonда "BYE" qo'shiladi.
function roundRobin(teamIds: string[], double: boolean) {
    const teams = [...teamIds];
    if (teams.length % 2 === 1) teams.push("BYE");
    const n = teams.length;
    const rounds = n - 1, half = n / 2;
    let arr = [...teams];
    const fx: { round: number; teamAId: string; teamBId: string }[] = [];
    for (let r = 0; r < rounds; r++) {
        for (let i = 0; i < half; i++) {
            const a = arr[i], b = arr[n - 1 - i];
            if (a !== "BYE" && b !== "BYE") {
                // adolat uchun uy/mehmonni round bo'yicha almashtiramiz
                if (r % 2 === 0) fx.push({ round: r + 1, teamAId: a, teamBId: b });
                else fx.push({ round: r + 1, teamAId: b, teamBId: a });
            }
        }
        arr = [arr[0], arr[n - 1], ...arr.slice(1, n - 1)]; // birinchini qotirib, qolganini aylantiramiz
    }
    if (double) {
        const reverse = fx.map(f => ({ round: f.round + rounds, teamAId: f.teamBId, teamBId: f.teamAId }));
        return [...fx, ...reverse];
    }
    return fx;
}

// POST /api/esport/admin/league-matches/generate — divizion uchun to'liq jadval
// { seasonId, divisionId, double?, startsAt?, intervalDays? }
export async function POST(req: Request) {
    if (!await getEsportAdmin()) return NextResponse.json({ error: "Ruxsat yo'q" }, { status: 403 });
    const b = await req.json().catch(() => ({}));
    const seasonId = String(b.seasonId || ""), divisionId = String(b.divisionId || "");
    if (!seasonId || !divisionId) return NextResponse.json({ error: "seasonId va divisionId kerak" }, { status: 400 });

    const existing = await prisma.esLeagueMatch.count({ where: { seasonId, divisionId } });
    if (existing > 0) return NextResponse.json({ error: "Bu divizionда jadval allaqachon mavjud" }, { status: 409 });

    const standings = await prisma.esStanding.findMany({ where: { seasonId, divisionId }, select: { teamId: true } });
    const teamIds = standings.map(s => s.teamId);
    if (teamIds.length < 2) return NextResponse.json({ error: "Kamida 2 jamoa kerak" }, { status: 400 });

    const fixtures = roundRobin(teamIds, b.double === true);
    const startsAt = b.startsAt ? new Date(b.startsAt) : null;
    const intervalDays = Math.max(1, Math.round(Number(b.intervalDays) || 7));

    const data = fixtures.map(f => ({
        seasonId, divisionId, teamAId: f.teamAId, teamBId: f.teamBId,
        scheduledAt: startsAt && !isNaN(startsAt.getTime()) ? new Date(startsAt.getTime() + (f.round - 1) * intervalDays * 86400000) : null,
    }));
    await prisma.esLeagueMatch.createMany({ data });

    const rounds = fixtures.reduce((m, f) => Math.max(m, f.round), 0);
    return NextResponse.json({ ok: true, created: data.length, rounds });
}
