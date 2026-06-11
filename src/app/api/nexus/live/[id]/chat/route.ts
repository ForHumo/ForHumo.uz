import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { isVerifiedProfile } from "@/lib/nexus";

// GET /api/nexus/live/[id]/chat?since=<ISO> — chat xabarlari (polling)
export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    const { searchParams } = new URL(req.url);
    const since = searchParams.get("since");

    const msgs = await prisma.nexusLiveMessage.findMany({
        where: { streamId: id, ...(since ? { createdAt: { gt: new Date(since) } } : {}) },
        orderBy: { createdAt: "asc" },
        take: 100,
    });

    const ids = [...new Set(msgs.map(m => m.profileId))];
    const profs = ids.length
        ? await prisma.userProfile.findMany({ where: { id: { in: ids } }, select: { id: true, name: true, username: true, image: true, humoId: true } })
        : [];
    const pMap = Object.fromEntries(profs.map(p => [p.id, p]));

    return NextResponse.json({
        messages: msgs.map(m => {
            const p = pMap[m.profileId];
            return {
                id: m.id, text: m.text, createdAt: m.createdAt,
                author: p ? { name: p.name, username: p.username, image: p.image, verified: isVerifiedProfile(p) } : null,
            };
        }),
    });
}

// POST /api/nexus/live/[id]/chat — xabar yuborish
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const me = await prisma.userProfile.findUnique({
        where: { email: session.user.email },
        select: { id: true, name: true, username: true, image: true, humoId: true },
    });
    if (!me) return NextResponse.json({ error: "Profil topilmadi" }, { status: 404 });

    const { id } = await params;
    const stream = await prisma.nexusLiveStream.findUnique({ where: { id }, select: { status: true } });
    if (!stream) return NextResponse.json({ error: "Topilmadi" }, { status: 404 });
    if (stream.status === "ENDED") return NextResponse.json({ error: "Efir tugagan" }, { status: 400 });

    const { text } = await req.json();
    if (!text?.trim()) return NextResponse.json({ error: "Matn kerak" }, { status: 400 });

    const msg = await prisma.nexusLiveMessage.create({
        data: { streamId: id, profileId: me.id, text: String(text).trim().slice(0, 500) },
    });

    return NextResponse.json({
        message: {
            id: msg.id, text: msg.text, createdAt: msg.createdAt,
            author: { name: me.name, username: me.username, image: me.image, verified: isVerifiedProfile(me) },
        },
    });
}
