import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// Batch F — Chat xabarni o'chirish (streamer yoki xabar egasi)
export async function DELETE(_: Request, { params }: { params: Promise<{ id: string; msgId: string }> }) {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const me = await prisma.userProfile.findUnique({ where: { email: session.user.email }, select: { id: true } });
    if (!me) return NextResponse.json({ error: "Profil topilmadi" }, { status: 404 });

    const { id, msgId } = await params;
    const [stream, msg] = await Promise.all([
        prisma.nexusLiveStream.findUnique({ where: { id }, select: { profileId: true } }),
        prisma.nexusLiveMessage.findUnique({ where: { id: msgId }, select: { profileId: true, streamId: true, tipAmount: true } }),
    ]);
    if (!stream || !msg || msg.streamId !== id) return NextResponse.json({ error: "Topilmadi" }, { status: 404 });
    const isOwner = stream.profileId === me.id;
    const isMine = msg.profileId === me.id;
    if (!isOwner && !isMine) return NextResponse.json({ error: "Ruxsat yo'q" }, { status: 403 });
    // Super Chat'ni o'chirmaymiz (Zij tranzaksiyasi bo'lgan) — faqat yashiramiz
    await prisma.nexusLiveMessage.update({ where: { id: msgId }, data: { hidden: true } });
    return NextResponse.json({ ok: true });
}
