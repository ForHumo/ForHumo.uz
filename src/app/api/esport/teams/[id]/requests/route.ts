import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getMyProfile, purgeTeam } from "@/lib/esport";
import { esNotify, esNotifyMany } from "@/lib/esport-notify";

// Jamoa a'zolari (athleteId + humoProfileId) — owner aniqlash uchun
async function teamMembers(teamId: string) {
    const rosters = await prisma.esRoster.findMany({
        where: { teamId },
        select: { members: { select: { athleteId: true, athlete: { select: { humoProfileId: true, ign: true } } } } },
    });
    return rosters.flatMap(r => r.members.map(m => ({ athleteId: m.athleteId, humoProfileId: m.athlete.humoProfileId, ign: m.athlete.ign })));
}

// GET — jamoaning kutilayotgan so'rovlari (UI filtrlaydi)
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    const reqs = await prisma.esRequest.findMany({
        where: { teamId: id, status: "PENDING" },
        include: { approvals: { select: { athleteId: true } } },
        orderBy: { createdAt: "desc" },
    });
    // sportchi nomlari
    const athIds = [...new Set(reqs.map(r => r.athleteId).filter(Boolean) as string[])];
    const aths = athIds.length ? await prisma.esAthlete.findMany({ where: { id: { in: athIds } }, select: { id: true, ign: true } }) : [];
    const aMap = Object.fromEntries(aths.map(a => [a.id, a.ign]));
    return NextResponse.json({
        requests: reqs.map(r => ({
            id: r.id, type: r.type, athleteId: r.athleteId, ign: r.athleteId ? aMap[r.athleteId] ?? null : null,
            approvals: r.approvals.map(a => a.athleteId), createdAt: r.createdAt,
        })),
    });
}

// POST — so'rov yaratish { type: LEAVE|KICK|TEAM_DELETE, athleteId? }
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    const me = await getMyProfile();
    if (!me) return NextResponse.json({ error: "Avval tizimga kiring" }, { status: 401 });

    const team = await prisma.esTeam.findUnique({ where: { id }, select: { id: true, ownerId: true } });
    if (!team) return NextResponse.json({ error: "Jamoa topilmadi" }, { status: 404 });

    const { type, athleteId } = await req.json();
    const isOwner = team.ownerId === me.id;
    const members = await teamMembers(id);
    const myAthlete = await prisma.esAthlete.findUnique({ where: { humoProfileId: me.id }, select: { id: true } });

    // takror so'rov bo'lmasin
    async function ensureNoDup(t: string, aId?: string | null) {
        const dup = await prisma.esRequest.findFirst({ where: { teamId: id, type: t, status: "PENDING", ...(aId ? { athleteId: aId } : {}) }, select: { id: true } });
        return !!dup;
    }

    if (type === "LEAVE") {
        if (!myAthlete || !members.some(m => m.athleteId === myAthlete.id)) return NextResponse.json({ error: "Siz bu jamoa a'zosi emassiz" }, { status: 400 });
        if (isOwner) return NextResponse.json({ error: "Ega chiqa olmaydi — jamoani o'chiring yoki egalikni o'tkazing" }, { status: 400 });
        if (await ensureNoDup("LEAVE", myAthlete.id)) return NextResponse.json({ error: "So'rov allaqachon yuborilgan" }, { status: 409 });
        await prisma.esRequest.create({ data: { type: "LEAVE", teamId: id, athleteId: myAthlete.id, initiatedBy: me.id } });
        await esNotify(team.ownerId, { type: "LEAVE_REQ", title: "Chiqish so'rovi", body: "A'zo jamoadan chiqmoqchi — tasdiqlang", href: `/esport/teams/${id}` });
        return NextResponse.json({ ok: true, message: "Chiqish so'rovi jamoa egasiga yuborildi" });
    }

    if (type === "KICK") {
        if (!isOwner) return NextResponse.json({ error: "Faqat jamoa egasi" }, { status: 403 });
        const target = members.find(m => m.athleteId === athleteId);
        if (!target) return NextResponse.json({ error: "Sportchi topilmadi" }, { status: 404 });
        if (target.humoProfileId === team.ownerId) return NextResponse.json({ error: "O'zingizni chiqara olmaysiz" }, { status: 400 });
        if (await ensureNoDup("KICK", athleteId)) return NextResponse.json({ error: "So'rov allaqachon yuborilgan" }, { status: 409 });
        await prisma.esRequest.create({ data: { type: "KICK", teamId: id, athleteId, initiatedBy: me.id } });
        await esNotify(target.humoProfileId, { type: "KICK_REQ", title: "Jamoadan chiqarish so'rovi", body: "Jamoa sizni chiqarmoqchi — rozimisiz?", href: `/esport/teams/${id}` });
        return NextResponse.json({ ok: true, message: "Chiqarish so'rovi sportchiga yuborildi" });
    }

    if (type === "TEAM_DELETE") {
        if (!isOwner) return NextResponse.json({ error: "Faqat jamoa egasi" }, { status: 403 });
        const others = members.filter(m => m.humoProfileId !== team.ownerId);
        if (others.length === 0) {
            await purgeTeam(id); // transfer bekor + standings + jamoa (cascade)
            return NextResponse.json({ ok: true, deleted: true, message: "Jamoa o'chirildi" });
        }
        if (await ensureNoDup("TEAM_DELETE")) return NextResponse.json({ error: "O'chirish so'rovi allaqachon faol" }, { status: 409 });
        await prisma.esRequest.create({ data: { type: "TEAM_DELETE", teamId: id, initiatedBy: me.id } });
        await esNotifyMany(others.map(o => o.humoProfileId), { type: "TEAM_DELETE_REQ", title: "Jamoa o'chirilishiga rozilik", body: "Jamoa egasi jamoani o'chirmoqchi — ovoz bering", href: `/esport/teams/${id}` });
        return NextResponse.json({ ok: true, message: `O'chirish uchun ${others.length} a'zoning 100% roziligi kerak` });
    }

    return NextResponse.json({ error: "Noto'g'ri tur" }, { status: 400 });
}
