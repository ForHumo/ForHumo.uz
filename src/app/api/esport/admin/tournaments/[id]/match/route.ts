import { NextResponse } from "next/server";
import { after } from "next/server";
import { prisma } from "@/lib/prisma";
import { getEsportAdmin } from "@/lib/esport";
import { recordTournamentResult } from "@/lib/esport-bracket";
import { postToEsTeamChannel } from "@/lib/esport-post-to-team";
import { postToTournamentChannel, syncEsTournamentChannel } from "@/lib/esport-nexus-tournament";
import { announceMatchDone } from "@/lib/esport-nexus-match";

// PATCH /api/esport/admin/tournaments/[id]/match — natija { matchId, scoreA, scoreB }
export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
    if (!await getEsportAdmin()) return NextResponse.json({ error: "Ruxsat yo'q" }, { status: 403 });
    const { id } = await params;
    const body = await req.json();
    const { matchId, scoreA, scoreB } = body;
    const a = Math.max(0, Math.round(Number(scoreA)));
    const b = Math.max(0, Math.round(Number(scoreB)));
    const proofUrl = typeof body.proofUrl === "string" && body.proofUrl ? body.proofUrl : null;
    if (!matchId) return NextResponse.json({ error: "matchId kerak" }, { status: 400 });

    const m = await prisma.esMatch.findUnique({ where: { id: matchId }, select: { tournamentId: true } });
    if (!m || m.tournamentId !== id) return NextResponse.json({ error: "O'yin topilmadi" }, { status: 404 });

    const r = await recordTournamentResult(matchId, a, b);
    if (!r.ok) return NextResponse.json({ error: r.error }, { status: 400 });
    if (proofUrl) await prisma.esMatch.update({ where: { id: matchId }, data: { proofUrl } });

    // Final tugadimi? (eng yuqori MAIN round) → turnir ENDED
    const finalM = await prisma.esMatch.findFirst({ where: { tournamentId: id, bracket: "MAIN" }, orderBy: { round: "desc" }, select: { status: true } });
    if (finalM?.status === "DONE") {
        await prisma.esTournament.update({ where: { id }, data: { status: "ENDED" } });
    }

    // Humo eSport nomidan g'olib/mag'lub jamoalarga xabar (bracket ma'lumoti bilan)
    after(async () => {
        const [match, tournament] = await Promise.all([
            prisma.esMatch.findUnique({
                where: { id: matchId },
                select: { teamAId: true, teamBId: true, round: true, bracket: true, tournamentId: true },
            }),
            prisma.esTournament.findUnique({ where: { id }, select: { name: true } }),
        ]);
        if (!match || !match.teamAId || !match.teamBId || !tournament || !r.winnerId) return;

        const winnerTeamId = r.winnerId;
        const loserTeamId = winnerTeamId === match.teamAId ? match.teamBId : match.teamAId;
        const [teamW, teamL] = await Promise.all([
            prisma.esTeam.findUnique({ where: { id: winnerTeamId }, select: { name: true, tag: true } }),
            prisma.esTeam.findUnique({ where: { id: loserTeamId }, select: { name: true, tag: true } }),
        ]);
        if (!teamW || !teamL) return;

        const isFinal = finalM?.status === "DONE" && match.bracket === "MAIN";
        const roundLabel = isFinal ? "FINAL" : `Bosqich ${match.round}`;

        const winMsg = isFinal
            ? `🏆 **CHAMPIONS!**\n\n**${teamW.tag}** ${a}:${b} ${teamL.tag}\n\n${tournament.name} turniri **${teamW.name}** tomonidan yutildi! Tabriklaymiz! 🎉`
            : `**Turnir o'yin natijasi**\n\n🏆 **${teamW.tag}** ${a}:${b} ${teamL.tag}\n\n${tournament.name} — ${roundLabel}\n\n${teamW.name} keyingi bosqichga o'tdi.${proofUrl ? "\n\nDalil: " + proofUrl : ""}`;

        const loseMsg = isFinal
            ? `**Final natijasi**\n\n${teamW.tag} ${a}:${b} **${teamL.tag}**\n\n${tournament.name} finalida ${teamW.name} g'olib bo'ldi. Kumush medal — ${teamL.name}! Keyingi turnirlarda omad tilaymiz.`
            : `**Turnir o'yin natijasi**\n\n${teamW.tag} ${a}:${b} **${teamL.tag}**\n\n${tournament.name} — ${roundLabel}\n\nAfsuski chetlashtirildingiz. Elo va tajriba oldingizga qoladi.${proofUrl ? "\n\nDalil: " + proofUrl : ""}`;

        await postToEsTeamChannel(winnerTeamId, winMsg, { pin: isFinal });
        await postToEsTeamChannel(loserTeamId, loseMsg);

        // Turnir chat'ga umumiy natija
        const tourMsg = isFinal
            ? `**FINAL YAKUNI**\n${teamW.tag} ${a}—${b} ${teamL.tag}\n\n**CHEMPION: ${teamW.name}**`
            : `**${roundLabel}**\n${teamW.tag} ${a}—${b} ${teamL.tag}\n\nG'olib: ${teamW.name}`;
        await postToTournamentChannel(id, tourMsg);

        // Match chat'ni arxivga o'tkazish + yakuniy pin xabar
        await announceMatchDone(matchId);

        // syncEsTournamentChannel'ni ishlatmadik — bu holat tournamentTeam
        // o'zgarmagan, faqat status. Silent no-op.
        void syncEsTournamentChannel;
    });

    return NextResponse.json({ ok: true, winnerId: r.winnerId });
}
