import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// Batch AF — Streamer efir jadvali (per-profile)
// GET  ?username=X — ochiq
// POST — o'zi qo'shadi
// DELETE ?id=X — o'zi
export async function GET(req: Request) {
    const { searchParams } = new URL(req.url);
    const username = searchParams.get("username");
    if (!username) return NextResponse.json({ schedule: [] });
    const p = await prisma.userProfile.findUnique({ where: { username }, select: { id: true } });
    if (!p) return NextResponse.json({ schedule: [] });
    const schedule = await prisma.nexusLiveSchedule.findMany({
        where: { profileId: p.id, active: true },
        orderBy: [{ dayOfWeek: "asc" }, { hour: "asc" }, { minute: "asc" }],
        take: 40,
    });
    return NextResponse.json({ schedule });
}

export async function POST(req: Request) {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const me = await prisma.userProfile.findUnique({ where: { email: session.user.email }, select: { id: true } });
    if (!me) return NextResponse.json({ error: "Profil topilmadi" }, { status: 404 });
    const body = await req.json();

    const kind = body.kind === "ONETIME" ? "ONETIME" : "RECURRING";
    const dayOfWeek = kind === "RECURRING" ? Math.max(0, Math.min(6, parseInt(body.dayOfWeek))) : null;
    const dateISO = kind === "ONETIME" && typeof body.dateISO === "string" ? body.dateISO.slice(0, 10) : null;
    const hour = Math.max(0, Math.min(23, parseInt(body.hour) || 0));
    const minute = Math.max(0, Math.min(59, parseInt(body.minute) || 0));
    const title = String(body.title || "").trim().slice(0, 100);
    const category = String(body.category || "").trim().slice(0, 30) || null;
    if (!title) return NextResponse.json({ error: "Sarlavha kerak" }, { status: 400 });
    if (kind === "RECURRING" && dayOfWeek === null) return NextResponse.json({ error: "Kun kerak" }, { status: 400 });
    if (kind === "ONETIME" && !dateISO) return NextResponse.json({ error: "Sana kerak" }, { status: 400 });

    const count = await prisma.nexusLiveSchedule.count({ where: { profileId: me.id, active: true } });
    if (count >= 20) return NextResponse.json({ error: "Max 20 jadval" }, { status: 400 });

    const item = await prisma.nexusLiveSchedule.create({
        data: { profileId: me.id, kind, dayOfWeek, dateISO, hour, minute, title, category },
    });
    return NextResponse.json({ item });
}

export async function DELETE(req: Request) {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const me = await prisma.userProfile.findUnique({ where: { email: session.user.email }, select: { id: true } });
    if (!me) return NextResponse.json({ error: "Profil topilmadi" }, { status: 404 });
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    if (!id) return NextResponse.json({ error: "id kerak" }, { status: 400 });
    const item = await prisma.nexusLiveSchedule.findUnique({ where: { id }, select: { profileId: true } });
    if (!item || item.profileId !== me.id) return NextResponse.json({ error: "Ruxsat yo'q" }, { status: 403 });
    await prisma.nexusLiveSchedule.delete({ where: { id } });
    return NextResponse.json({ ok: true });
}
