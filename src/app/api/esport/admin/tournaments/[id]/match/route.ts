import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getEsportAdmin } from "@/lib/esport";
import { recordTournamentResult } from "@/lib/esport-bracket";

// PATCH /api/esport/admin/tournaments/[id]/match — natija { matchId, scoreA, scoreB }
export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
    if (!await getEsportAdmin()) return NextResponse.json({ error: "Ruxsat yo'q" }, { status: 403 });
    const { id } = await params;
    const { matchId, scoreA, scoreB } = await req.json();
    const a = Math.max(0, Math.round(Number(scoreA)));
    const b = Math.max(0, Math.round(Number(scoreB)));
    if (!matchId) return NextResponse.json({ error: "matchId kerak" }, { status: 400 });

    const m = await prisma.esMatch.findUnique({ where: { id: matchId }, select: { tournamentId: true } });
    if (!m || m.tournamentId !== id) return NextResponse.json({ error: "O'yin topilmadi" }, { status: 404 });

    const r = await recordTournamentResult(matchId, a, b);
    if (!r.ok) return NextResponse.json({ error: r.error }, { status: 400 });

    // Final tugadimi? (eng yuqori MAIN round) → turnir ENDED
    const finalM = await prisma.esMatch.findFirst({ where: { tournamentId: id, bracket: "MAIN" }, orderBy: { round: "desc" }, select: { status: true } });
    if (finalM?.status === "DONE") {
        await prisma.esTournament.update({ where: { id }, data: { status: "ENDED" } });
    }
    return NextResponse.json({ ok: true, winnerId: r.winnerId });
}
