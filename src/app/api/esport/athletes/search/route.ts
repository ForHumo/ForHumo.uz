import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getMyProfile, fullName } from "@/lib/esport";

// GET /api/esport/athletes/search?q=&gameId= — sportchi qidirish (transfer taklifi uchun)
export async function GET(req: Request) {
    const me = await getMyProfile();
    if (!me) return NextResponse.json({ athletes: [] });
    const sp = new URL(req.url).searchParams;
    const q = (sp.get("q") || "").trim();
    const gameId = sp.get("gameId") || undefined;
    if (q.length < 2) return NextResponse.json({ athletes: [] });

    // IGN bo'yicha qidirish + ism bo'yicha (profil orqali)
    const byIgn = await prisma.esAthlete.findMany({
        where: { ign: { contains: q, mode: "insensitive" }, ...(gameId ? { gameId } : {}) },
        select: { id: true, ign: true, role: true, humoProfileId: true, game: { select: { name: true, slug: true } } },
        take: 12,
    });

    const humoIds = byIgn.map(a => a.humoProfileId);
    const profs = humoIds.length ? await prisma.userProfile.findMany({ where: { id: { in: humoIds } }, select: { id: true, firstName: true, lastName: true, name: true, image: true } }) : [];
    const pMap = Object.fromEntries(profs.map(p => [p.id, p]));

    // Hozirgi jamoasi
    const ids = byIgn.map(a => a.id);
    const memberships = ids.length ? await prisma.esRosterMember.findMany({ where: { athleteId: { in: ids } }, select: { athleteId: true, roster: { select: { team: { select: { name: true, tag: true } } } } } }) : [];
    const mMap = Object.fromEntries(memberships.map(m => [m.athleteId, m.roster.team]));

    return NextResponse.json({
        athletes: byIgn.map(a => {
            const p = pMap[a.humoProfileId];
            return {
                id: a.id, ign: a.ign, role: a.role, game: a.game,
                name: p ? fullName(p) : "", image: p?.image ?? null,
                team: mMap[a.id] ? { name: mMap[a.id].name, tag: mMap[a.id].tag } : null,
            };
        }),
    });
}
