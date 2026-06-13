import { NextResponse, after } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { isVerifiedProfile } from "@/lib/nexus";
import { nexusRateLimited, RATE_MSG } from "@/lib/nexus-rate";
import { moderateOnCreate } from "@/lib/moderation";

async function meAndMember(email: string, channelId: string) {
    const me = await prisma.userProfile.findUnique({ where: { email }, select: { id: true, name: true, username: true, image: true, humoId: true, verified: true } });
    if (!me) return { me: null, channel: null, member: null };
    const channel = await prisma.nexusChannel.findUnique({ where: { id: channelId } });
    const member = channel ? await prisma.nexusChannelMember.findUnique({ where: { channelId_profileId: { channelId, profileId: me.id } } }) : null;
    return { me, channel, member };
}

// GET /api/nexus/channels/[id]/messages?since=<ISO> — xabarlar (polling)
export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const { id } = await params;
    const { me, channel, member } = await meAndMember(session.user.email, id);
    if (!me || !channel || channel.hidden) return NextResponse.json({ error: "Topilmadi" }, { status: 404 });
    if (channel.isPrivate && !member) return NextResponse.json({ error: "Yopiq" }, { status: 403 });

    const { searchParams } = new URL(req.url);
    const since = searchParams.get("since");
    const msgs = await prisma.nexusChannelMessage.findMany({
        where: { channelId: id, hidden: false, ...(since ? { createdAt: { gt: new Date(since) } } : {}) },
        orderBy: { createdAt: "asc" }, take: 100,
    });
    const ids = [...new Set(msgs.map(m => m.senderId))];
    const profs = ids.length ? await prisma.userProfile.findMany({ where: { id: { in: ids } }, select: { id: true, name: true, username: true, image: true, humoId: true, verified: true } }) : [];
    const pMap = Object.fromEntries(profs.map(p => [p.id, p]));

    // o'qildi belgilash
    if (member) after(() => prisma.nexusChannelMember.update({ where: { id: member.id }, data: { lastReadAt: new Date() } }).catch(() => { }));

    return NextResponse.json({
        messages: msgs.map(m => {
            const p = pMap[m.senderId];
            return {
                id: m.id, text: m.text, media: m.media, createdAt: m.createdAt, mine: m.senderId === me.id,
                author: p ? { name: p.name, username: p.username, image: p.image, verified: isVerifiedProfile(p) } : null,
            };
        }),
    });
}

// POST /api/nexus/channels/[id]/messages — xabar/post yuborish
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const { id } = await params;
    const { me, channel, member } = await meAndMember(session.user.email, id);
    if (!me || !channel || channel.hidden) return NextResponse.json({ error: "Topilmadi" }, { status: 404 });
    if (!member) return NextResponse.json({ error: "Avval a'zo bo'ling" }, { status: 403 });

    // CHANNEL — faqat owner/admin yozadi; GROUP — har bir a'zo
    const canPost = channel.type === "GROUP" ? true : (member.role === "OWNER" || member.role === "ADMIN");
    if (!canPost) return NextResponse.json({ error: "Bu kanalga faqat adminlar yoza oladi" }, { status: 403 });

    const { text, media } = await req.json();
    const cleanText = typeof text === "string" ? text.trim().slice(0, 4000) : "";
    const cleanMedia: string[] = Array.isArray(media) ? media.filter((x: unknown) => typeof x === "string").slice(0, 9) : [];
    if (!cleanText && !cleanMedia.length) return NextResponse.json({ error: "Bo'sh bo'lmasin" }, { status: 400 });
    if (await nexusRateLimited(me.id, "channelMsg")) return NextResponse.json({ error: RATE_MSG }, { status: 429 });

    const msg = await prisma.nexusChannelMessage.create({
        data: { channelId: id, senderId: me.id, text: cleanText || null, media: cleanMedia },
    });
    if (cleanText) after(() => moderateOnCreate({ module: "NEXUS", targetType: "CHANNEL_MESSAGE", targetId: msg.id, text: cleanText, kind: "kanal xabari" }));

    return NextResponse.json({
        message: {
            id: msg.id, text: msg.text, media: msg.media, createdAt: msg.createdAt, mine: true,
            author: { name: me.name, username: me.username, image: me.image, verified: isVerifiedProfile(me) },
        },
    });
}
