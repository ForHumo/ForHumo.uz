import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getMyProfile, getEsportAdmin, ESPORT_OWNER_HUMO_ID } from "@/lib/esport";
import { esNotify } from "@/lib/esport-notify";

// Match'ning ikki jamoasi + holati (turnir yoki liga)
async function matchTeams(matchType: string, matchId: string) {
    if (matchType === "TOURNAMENT") {
        const m = await prisma.esMatch.findUnique({ where: { id: matchId }, select: { teamAId: true, teamBId: true, status: true } });
        return m ? { teamAId: m.teamAId, teamBId: m.teamBId, done: m.status === "DONE" } : null;
    }
    if (matchType === "LEAGUE") {
        const m = await prisma.esLeagueMatch.findUnique({ where: { id: matchId }, select: { teamAId: true, teamBId: true, status: true } });
        return m ? { teamAId: m.teamAId, teamBId: m.teamBId, done: m.status === "DONE" } : null;
    }
    return null;
}

// POST /api/esport/disputes — e'tiroz bildirish { matchType, matchId, reason, screenshotUrl? }
export async function POST(req: Request) {
    const me = await getMyProfile();
    if (!me) return NextResponse.json({ error: "Avval tizimga kiring" }, { status: 401 });

    const b = await req.json().catch(() => ({}));
    const matchType = b.matchType === "LEAGUE" ? "LEAGUE" : b.matchType === "TOURNAMENT" ? "TOURNAMENT" : null;
    const matchId = String(b.matchId || "");
    const reason = typeof b.reason === "string" ? b.reason.trim().slice(0, 500) : "";
    if (!matchType || !matchId) return NextResponse.json({ error: "matchType va matchId kerak" }, { status: 400 });
    if (!reason) return NextResponse.json({ error: "E'tiroz sababini yozing" }, { status: 400 });

    const mt = await matchTeams(matchType, matchId);
    if (!mt) return NextResponse.json({ error: "O'yin topilmadi" }, { status: 404 });
    if (!mt.done) return NextResponse.json({ error: "Faqat yakunlangan o'yinga e'tiroz bildiriladi" }, { status: 400 });

    // Faqat o'yinda o'ynagan jamoaning EGASI e'tiroz bildiradi
    const ids = [mt.teamAId, mt.teamBId].filter(Boolean) as string[];
    const myTeam = ids.length ? await prisma.esTeam.findFirst({ where: { ownerId: me.id, id: { in: ids } }, select: { id: true } }) : null;
    if (!myTeam) return NextResponse.json({ error: "Faqat o'yinda qatnashgan jamoa egasi e'tiroz bildira oladi" }, { status: 403 });

    const dup = await prisma.esDispute.findFirst({ where: { matchType, matchId, teamId: myTeam.id, status: "OPEN" }, select: { id: true } });
    if (dup) return NextResponse.json({ error: "Bu o'yinga ochiq e'tirozingiz bor" }, { status: 409 });

    const screenshotUrl = typeof b.screenshotUrl === "string" && b.screenshotUrl ? b.screenshotUrl : null;
    const d = await prisma.esDispute.create({ data: { matchType, matchId, teamId: myTeam.id, filedBy: me.id, reason, screenshotUrl } });

    // Egaga (hakam) bildirishnoma
    const owner = await prisma.userProfile.findUnique({ where: { humoId: ESPORT_OWNER_HUMO_ID }, select: { id: true } });
    await esNotify(owner?.id, { type: "DISPUTE_NEW", title: "Yangi natija e'tirozi", body: "Bir jamoa o'yin natijasiga e'tiroz bildirdi", href: "/esport/admin" });

    return NextResponse.json({ ok: true, dispute: { id: d.id, status: d.status } });
}

// GET /api/esport/disputes — e'tirozlar ro'yxati (admin/ega)
export async function GET() {
    if (!await getEsportAdmin()) return NextResponse.json({ error: "Ruxsat yo'q" }, { status: 403 });
    const rows = await prisma.esDispute.findMany({ orderBy: [{ status: "asc" }, { createdAt: "desc" }], take: 100 });
    const teamIds = [...new Set(rows.map(r => r.teamId))];
    const teams = teamIds.length ? await prisma.esTeam.findMany({ where: { id: { in: teamIds } }, select: { id: true, name: true, tag: true } }) : [];
    const tMap = Object.fromEntries(teams.map(t => [t.id, t]));
    return NextResponse.json({
        disputes: rows.map(r => ({
            id: r.id, matchType: r.matchType, matchId: r.matchId, team: tMap[r.teamId] ?? null,
            reason: r.reason, screenshotUrl: r.screenshotUrl, status: r.status, adminNote: r.adminNote, createdAt: r.createdAt,
        })),
    });
}
