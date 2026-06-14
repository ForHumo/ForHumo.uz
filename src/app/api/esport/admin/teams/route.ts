import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getEsportAdmin } from "@/lib/esport";

// GET /api/esport/admin/teams?seasonId= — barcha jamoalar + shu mavsumdagi holati (enroll uchun)
export async function GET(req: Request) {
    if (!await getEsportAdmin()) return NextResponse.json({ error: "Ruxsat yo'q" }, { status: 403 });
    const seasonId = new URL(req.url).searchParams.get("seasonId") || "";

    const teams = await prisma.esTeam.findMany({ orderBy: { createdAt: "desc" }, select: { id: true, name: true, tag: true, logo: true } });
    const standings = seasonId
        ? await prisma.esStanding.findMany({ where: { seasonId }, select: { teamId: true, divisionId: true } })
        : [];
    const sMap = Object.fromEntries(standings.map(s => [s.teamId, s.divisionId]));

    return NextResponse.json({
        teams: teams.map(t => ({ ...t, enrolledDivisionId: sMap[t.id] ?? null })),
    });
}
