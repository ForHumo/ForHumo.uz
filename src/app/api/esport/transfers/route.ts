import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getMyProfile, fullName } from "@/lib/esport";
import { formatMoney, type Currency } from "@/lib/money";

// Sportchining hozirgi jamoasi (roster a'zoligidan)
async function currentTeamId(athleteId: string): Promise<string | null> {
    const m = await prisma.esRosterMember.findUnique({ where: { athleteId }, select: { roster: { select: { teamId: true } } } });
    return m?.roster.teamId ?? null;
}

// POST /api/esport/transfers — taklif yaratish { athleteId, toTeamId, fee }
export async function POST(req: Request) {
    const me = await getMyProfile();
    if (!me) return NextResponse.json({ error: "Avval tizimga kiring" }, { status: 401 });

    const { athleteId, toTeamId, fee } = await req.json();
    if (!athleteId || !toTeamId) return NextResponse.json({ error: "athleteId va toTeamId kerak" }, { status: 400 });

    const toTeam = await prisma.esTeam.findUnique({ where: { id: toTeamId }, select: { id: true, ownerId: true } });
    if (!toTeam) return NextResponse.json({ error: "Jamoa topilmadi" }, { status: 404 });
    if (toTeam.ownerId !== me.id) return NextResponse.json({ error: "Faqat jamoa egasi taklif qiladi" }, { status: 403 });

    const athlete = await prisma.esAthlete.findUnique({ where: { id: athleteId }, select: { id: true } });
    if (!athlete) return NextResponse.json({ error: "Sportchi topilmadi" }, { status: 404 });

    const fromTeamId = await currentTeamId(athleteId);
    if (fromTeamId === toTeamId) return NextResponse.json({ error: "Sportchi allaqachon jamoangizда" }, { status: 400 });

    // Bir xil ochiq taklif bo'lmasin
    const dup = await prisma.esTransfer.findFirst({ where: { athleteId, toTeamId, status: "PENDING" }, select: { id: true } });
    if (dup) return NextResponse.json({ error: "Bu sportchiga ochiq taklif bor" }, { status: 409 });

    const cleanFee = Math.max(0, Math.round(Number(fee) || 0));
    const t = await prisma.esTransfer.create({
        data: { athleteId, fromTeamId, toTeamId, fee: cleanFee, currency: "UZS", status: "PENDING" },
    });
    return NextResponse.json({ ok: true, transfer: t });
}

// GET /api/esport/transfers — mening transferlarim (xaridor / sotuvchi / sportchi)
export async function GET() {
    const me = await getMyProfile();
    if (!me) return NextResponse.json({ incoming: [], outgoing: [] });

    const myAthlete = await prisma.esAthlete.findUnique({ where: { humoProfileId: me.id }, select: { id: true } });
    const myTeams = await prisma.esTeam.findMany({ where: { ownerId: me.id }, select: { id: true } });
    const myTeamIds = myTeams.map(t => t.id);

    const rows = await prisma.esTransfer.findMany({
        where: {
            status: "PENDING",
            OR: [
                ...(myAthlete ? [{ athleteId: myAthlete.id }] : []),
                { toTeamId: { in: myTeamIds } },
                ...(myTeamIds.length ? [{ fromTeamId: { in: myTeamIds } }] : []),
            ],
        },
        orderBy: { createdAt: "desc" }, take: 50,
    });

    // Boyitish
    const athleteIds = [...new Set(rows.map(r => r.athleteId))];
    const teamIds = [...new Set(rows.flatMap(r => [r.toTeamId, r.fromTeamId].filter(Boolean) as string[]))];
    const [athletes, teams] = await Promise.all([
        athleteIds.length ? prisma.esAthlete.findMany({ where: { id: { in: athleteIds } }, select: { id: true, ign: true, humoProfileId: true } }) : [],
        teamIds.length ? prisma.esTeam.findMany({ where: { id: { in: teamIds } }, select: { id: true, name: true, tag: true } }) : [],
    ]);
    const profs = athletes.length ? await prisma.userProfile.findMany({ where: { id: { in: athletes.map(a => a.humoProfileId) } }, select: { id: true, firstName: true, lastName: true, name: true } }) : [];
    const aMap = Object.fromEntries(athletes.map(a => [a.id, a]));
    const tMap = Object.fromEntries(teams.map(t => [t.id, t]));
    const pMap = Object.fromEntries(profs.map(p => [p.id, p]));

    const shape = (r: typeof rows[number]) => {
        const a = aMap[r.athleteId];
        const p = a ? pMap[a.humoProfileId] : null;
        return {
            id: r.id, fee: Number(r.fee ?? 0), feeLabel: formatMoney(Number(r.fee ?? 0), r.currency as Currency),
            athleteId: r.athleteId, ign: a?.ign ?? "", athleteName: p ? fullName(p) : "",
            toTeam: tMap[r.toTeamId] ?? null, fromTeam: r.fromTeamId ? tMap[r.fromTeamId] ?? null : null,
            iAmAthlete: !!myAthlete && r.athleteId === myAthlete.id,
            iAmBuyer: myTeamIds.includes(r.toTeamId),
        };
    };

    // Sportchi tasdig'i kutilayotganlar (incoming) + men yuborgan/sotuvchi (outgoing)
    const incoming = rows.filter(r => myAthlete && r.athleteId === myAthlete.id).map(shape);
    const outgoing = rows.filter(r => !(myAthlete && r.athleteId === myAthlete.id)).map(shape);
    return NextResponse.json({ incoming, outgoing });
}
