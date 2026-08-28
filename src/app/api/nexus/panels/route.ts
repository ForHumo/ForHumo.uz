import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// Batch AM — Streamer paneli (per-profile)
// GET  /panels?username=X — barcha panellari (ochiq)
// POST /panels { kind, title, content, imageUrl?, linkUrl? } — o'zi qo'shadi
// DELETE /panels?id=X — o'zi o'chiradi
export async function GET(req: Request) {
    const { searchParams } = new URL(req.url);
    const username = searchParams.get("username");
    if (!username) return NextResponse.json({ panels: [] });
    const p = await prisma.userProfile.findUnique({ where: { username }, select: { id: true } });
    if (!p) return NextResponse.json({ panels: [] });
    const panels = await prisma.nexusLivePanel.findMany({
        where: { profileId: p.id },
        orderBy: [{ order: "asc" }, { createdAt: "asc" }],
        take: 10,
    });
    return NextResponse.json({ panels });
}

export async function POST(req: Request) {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const me = await prisma.userProfile.findUnique({ where: { email: session.user.email }, select: { id: true } });
    if (!me) return NextResponse.json({ error: "Profil topilmadi" }, { status: 404 });

    const count = await prisma.nexusLivePanel.count({ where: { profileId: me.id } });
    if (count >= 10) return NextResponse.json({ error: "Max 10 panel" }, { status: 400 });

    const body = await req.json();
    const kind = ["BIO", "SOCIALS", "SCHEDULE", "SPONSOR", "CUSTOM"].includes(body.kind) ? body.kind : "CUSTOM";
    const title = String(body.title || "").trim().slice(0, 80);
    const content = String(body.content || "").trim().slice(0, 500);
    if (!title) return NextResponse.json({ error: "Sarlavha kerak" }, { status: 400 });
    const imageUrl = typeof body.imageUrl === "string" && body.imageUrl.startsWith("http") ? body.imageUrl : null;
    const linkUrl = typeof body.linkUrl === "string" && body.linkUrl.startsWith("http") ? body.linkUrl : null;

    const panel = await prisma.nexusLivePanel.create({
        data: { profileId: me.id, kind, title, content, imageUrl, linkUrl, order: count },
    });
    return NextResponse.json({ panel });
}

export async function DELETE(req: Request) {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const me = await prisma.userProfile.findUnique({ where: { email: session.user.email }, select: { id: true } });
    if (!me) return NextResponse.json({ error: "Profil topilmadi" }, { status: 404 });
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    if (!id) return NextResponse.json({ error: "id kerak" }, { status: 400 });
    const panel = await prisma.nexusLivePanel.findUnique({ where: { id }, select: { profileId: true } });
    if (!panel || panel.profileId !== me.id) return NextResponse.json({ error: "Ruxsat yo'q" }, { status: 403 });
    await prisma.nexusLivePanel.delete({ where: { id } });
    return NextResponse.json({ ok: true });
}
