import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { nexusRateLimited, RATE_MSG } from "@/lib/nexus-rate";

// Batch G — Poll'ga ovoz berish (piggyback: __nx_vote:JSON)
// Bir marta ovoz. Server duplicate check qiladi.
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const me = await prisma.userProfile.findUnique({ where: { email: session.user.email }, select: { id: true } });
    if (!me) return NextResponse.json({ error: "Profil topilmadi" }, { status: 404 });

    const { id } = await params;
    const { pollId, optionIdx } = await req.json();
    if (!pollId || typeof optionIdx !== "number") return NextResponse.json({ error: "Noto'g'ri ma'lumot" }, { status: 400 });
    if (await nexusRateLimited(me.id, "liveChat")) return NextResponse.json({ error: RATE_MSG }, { status: 429 });

    // Duplicate check — shu poll'ga oldin ovoz berganmi?
    const existing = await prisma.nexusLiveMessage.findFirst({
        where: { streamId: id, profileId: me.id, text: { startsWith: `__nx_vote:{"pollId":"${pollId}"` } },
        select: { id: true },
    });
    if (existing) return NextResponse.json({ error: "Siz allaqachon ovoz bergansiz" }, { status: 400 });

    await prisma.nexusLiveMessage.create({
        data: { streamId: id, profileId: me.id, text: `__nx_vote:${JSON.stringify({ pollId, idx: Math.max(0, Math.min(9, Math.round(optionIdx))) })}` },
    });
    return NextResponse.json({ ok: true });
}
