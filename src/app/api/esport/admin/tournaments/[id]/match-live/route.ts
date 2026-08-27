// PATCH /api/esport/admin/tournaments/[id]/match-live
// Match'ni LIVE holatiga o'tkazish + streamUrl (ixtiyoriy). Tournament chat va match chat'ga e'lon.
//   body: { matchId, streamUrl? }

import { NextResponse } from "next/server";
import { after } from "next/server";
import { prisma } from "@/lib/prisma";
import { getEsportAdmin } from "@/lib/esport";
import { announceMatchLive, syncEsMatchChannel, postToMatchChannel } from "@/lib/esport-nexus-match";

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
    if (!await getEsportAdmin()) return NextResponse.json({ error: "Ruxsat yo'q" }, { status: 403 });
    const { id } = await params;
    const body = await req.json().catch(() => ({}));
    const matchId = String(body?.matchId ?? "");
    const streamUrl = typeof body?.streamUrl === "string" ? body.streamUrl.trim().slice(0, 500) : null;
    if (!matchId) return NextResponse.json({ error: "matchId kerak" }, { status: 400 });

    const m = await prisma.esMatch.findUnique({
        where: { id: matchId },
        select: { tournamentId: true, status: true, teamAId: true, teamBId: true },
    });
    if (!m || m.tournamentId !== id) return NextResponse.json({ error: "not_found" }, { status: 404 });
    if (m.status === "DONE") return NextResponse.json({ error: "Match tugagan" }, { status: 400 });
    if (!m.teamAId || !m.teamBId) return NextResponse.json({ error: "Jamoalar to'liq emas" }, { status: 400 });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const data: any = { status: "LIVE" };
    if (streamUrl !== null) data.streamUrl = streamUrl || null;

    await prisma.esMatch.update({ where: { id: matchId }, data });

    after(async () => {
        // Match chat mavjud emas bo'lsa yaratamiz (idempotent)
        await syncEsMatchChannel(matchId);
        // Tournament chat'ga "MATCH LIVE" e'lon
        await announceMatchLive(matchId);
        // Match chat'ga stream havolasi
        if (streamUrl) {
            await postToMatchChannel(matchId,
                `**Efir boshlandi**\n${streamUrl}`,
                { pin: true });
        }
    });

    return NextResponse.json({ ok: true });
}
