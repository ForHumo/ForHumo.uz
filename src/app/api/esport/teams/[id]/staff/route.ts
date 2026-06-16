import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getMyProfile, fullName } from "@/lib/esport";
import { esNotify } from "@/lib/esport-notify";

const ROLES = ["VICE_OWNER", "COACH", "CAPTAIN", "STAFF"];
const SINGLE = ["VICE_OWNER", "COACH", "CAPTAIN"]; // jamoada bittadan

// GET /api/esport/teams/[id]/staff — lavozimlar ro'yxati (ommaviy)
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    const staff = await prisma.esTeamStaff.findMany({ where: { teamId: id }, orderBy: { createdAt: "asc" } });
    const profs = staff.length ? await prisma.userProfile.findMany({ where: { id: { in: staff.map(s => s.profileId) } }, select: { id: true, firstName: true, lastName: true, name: true, username: true, image: true, humoId: true } }) : [];
    const pMap = Object.fromEntries(profs.map(p => [p.id, p]));
    return NextResponse.json({
        staff: staff.map(s => {
            const p = pMap[s.profileId];
            return { id: s.id, profileId: s.profileId, role: s.role, title: s.title, name: p ? fullName(p) : "", username: p?.username ?? null, image: p?.image ?? null, humoId: p?.humoId ?? null };
        }),
    });
}

// POST /api/esport/teams/[id]/staff — lavozim berish (faqat ega) { identifier, role, title? }
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    const me = await getMyProfile();
    if (!me) return NextResponse.json({ error: "Avval tizimga kiring" }, { status: 401 });
    const team = await prisma.esTeam.findUnique({ where: { id }, select: { ownerId: true } });
    if (!team || team.ownerId !== me.id) return NextResponse.json({ error: "Faqat jamoa egasi" }, { status: 403 });

    const b = await req.json().catch(() => ({}));
    const role = ROLES.includes(b.role) ? b.role : null;
    if (!role) return NextResponse.json({ error: "Noto'g'ri lavozim" }, { status: 400 });
    const title = role === "STAFF" && typeof b.title === "string" && b.title.trim() ? b.title.trim().slice(0, 40) : null;

    // Odamni Humo ID (UZ...) yoki @username bo'yicha topamiz
    const ident = String(b.identifier || "").trim();
    if (!ident) return NextResponse.json({ error: "Humo ID yoki @username kiriting" }, { status: 400 });
    const target = /^UZ\d{7}$/i.test(ident)
        ? await prisma.userProfile.findUnique({ where: { humoId: ident.toUpperCase() }, select: { id: true } })
        : await prisma.userProfile.findFirst({ where: { username: ident.replace(/^@/, "") }, select: { id: true } });
    if (!target) return NextResponse.json({ error: "Foydalanuvchi topilmadi" }, { status: 404 });
    if (target.id === team.ownerId) return NextResponse.json({ error: "Ega allaqachon rahbar" }, { status: 400 });

    // Yagona lavozim band emasligini tekshiramiz (boshqa odamda)
    if (SINGLE.includes(role)) {
        const taken = await prisma.esTeamStaff.findFirst({ where: { teamId: id, role, profileId: { not: target.id } }, select: { id: true } });
        if (taken) return NextResponse.json({ error: "Bu lavozim allaqachon band — avval olib tashlang" }, { status: 409 });
    }

    await prisma.esTeamStaff.upsert({
        where: { teamId_profileId: { teamId: id, profileId: target.id } },
        create: { teamId: id, profileId: target.id, role, title },
        update: { role, title },
    });
    await esNotify(target.id, { type: "TEAM_ROLE", title: "Jamoa lavozimi", body: "Sizga jamoaда lavozim berildi", href: `/esport/teams/${id}` });
    return NextResponse.json({ ok: true });
}

// DELETE /api/esport/teams/[id]/staff — lavozimni olib tashlash (faqat ega) { profileId }
export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    const me = await getMyProfile();
    if (!me) return NextResponse.json({ error: "Avval tizimga kiring" }, { status: 401 });
    const team = await prisma.esTeam.findUnique({ where: { id }, select: { ownerId: true } });
    if (!team || team.ownerId !== me.id) return NextResponse.json({ error: "Faqat jamoa egasi" }, { status: 403 });
    const b = await req.json().catch(() => ({}));
    const profileId = String(b.profileId || "");
    if (!profileId) return NextResponse.json({ error: "profileId kerak" }, { status: 400 });
    await prisma.esTeamStaff.deleteMany({ where: { teamId: id, profileId } });
    return NextResponse.json({ ok: true });
}
