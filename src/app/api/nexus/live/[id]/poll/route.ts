import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { nexusRateLimited, RATE_MSG } from "@/lib/nexus-rate";

// Batch G — Jonli poll (piggyback: NexusLiveMessage text=__nx_poll:JSON)
// Streamer poll boshlaydi (30/60/180 sek). Viewer /vote orqali ovoz beradi.
// Ovoz __nx_vote:JSON sifatida yoziladi, chat GET'da aggregate hisoblanadi.

interface PollPayload { id: string; question: string; options: string[]; endsAt: string; }

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const me = await prisma.userProfile.findUnique({ where: { email: session.user.email }, select: { id: true } });
    if (!me) return NextResponse.json({ error: "Profil topilmadi" }, { status: 404 });

    const { id } = await params;
    const stream = await prisma.nexusLiveStream.findUnique({ where: { id }, select: { status: true, profileId: true } });
    if (!stream) return NextResponse.json({ error: "Topilmadi" }, { status: 404 });
    if (stream.status !== "LIVE") return NextResponse.json({ error: "Faol efir emas" }, { status: 400 });
    if (stream.profileId !== me.id) return NextResponse.json({ error: "Faqat streamer poll boshlashi mumkin" }, { status: 403 });
    if (await nexusRateLimited(me.id, "liveChat")) return NextResponse.json({ error: RATE_MSG }, { status: 429 });

    const { question, options, durationSec } = await req.json();
    const q = String(question || "").trim().slice(0, 200);
    const opts = Array.isArray(options) ? options.slice(0, 4).map(o => String(o).trim().slice(0, 80)).filter(Boolean) : [];
    if (!q || opts.length < 2) return NextResponse.json({ error: "Savol va kamida 2 variant kerak" }, { status: 400 });
    const dur = Math.max(15, Math.min(600, Number(durationSec) || 60));
    const pollId = "p" + Math.random().toString(36).slice(2, 10);
    const endsAt = new Date(Date.now() + dur * 1000).toISOString();
    const payload: PollPayload = { id: pollId, question: q, options: opts, endsAt };

    await prisma.nexusLiveMessage.create({
        data: { streamId: id, profileId: me.id, text: `__nx_poll:${JSON.stringify(payload)}` },
    });
    return NextResponse.json({ poll: payload });
}
