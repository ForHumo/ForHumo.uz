import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// Batch AI — Custom emotes (per streamer)
// GET  /emotes?username=X — barcha emotes (chat renderer uchun)
// POST /emotes { name, imageUrl } — o'zi qo'shadi
// DELETE /emotes?id=X — o'zi o'chiradi

// Emote name qoidasi: [a-z0-9_], 2-20 char
const NAME_RX = /^[a-z0-9_]{2,20}$/;

export async function GET(req: Request) {
    const { searchParams } = new URL(req.url);
    const username = searchParams.get("username");
    if (!username) return NextResponse.json({ emotes: [] });
    const p = await prisma.userProfile.findUnique({ where: { username }, select: { id: true } });
    if (!p) return NextResponse.json({ emotes: [] });
    const emotes = await prisma.nexusLiveEmote.findMany({
        where: { profileId: p.id },
        orderBy: [{ order: "asc" }, { createdAt: "asc" }],
        take: 100,
    });
    return NextResponse.json({ emotes });
}

export async function POST(req: Request) {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const me = await prisma.userProfile.findUnique({ where: { email: session.user.email }, select: { id: true } });
    if (!me) return NextResponse.json({ error: "Profil topilmadi" }, { status: 404 });

    const count = await prisma.nexusLiveEmote.count({ where: { profileId: me.id } });
    if (count >= 100) return NextResponse.json({ error: "Max 100 emote" }, { status: 400 });

    const body = await req.json();
    const name = String(body.name || "").trim().toLowerCase();
    if (!NAME_RX.test(name)) return NextResponse.json({ error: "Nom faqat a-z, 0-9, _ (2-20 char)" }, { status: 400 });
    const imageUrl = String(body.imageUrl || "").trim();
    if (!imageUrl.startsWith("http")) return NextResponse.json({ error: "Rasm URL kerak" }, { status: 400 });

    try {
        const emote = await prisma.nexusLiveEmote.create({
            data: { profileId: me.id, name, imageUrl, order: count },
        });
        return NextResponse.json({ emote });
    } catch {
        return NextResponse.json({ error: "Bu nom band" }, { status: 400 });
    }
}

export async function DELETE(req: Request) {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const me = await prisma.userProfile.findUnique({ where: { email: session.user.email }, select: { id: true } });
    if (!me) return NextResponse.json({ error: "Profil topilmadi" }, { status: 404 });
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    if (!id) return NextResponse.json({ error: "id kerak" }, { status: 400 });
    const em = await prisma.nexusLiveEmote.findUnique({ where: { id }, select: { profileId: true } });
    if (!em || em.profileId !== me.id) return NextResponse.json({ error: "Ruxsat yo'q" }, { status: 403 });
    await prisma.nexusLiveEmote.delete({ where: { id } });
    return NextResponse.json({ ok: true });
}
