import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { fullName, getEsportAdmin, getMyProfile } from "@/lib/esport";
import { isVerifiedProfile } from "@/lib/nexus";
import { effectiveStatus } from "@/lib/esport-contract";
import { formatMoney, type Currency } from "@/lib/money";

// PATCH /api/esport/athletes/[id] — transfer narxini belgilash (faqat admin/ega)
export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
    const admin = await getEsportAdmin();
    if (!admin) return NextResponse.json({ error: "Ruxsat yo'q" }, { status: 403 });
    const { id } = await params;
    const body = await req.json().catch(() => ({}));
    const raw = body.marketValue;
    const marketValue = raw === null || raw === "" || raw === undefined ? null : Math.max(0, Math.round(Number(raw)));
    if (marketValue !== null && !Number.isFinite(marketValue)) return NextResponse.json({ error: "Noto'g'ri narx" }, { status: 400 });
    try {
        const updated = await prisma.esAthlete.update({ where: { id }, data: { marketValue }, select: { id: true, marketValue: true } });
        return NextResponse.json({ ok: true, marketValue: updated.marketValue ? Number(updated.marketValue) : null });
    } catch {
        return NextResponse.json({ error: "Sportchi topilmadi" }, { status: 404 });
    }
}

// GET /api/esport/athletes/[id] — ommaviy sportchi profili
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    const a = await prisma.esAthlete.findUnique({
        where: { id },
        select: { id: true, ign: true, gameUserId: true, gameServer: true, role: true, createdAt: true, humoProfileId: true, gameId: true, image: true, coverImage: true, marketValue: true, game: { select: { name: true, slug: true } } },
    });
    if (!a) return NextResponse.json({ error: "Sportchi topilmadi" }, { status: 404 });

    const profile = await prisma.userProfile.findUnique({
        where: { id: a.humoProfileId },
        select: { firstName: true, lastName: true, name: true, username: true, image: true, humoId: true, verified: true },
    });

    // Hozirgi jamoa + tarkibdagi roli + Elo (joriy/maksimal/minimal) + jamoaga qachon qo'shilgani
    const membership = await prisma.esRosterMember.findUnique({
        where: { athleteId: id },
        select: { role: true, joinedAt: true, roster: { select: { rating: true, peakRating: true, lowRating: true, team: { select: { id: true, name: true, tag: true, logo: true } } } } },
    });

    // Jamoa natijalari (g'alaba/mag'lubiyat) — divizion jadvallaridan
    let results = null as null | { wins: number; losses: number; played: number };
    if (membership) {
        const standings = await prisma.esStanding.findMany({ where: { teamId: membership.roster.team.id }, select: { wins: true, losses: true, played: true } });
        results = standings.reduce((acc, s) => ({ wins: acc.wins + s.wins, losses: acc.losses + s.losses, played: acc.played + s.played }), { wins: 0, losses: 0, played: 0 });
    }

    // Shartnoma (faol/oxirgi) + uzaytirish huquqi (jamoa egasi)
    const c = await prisma.esContract.findFirst({ where: { athleteId: id }, orderBy: [{ status: "asc" }, { createdAt: "desc" }] });
    let contract = null as null | { id: string; salary: number | null; salaryLabel: string | null; startsAt: Date; endsAt: Date | null; status: string };
    let canExtend = false;
    if (c) {
        const cur = (c.currency === "USD" ? "USD" : "UZS") as Currency;
        contract = { id: c.id, salary: c.salary ? Number(c.salary) : null, salaryLabel: c.salary ? formatMoney(Number(c.salary), cur) : null, startsAt: c.startsAt, endsAt: c.endsAt, status: effectiveStatus(c) };
        const me = await getMyProfile();
        if (me) { const team = await prisma.esTeam.findUnique({ where: { id: c.teamId }, select: { ownerId: true } }); canExtend = !!team && team.ownerId === me.id; }
    }

    return NextResponse.json({
        contract, canExtend,
        athlete: {
            id: a.id, ign: a.ign, gameUserId: a.gameUserId, gameServer: a.gameServer, position: a.role,
            game: a.game, createdAt: a.createdAt, coverImage: a.coverImage ?? null,
            marketValue: a.marketValue ? Number(a.marketValue) : null,
            name: profile ? fullName(profile) : "", username: profile?.username ?? null,
            image: a.image ?? profile?.image ?? null, humoId: profile?.humoId ?? null,
            verified: profile ? isVerifiedProfile({ username: profile.username, humoId: profile.humoId, verified: profile.verified }) : false,
            team: membership ? {
                ...membership.roster.team, role: membership.role, joinedAt: membership.joinedAt,
                rating: membership.roster.rating, peakRating: membership.roster.peakRating, lowRating: membership.roster.lowRating,
            } : null,
            results,
        },
    });
}
