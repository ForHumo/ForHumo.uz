import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getMyProfile, fullName } from "@/lib/esport";
import { esNotify } from "@/lib/esport-notify";

// GET /api/esport/teams/[id]/join-request — kutilayotgan arizalar (faqat ega)
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    const me = await getMyProfile();
    if (!me) return NextResponse.json({ error: "Avval tizimga kiring" }, { status: 401 });
    const team = await prisma.esTeam.findUnique({ where: { id }, select: { ownerId: true } });
    if (!team || team.ownerId !== me.id) return NextResponse.json({ error: "Faqat egasi" }, { status: 403 });

    const reqs = await prisma.esJoinRequest.findMany({
        where: { teamId: id, status: "PENDING" }, orderBy: { createdAt: "asc" },
        include: { athlete: { select: { id: true, humoProfileId: true, ign: true, role: true, game: { select: { name: true } } } } },
    });
    const humoIds = reqs.map(r => r.athlete.humoProfileId);
    const profs = humoIds.length
        ? await prisma.userProfile.findMany({ where: { id: { in: humoIds } }, select: { id: true, firstName: true, lastName: true, name: true, username: true, image: true } })
        : [];
    const pMap = Object.fromEntries(profs.map(p => [p.id, p]));

    return NextResponse.json({
        requests: reqs.map(r => {
            const p = pMap[r.athlete.humoProfileId];
            return {
                id: r.id, athleteId: r.athlete.id, ign: r.athlete.ign, position: r.athlete.role, game: r.athlete.game.name,
                name: p ? fullName(p) : "", username: p?.username ?? null, image: p?.image ?? null,
            };
        }),
    });
}

// POST /api/esport/teams/[id]/join-request — ariza berish (sportchi)
export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    const me = await getMyProfile();
    if (!me) return NextResponse.json({ error: "Avval tizimga kiring" }, { status: 401 });

    const athlete = await prisma.esAthlete.findUnique({ where: { humoProfileId: me.id }, select: { id: true } });
    if (!athlete) return NextResponse.json({ error: "Avval sportchi profilini yarating", needAthlete: true }, { status: 400 });

    const team = await prisma.esTeam.findUnique({ where: { id }, select: { id: true, ownerId: true } });
    if (!team) return NextResponse.json({ error: "Jamoa topilmadi" }, { status: 404 });

    // Allaqachon biror tarkibdami?
    const membership = await prisma.esRosterMember.findUnique({ where: { athleteId: athlete.id }, select: { id: true } });
    if (membership) return NextResponse.json({ error: "Siz allaqachon jamoadasiz — avval chiqing" }, { status: 400 });

    await prisma.esJoinRequest.upsert({
        where: { teamId_athleteId: { teamId: id, athleteId: athlete.id } },
        create: { teamId: id, athleteId: athlete.id, status: "PENDING" },
        update: { status: "PENDING", createdAt: new Date() },
    });
    const myIgn = (await prisma.esAthlete.findUnique({ where: { id: athlete.id }, select: { ign: true } }))?.ign ?? "Sportchi";
    await esNotify(team.ownerId, { type: "JOIN_REQUEST", title: "Yangi ariza", body: `${myIgn} jamoangizga qo'shilmoqchi`, href: `/esport/teams/${id}` });
    return NextResponse.json({ ok: true });
}
