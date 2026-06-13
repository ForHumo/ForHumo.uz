import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getMyProfile } from "@/lib/esport";
import { addAthleteToTeam } from "@/lib/esport-roster";

// GET /api/esport/teams — mening jamoalarim (egasi + a'zo bo'lganlarim)
export async function GET() {
    const me = await getMyProfile();
    if (!me) return NextResponse.json({ error: "Avval tizimga kiring" }, { status: 401 });

    const athlete = await prisma.esAthlete.findUnique({ where: { humoProfileId: me.id }, select: { id: true } });
    const membership = athlete
        ? await prisma.esRosterMember.findUnique({ where: { athleteId: athlete.id }, select: { roster: { select: { teamId: true } } } })
        : null;
    const memberTeamId = membership?.roster.teamId ?? null;

    const owned = await prisma.esTeam.findMany({
        where: { ownerId: me.id }, orderBy: { createdAt: "desc" },
        select: { id: true, name: true, tag: true, logo: true, _count: { select: { rosters: true } } },
    });
    let memberTeam = null;
    if (memberTeamId && !owned.some(t => t.id === memberTeamId)) {
        memberTeam = await prisma.esTeam.findUnique({
            where: { id: memberTeamId }, select: { id: true, name: true, tag: true, logo: true },
        });
    }

    return NextResponse.json({
        hasAthlete: !!athlete,
        owned: owned.map(t => ({ id: t.id, name: t.name, tag: t.tag, logo: t.logo, rosters: t._count.rosters, isOwner: true })),
        memberTeam: memberTeam ? { ...memberTeam, isOwner: false } : null,
    });
}

// POST /api/esport/teams — jamoa yaratish { name, tag, logo?, bio? }
export async function POST(req: Request) {
    const me = await getMyProfile();
    if (!me) return NextResponse.json({ error: "Avval tizimga kiring" }, { status: 401 });
    if (!me.humoId) return NextResponse.json({ error: "Avval Humo ID oling", needHumoId: true }, { status: 403 });

    const body = await req.json();
    const name = String(body.name || "").trim().slice(0, 40);
    const tag = String(body.tag || "").trim().toUpperCase().slice(0, 5);
    const logo = typeof body.logo === "string" && body.logo ? body.logo : null;
    const bio = typeof body.bio === "string" && body.bio.trim() ? body.bio.trim().slice(0, 300) : null;

    if (name.length < 2) return NextResponse.json({ error: "Jamoa nomi kamida 2 belgi" }, { status: 400 });
    if (!/^[A-Z0-9]{2,5}$/.test(tag)) return NextResponse.json({ error: "Teg 2-5 ta lotin harf/raqam (masalan RMC)" }, { status: 400 });

    const dup = await prisma.esTeam.findFirst({ where: { OR: [{ name }, { tag }] }, select: { name: true, tag: true } });
    if (dup) return NextResponse.json({ error: dup.tag === tag ? "Bu teg band" : "Bu nom band" }, { status: 409 });

    const team = await prisma.esTeam.create({ data: { name, tag, logo, bio, ownerId: me.id } });

    // Ega sportchi bo'lsa va bo'sh bo'lsa — uni kapitan sifatida o'z o'yini tarkibiga qo'shamiz
    const athlete = await prisma.esAthlete.findUnique({ where: { humoProfileId: me.id }, select: { id: true } });
    if (athlete) await addAthleteToTeam(athlete.id, team.id); // already_in_team bo'lsa jim o'tadi

    return NextResponse.json({ ok: true, team: { id: team.id, name: team.name, tag: team.tag } });
}
