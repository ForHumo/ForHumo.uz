import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// Batch M — Chat ban (streamer chat'idan foydalanuvchini bloklash)
// POST/DELETE /api/nexus/live/[id]/ban { profileId }
async function guard(id: string, email: string | undefined) {
    if (!email) return { err: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
    const me = await prisma.userProfile.findUnique({ where: { email }, select: { id: true } });
    if (!me) return { err: NextResponse.json({ error: "Profil topilmadi" }, { status: 404 }) };
    const stream = await prisma.nexusLiveStream.findUnique({ where: { id }, select: { profileId: true, bannedUserIds: true } });
    if (!stream) return { err: NextResponse.json({ error: "Topilmadi" }, { status: 404 }) };
    if (stream.profileId !== me.id) return { err: NextResponse.json({ error: "Faqat streamer" }, { status: 403 }) };
    return { me, stream };
}

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
    const session = await getServerSession(authOptions);
    const { id } = await params;
    const g = await guard(id, session?.user?.email || undefined); if ("err" in g) return g.err;
    const { profileId } = await req.json();
    if (!profileId || typeof profileId !== "string") return NextResponse.json({ error: "profileId kerak" }, { status: 400 });
    if (profileId === g.me.id) return NextResponse.json({ error: "O'zingizni ban qila olmaysiz" }, { status: 400 });
    const list = [...new Set([...(g.stream.bannedUserIds || []), profileId])].slice(0, 500);
    await prisma.nexusLiveStream.update({ where: { id }, data: { bannedUserIds: list } });
    // Ushbu foydalanuvchining chat xabarlarini avto-yashirish
    await prisma.nexusLiveMessage.updateMany({ where: { streamId: id, profileId }, data: { hidden: true } });
    return NextResponse.json({ ok: true, bannedUserIds: list });
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
    const session = await getServerSession(authOptions);
    const { id } = await params;
    const g = await guard(id, session?.user?.email || undefined); if ("err" in g) return g.err;
    const { profileId } = await req.json();
    const list = (g.stream.bannedUserIds || []).filter(x => x !== profileId);
    await prisma.nexusLiveStream.update({ where: { id }, data: { bannedUserIds: list } });
    return NextResponse.json({ ok: true, bannedUserIds: list });
}
