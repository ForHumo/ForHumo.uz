import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// Batch K — Streamer scrolling ticker matn (piggyback: __nx_ticker:<text>)
// Bo'sh matn → o'chirish
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const me = await prisma.userProfile.findUnique({ where: { email: session.user.email }, select: { id: true } });
    if (!me) return NextResponse.json({ error: "Profil topilmadi" }, { status: 404 });

    const { id } = await params;
    const stream = await prisma.nexusLiveStream.findUnique({ where: { id }, select: { status: true, profileId: true } });
    if (!stream) return NextResponse.json({ error: "Topilmadi" }, { status: 404 });
    if (stream.profileId !== me.id) return NextResponse.json({ error: "Faqat streamer" }, { status: 403 });

    const { text } = await req.json();
    const clean = String(text || "").trim().slice(0, 200);
    await prisma.nexusLiveMessage.create({
        data: { streamId: id, profileId: me.id, text: `__nx_ticker:${clean}` },
    });
    return NextResponse.json({ ok: true, text: clean });
}
