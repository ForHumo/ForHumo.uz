import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { canManageTeam } from "@/lib/esport-block";
import { getMyProfile, fullName } from "@/lib/esport";
import { formatMoney, type Currency } from "@/lib/money";
import { esNotify, athleteProfileId } from "@/lib/esport-notify";
import { isTeamLockedForGame } from "@/lib/esport-lock";

const OPEN = ["PLAYER_PENDING", "AWAIT_FEE", "CLUB_PENDING"];

async function currentTeamId(athleteId: string): Promise<string | null> {
    const m = await prisma.esRosterMember.findUnique({ where: { athleteId }, select: { roster: { select: { teamId: true } } } });
    return m?.roster.teamId ?? null;
}

// POST /api/esport/transfers — o'yinchiga oylik taklif yuborish (xaridor jamoa egasi)
// { athleteId, toTeamId, salary, conditions, contractMonths }
export async function POST(req: Request) {
    const me = await getMyProfile();
    if (!me) return NextResponse.json({ error: "Avval tizimga kiring" }, { status: 401 });

    const b = await req.json();
    const { athleteId, toTeamId } = b;
    if (!athleteId || !toTeamId) return NextResponse.json({ error: "athleteId va toTeamId kerak" }, { status: 400 });

    const toTeam = await prisma.esTeam.findUnique({ where: { id: toTeamId }, select: { id: true, ownerId: true } });
    if (!toTeam) return NextResponse.json({ error: "Jamoa topilmadi" }, { status: 404 });
    if (!await canManageTeam(me.id, toTeamId)) return NextResponse.json({ error: "Faqat jamoa egasi yoki vitse-rahbar taklif qiladi" }, { status: 403 });

    const athlete = await prisma.esAthlete.findUnique({ where: { id: athleteId }, select: { id: true, humoProfileId: true, gameId: true } });
    if (!athlete) return NextResponse.json({ error: "Sportchi topilmadi" }, { status: 404 });

    const fromTeamId = await currentTeamId(athleteId);
    if (fromTeamId === toTeamId) return NextResponse.json({ error: "Sportchi allaqachon jamoangizda" }, { status: 400 });

    // Roster lock: xaridor yoki sotuvchi jamoa active turnirda bo'lsa transfer taqiqlanadi
    if (await isTeamLockedForGame(toTeamId, athlete.gameId)) return NextResponse.json({ error: "Jamoangiz turnirda — transfer turnir tugagach mumkin" }, { status: 409 });
    if (fromTeamId && await isTeamLockedForGame(fromTeamId, athlete.gameId)) return NextResponse.json({ error: "Sportchi jamoasi turnirda — transfer turnir tugagach mumkin" }, { status: 409 });

    // Jamoa egasini transfer qilib bo'lmaydi (avval egalikni o'tkazsin yoki jamoani o'chirsin)
    if (fromTeamId) {
        const fromTeam = await prisma.esTeam.findUnique({ where: { id: fromTeamId }, select: { ownerId: true } });
        if (fromTeam?.ownerId === athlete.humoProfileId) return NextResponse.json({ error: "Jamoa egasini transfer qilib bo'lmaydi" }, { status: 400 });
    }

    const dup = await prisma.esTransfer.findFirst({ where: { athleteId, toTeamId, status: { in: OPEN } }, select: { id: true } });
    if (dup) return NextResponse.json({ error: "Bu sportchiga ochiq taklif bor" }, { status: 409 });

    // Spam himoyasi: bitta jamoa 10 daqiqada 20 tadan ko'p taklif yubora olmaydi
    const since = new Date(Date.now() - 10 * 60 * 1000);
    const recentCount = await prisma.esTransfer.count({ where: { toTeamId, createdAt: { gt: since } } });
    if (recentCount >= 20) return NextResponse.json({ error: "Juda ko'p taklif yuborildi — biroz kuting" }, { status: 429 });

    const salary = b.salary != null && b.salary !== "" ? Math.max(0, Math.round(Number(b.salary))) : null;
    const contractMonths = b.contractMonths ? Math.max(1, Math.round(Number(b.contractMonths))) : null;
    const conditions = typeof b.conditions === "string" && b.conditions.trim() ? b.conditions.trim().slice(0, 300) : null;

    const t = await prisma.esTransfer.create({
        data: { athleteId, fromTeamId, toTeamId, salary, conditions, contractMonths, currency: "UZS", status: "PLAYER_PENDING" },
    });
    const toTeamName = (await prisma.esTeam.findUnique({ where: { id: toTeamId }, select: { name: true } }))?.name ?? "Bir jamoa";
    await esNotify(await athleteProfileId(athleteId), { type: "TRANSFER_OFFER", title: "Yangi transfer taklifi", body: `${toTeamName} sizga taklif yubordi${salary ? ` — oylik ${salary.toLocaleString()} so'm` : ""}`, href: "/esport/transfers" });
    return NextResponse.json({ ok: true, transfer: t });
}

// GET /api/esport/transfers — mening takliflarim (o'yinchi / xaridor / sotuvchi jamoa)
export async function GET() {
    const me = await getMyProfile();
    if (!me) return NextResponse.json({ asPlayer: [], asBuyer: [], asClub: [] });

    const myAthlete = await prisma.esAthlete.findUnique({ where: { humoProfileId: me.id }, select: { id: true } });
    const myTeams = await prisma.esTeam.findMany({ where: { ownerId: me.id }, select: { id: true } });
    const myTeamIds = myTeams.map(t => t.id);

    const rows = await prisma.esTransfer.findMany({
        where: {
            status: { in: OPEN },
            OR: [
                ...(myAthlete ? [{ athleteId: myAthlete.id }] : []),
                { toTeamId: { in: myTeamIds } },
                ...(myTeamIds.length ? [{ fromTeamId: { in: myTeamIds } }] : []),
            ],
        },
        orderBy: { createdAt: "desc" }, take: 60,
    });

    const athleteIds = [...new Set(rows.map(r => r.athleteId))];
    const teamIds = [...new Set(rows.flatMap(r => [r.toTeamId, r.fromTeamId].filter(Boolean) as string[]))];
    const [athletes, teams] = await Promise.all([
        athleteIds.length ? prisma.esAthlete.findMany({ where: { id: { in: athleteIds } }, select: { id: true, ign: true, humoProfileId: true, marketValue: true } }) : [],
        teamIds.length ? prisma.esTeam.findMany({ where: { id: { in: teamIds } }, select: { id: true, name: true, tag: true } }) : [],
    ]);
    const profs = athletes.length ? await prisma.userProfile.findMany({ where: { id: { in: athletes.map(a => a.humoProfileId) } }, select: { id: true, firstName: true, lastName: true, name: true } }) : [];
    const aMap = Object.fromEntries(athletes.map(a => [a.id, a]));
    const tMap = Object.fromEntries(teams.map(t => [t.id, t]));
    const pMap = Object.fromEntries(profs.map(p => [p.id, p]));

    const shape = (r: typeof rows[number]) => {
        const a = aMap[r.athleteId];
        const p = a ? pMap[a.humoProfileId] : null;
        const mv = a?.marketValue ? Number(a.marketValue) : null;
        return {
            id: r.id, status: r.status,
            athleteId: r.athleteId, ign: a?.ign ?? "", athleteName: p ? fullName(p) : "",
            toTeam: tMap[r.toTeamId] ?? null, fromTeam: r.fromTeamId ? tMap[r.fromTeamId] ?? null : null,
            salary: r.salary ? Number(r.salary) : null, salaryLabel: r.salary ? formatMoney(Number(r.salary), r.currency as Currency) : null,
            conditions: r.conditions, contractMonths: r.contractMonths,
            fee: r.fee ? Number(r.fee) : null, feeLabel: r.fee ? formatMoney(Number(r.fee), r.currency as Currency) : null,
            marketValue: mv, marketLabel: mv != null ? formatMoney(mv, "UZS") : null,
        };
    };

    return NextResponse.json({
        asPlayer: rows.filter(r => myAthlete && r.athleteId === myAthlete.id && r.status === "PLAYER_PENDING").map(shape),
        asBuyer: rows.filter(r => myTeamIds.includes(r.toTeamId)).map(shape),
        asClub: rows.filter(r => r.fromTeamId && myTeamIds.includes(r.fromTeamId) && r.status === "CLUB_PENDING").map(shape),
    });
}
