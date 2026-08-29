import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { after } from "next/server";
import { sendPushToProfile } from "@/lib/push";

// Batch CD — Chat moderators
// POST { username } — moderator qilish (streamer only)
// DELETE { profileId } — moderator'ni olib tashlash
async function guard(id: string, email: string | undefined) {
    if (!email) return { err: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
    const me = await prisma.userProfile.findUnique({ where: { email }, select: { id: true, name: true, username: true } });
    if (!me) return { err: NextResponse.json({ error: "Profil topilmadi" }, { status: 404 }) };
    const stream = await prisma.nexusLiveStream.findUnique({ where: { id }, select: { profileId: true, moderatorIds: true, title: true } });
    if (!stream) return { err: NextResponse.json({ error: "Topilmadi" }, { status: 404 }) };
    if (stream.profileId !== me.id) return { err: NextResponse.json({ error: "Faqat streamer" }, { status: 403 }) };
    return { me, stream };
}

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
    const session = await getServerSession(authOptions);
    const { id } = await params;
    const g = await guard(id, session?.user?.email || undefined); if ("err" in g) return g.err;
    const { username } = await req.json();
    const uname = String(username || "").trim().replace(/^@/, "").toLowerCase();
    if (!uname) return NextResponse.json({ error: "username kerak" }, { status: 400 });
    const target = await prisma.userProfile.findUnique({ where: { username: uname }, select: { id: true } });
    if (!target) return NextResponse.json({ error: "Foydalanuvchi topilmadi" }, { status: 404 });
    if (target.id === g.me.id) return NextResponse.json({ error: "O'zingizni moderator qila olmaysiz" }, { status: 400 });

    const list = [...new Set([...(g.stream.moderatorIds || []), target.id])].slice(0, 20);
    await prisma.nexusLiveStream.update({ where: { id }, data: { moderatorIds: list } });

    after(() => sendPushToProfile(target.id, {
        title: "Moderator qilib tayinlandingiz",
        body: `"${g.stream.title}" efirida moderator huquqi berildi`,
        url: `/nexus/live/${id}`, tag: `nx-mod-${id}`,
    }).catch(() => null));
    after(() => prisma.nexusLiveMessage.create({
        data: { streamId: id, profileId: g.me.id, text: `__nx_system:@${uname} moderator qilindi` },
    }).catch(() => null));

    return NextResponse.json({ ok: true, moderatorIds: list });
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
    const session = await getServerSession(authOptions);
    const { id } = await params;
    const g = await guard(id, session?.user?.email || undefined); if ("err" in g) return g.err;
    const { profileId } = await req.json();
    const list = (g.stream.moderatorIds || []).filter(x => x !== profileId);
    await prisma.nexusLiveStream.update({ where: { id }, data: { moderatorIds: list } });
    return NextResponse.json({ ok: true, moderatorIds: list });
}
