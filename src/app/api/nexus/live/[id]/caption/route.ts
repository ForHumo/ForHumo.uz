import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// Batch V — Live subtitles/captions (streamer Web Speech Recognition natijasi)
// POST /caption { text } — piggyback __nx_caption:<text>
// Streamer only, rate limit yo'q (client tomonda ~2s throttle qiladi)
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const me = await prisma.userProfile.findUnique({ where: { email: session.user.email }, select: { id: true } });
    if (!me) return NextResponse.json({ error: "Profil topilmadi" }, { status: 404 });

    const { id } = await params;
    const stream = await prisma.nexusLiveStream.findUnique({ where: { id }, select: { status: true, profileId: true } });
    if (!stream || stream.status !== "LIVE") return NextResponse.json({ error: "Faol emas" }, { status: 400 });
    if (stream.profileId !== me.id) return NextResponse.json({ error: "Faqat streamer" }, { status: 403 });

    const { text } = await req.json();
    const clean = String(text || "").trim().slice(0, 200).replace(/[\r\n]+/g, " ");
    if (!clean) return NextResponse.json({ error: "Bo'sh" }, { status: 400 });

    await prisma.nexusLiveMessage.create({
        data: { streamId: id, profileId: me.id, text: `__nx_caption:${clean}` },
    });
    return NextResponse.json({ ok: true });
}
