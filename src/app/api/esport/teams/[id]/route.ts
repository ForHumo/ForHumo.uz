import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getMyProfile, fullName, purgeTeam } from "@/lib/esport";
import { isValidMediaUrl } from "@/lib/media-url";
import { isTeamLockedAny } from "@/lib/esport-lock";

// GET /api/esport/teams/[id] — jamoa tafsiloti (tarkiblar + a'zolar)
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    const me = await getMyProfile();

    const team = await prisma.esTeam.findUnique({
        where: { id },
        include: {
            rosters: {
                include: {
                    game: { select: { slug: true, name: true, teamSize: true } },
                    members: {
                        orderBy: { joinedAt: "asc" },
                        include: { athlete: { select: { id: true, humoProfileId: true, ign: true, gameUserId: true, gameServer: true, role: true } } },
                    },
                },
            },
        },
    });
    if (!team) return NextResponse.json({ error: "Jamoa topilmadi" }, { status: 404 });

    // A'zolar ismlari (Humo ID profilidan)
    const humoIds = team.rosters.flatMap(r => r.members.map(m => m.athlete.humoProfileId));
    const profs = humoIds.length
        ? await prisma.userProfile.findMany({ where: { id: { in: humoIds } }, select: { id: true, firstName: true, lastName: true, name: true, username: true, image: true, humoId: true, verified: true } })
        : [];
    const pMap = Object.fromEntries(profs.map(p => [p.id, p]));

    const isOwner = !!me && team.ownerId === me.id;
    const myAthlete = me ? await prisma.esAthlete.findUnique({ where: { humoProfileId: me.id }, select: { id: true } }) : null;
    const myMembership = myAthlete
        ? await prisma.esRosterMember.findUnique({ where: { athleteId: myAthlete.id }, select: { roster: { select: { teamId: true } } } })
        : null;
    const amIMember = myMembership?.roster.teamId === team.id;

    const pendingRequests = isOwner
        ? await prisma.esJoinRequest.count({ where: { teamId: id, status: "PENDING" } })
        : 0;

    const locked = await isTeamLockedAny(id); // active turnirda — tarkib qulflangan

    return NextResponse.json({
        team: {
            id: team.id, name: team.name, tag: team.tag, logo: team.logo, coverImage: team.coverImage, bio: team.bio,
            isOwner, amIMember, myAthleteId: myAthlete?.id ?? null, pendingRequests, locked,
            rosters: team.rosters.map(r => ({
                id: r.id, game: r.game, rating: r.rating,
                members: r.members.map(m => {
                    const p = pMap[m.athlete.humoProfileId];
                    return {
                        athleteId: m.athlete.id, humoProfileId: m.athlete.humoProfileId, role: m.role, ign: m.athlete.ign,
                        gameUserId: m.athlete.gameUserId, gameServer: m.athlete.gameServer, position: m.athlete.role,
                        name: p ? fullName(p) : "", username: p?.username ?? null, image: p?.image ?? null,
                        humoId: p?.humoId ?? null, verified: p?.verified ?? false,
                    };
                }),
            })),
        },
    });
}

// PATCH /api/esport/teams/[id] — tahrir (faqat ega) { name?, tag?, logo?, bio? }
export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    const me = await getMyProfile();
    if (!me) return NextResponse.json({ error: "Avval tizimga kiring" }, { status: 401 });
    const team = await prisma.esTeam.findUnique({ where: { id }, select: { ownerId: true } });
    if (!team || team.ownerId !== me.id) return NextResponse.json({ error: "Faqat egasi" }, { status: 403 });

    const body = await req.json();
    const data: { name?: string; tag?: string; logo?: string | null; bio?: string | null; coverImage?: string | null } = {};
    if (typeof body.coverImage === "string") data.coverImage = isValidMediaUrl(body.coverImage) ? body.coverImage : null;
    if (typeof body.name === "string" && body.name.trim().length >= 2) data.name = body.name.trim().slice(0, 40);
    if (typeof body.tag === "string") {
        const tag = body.tag.trim().toUpperCase().slice(0, 5);
        if (!/^[A-Z0-9]{2,5}$/.test(tag)) return NextResponse.json({ error: "Teg 2-5 ta lotin harf/raqam" }, { status: 400 });
        data.tag = tag;
    }
    if (typeof body.logo === "string") data.logo = isValidMediaUrl(body.logo) ? body.logo : null;
    if (typeof body.bio === "string") data.bio = body.bio.trim().slice(0, 300) || null;

    // nom/teg band tekshiruvi (o'zinikidan boshqa)
    if (data.name || data.tag) {
        const dup = await prisma.esTeam.findFirst({
            where: { id: { not: id }, OR: [...(data.name ? [{ name: data.name }] : []), ...(data.tag ? [{ tag: data.tag }] : [])] },
            select: { name: true, tag: true },
        });
        if (dup) return NextResponse.json({ error: dup.tag === data.tag ? "Bu teg band" : "Bu nom band" }, { status: 409 });
    }

    await prisma.esTeam.update({ where: { id }, data });
    return NextResponse.json({ ok: true });
}

// DELETE /api/esport/teams/[id] — o'chirish (faqat ega, FAQAT yolg'iz bo'lsa)
// Boshqa a'zolar bo'lsa — kelishuv shart: `teams/[id]/requests` (TEAM_DELETE, 100% ovoz).
// Bu endpoint o'sha qoidani chetlab o'tmasligi uchun a'zoli jamoani o'chirmaydi.
export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    const me = await getMyProfile();
    if (!me) return NextResponse.json({ error: "Avval tizimga kiring" }, { status: 401 });
    const owns = await prisma.esTeam.findFirst({ where: { id, ownerId: me.id }, select: { id: true } });
    if (!owns) return NextResponse.json({ error: "Faqat egasi" }, { status: 403 });

    // Roster lock: active turnirda o'chirib bo'lmaydi
    if (await isTeamLockedAny(id)) return NextResponse.json({ error: "Jamoa turnirda — o'chirish turnir tugagach mumkin" }, { status: 409 });

    // Egadan boshqa a'zolar bormi? — bo'lsa darhol o'chirib bo'lmaydi (kelishuv kerak)
    const rosters = await prisma.esRoster.findMany({ where: { teamId: id }, select: { members: { select: { athlete: { select: { humoProfileId: true } } } } } });
    const hasOthers = rosters.some(r => r.members.some(m => m.athlete.humoProfileId !== me.id));
    if (hasOthers) return NextResponse.json({ error: "Jamoada a'zolar bor — o'chirish uchun 100% rozilik kerak (so'rov yuboring)", needVote: true }, { status: 409 });

    await purgeTeam(id); // transfer bekor + standings + jamoa (cascade)
    return NextResponse.json({ ok: true });
}
