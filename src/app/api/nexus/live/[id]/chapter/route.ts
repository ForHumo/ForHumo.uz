import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// Batch S — Live chapters/markers (streamer real vaqtda bo'lim belgilaydi)
// Piggyback: NexusLiveMessage text=__nx_chapter:<sec>:<label>
// VOD qayta ko'rishda progress bar'da nuqta bo'lib chiqadi.
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const me = await prisma.userProfile.findUnique({ where: { email: session.user.email }, select: { id: true } });
    if (!me) return NextResponse.json({ error: "Profil topilmadi" }, { status: 404 });

    const { id } = await params;
    const stream = await prisma.nexusLiveStream.findUnique({ where: { id }, select: { status: true, profileId: true, startedAt: true } });
    if (!stream) return NextResponse.json({ error: "Topilmadi" }, { status: 404 });
    if (stream.status !== "LIVE") return NextResponse.json({ error: "Faol efir emas" }, { status: 400 });
    if (stream.profileId !== me.id) return NextResponse.json({ error: "Faqat streamer" }, { status: 403 });
    if (!stream.startedAt) return NextResponse.json({ error: "Efir hali boshlanmagan" }, { status: 400 });

    const { label } = await req.json();
    const clean = String(label || "").trim().slice(0, 80);
    if (!clean) return NextResponse.json({ error: "Bo'lim nomi kerak" }, { status: 400 });

    const sec = Math.max(0, Math.floor((Date.now() - stream.startedAt.getTime()) / 1000));
    // Format: __nx_chapter:<sec>:<label> (label ichida ':' bo'lishi mumkin — split limit 3)
    const clean2 = clean.replace(/[\r\n]/g, " ");
    await prisma.nexusLiveMessage.create({
        data: { streamId: id, profileId: me.id, text: `__nx_chapter:${sec}:${clean2}` },
    });
    return NextResponse.json({ ok: true, sec, label: clean2 });
}
