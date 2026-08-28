import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// Batch AK — Poll templates (streamer o'zi uchun qayta ishlatiladigan)
// GET  — o'zining templatelari
// POST { question, options[], durationSec } — yangi
// DELETE ?id=X — o'chirish
export async function GET() {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) return NextResponse.json({ templates: [] });
    const me = await prisma.userProfile.findUnique({ where: { email: session.user.email }, select: { id: true } });
    if (!me) return NextResponse.json({ templates: [] });
    const templates = await prisma.nexusLivePollTemplate.findMany({
        where: { profileId: me.id },
        orderBy: [{ usedCount: "desc" }, { createdAt: "desc" }],
        take: 20,
    });
    return NextResponse.json({ templates });
}

export async function POST(req: Request) {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const me = await prisma.userProfile.findUnique({ where: { email: session.user.email }, select: { id: true } });
    if (!me) return NextResponse.json({ error: "Profil topilmadi" }, { status: 404 });
    const body = await req.json();
    const question = String(body.question || "").trim().slice(0, 200);
    const options = Array.isArray(body.options)
        ? body.options.slice(0, 4).map((o: unknown) => String(o).trim().slice(0, 80)).filter(Boolean)
        : [];
    if (!question || options.length < 2) return NextResponse.json({ error: "Savol va 2+ variant kerak" }, { status: 400 });
    const durationSec = Math.max(15, Math.min(600, parseInt(body.durationSec) || 60));

    const count = await prisma.nexusLivePollTemplate.count({ where: { profileId: me.id } });
    if (count >= 20) return NextResponse.json({ error: "Max 20 shablon" }, { status: 400 });

    const template = await prisma.nexusLivePollTemplate.create({
        data: { profileId: me.id, question, options, durationSec },
    });
    return NextResponse.json({ template });
}

export async function DELETE(req: Request) {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const me = await prisma.userProfile.findUnique({ where: { email: session.user.email }, select: { id: true } });
    if (!me) return NextResponse.json({ error: "Profil topilmadi" }, { status: 404 });
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    if (!id) return NextResponse.json({ error: "id kerak" }, { status: 400 });
    const t = await prisma.nexusLivePollTemplate.findUnique({ where: { id }, select: { profileId: true } });
    if (!t || t.profileId !== me.id) return NextResponse.json({ error: "Ruxsat yo'q" }, { status: 403 });
    await prisma.nexusLivePollTemplate.delete({ where: { id } });
    return NextResponse.json({ ok: true });
}

// Poll yaratilganda template usedCount++ uchun helper (poll POST bilan chaqirilishi mumkin)
export async function PATCH(req: Request) {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const me = await prisma.userProfile.findUnique({ where: { email: session.user.email }, select: { id: true } });
    if (!me) return NextResponse.json({ error: "Profil topilmadi" }, { status: 404 });
    const { id } = await req.json();
    if (!id) return NextResponse.json({ error: "id kerak" }, { status: 400 });
    await prisma.nexusLivePollTemplate.updateMany({
        where: { id, profileId: me.id }, data: { usedCount: { increment: 1 } },
    });
    return NextResponse.json({ ok: true });
}
