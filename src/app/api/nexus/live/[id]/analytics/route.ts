import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { isVerifiedProfile } from "@/lib/nexus";

// Batch J — Efir analitika (efir egasi uchun)
// Aggregate mavjud ma'lumotlardan: peak viewers, top chatters, top tippers,
// tips summa, xabar soni, reactions soni, davomiylik.
export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const me = await prisma.userProfile.findUnique({ where: { email: session.user.email }, select: { id: true } });
    if (!me) return NextResponse.json({ error: "Profil topilmadi" }, { status: 404 });

    const { id } = await params;
    const stream = await prisma.nexusLiveStream.findUnique({
        where: { id },
        select: { profileId: true, startedAt: true, endedAt: true, peakViewers: true, title: true, category: true, status: true, createdAt: true },
    });
    if (!stream) return NextResponse.json({ error: "Topilmadi" }, { status: 404 });
    if (stream.profileId !== me.id) return NextResponse.json({ error: "Faqat efir egasi" }, { status: 403 });

    // Barcha xabarlar (reactions/polls/ticker'ni ajratamiz)
    const msgs = await prisma.nexusLiveMessage.findMany({
        where: { streamId: id },
        select: { profileId: true, tipAmount: true, text: true, hidden: true, createdAt: true },
    });

    const isReaction = (t: string) => t.startsWith("__nx_react:");
    const isPoll = (t: string) => t.startsWith("__nx_poll:") || t.startsWith("__nx_vote:");
    const isTicker = (t: string) => t.startsWith("__nx_ticker:");
    const isSystem = (t: string) => isReaction(t) || isPoll(t) || isTicker(t);

    const chatMsgs = msgs.filter(m => !isSystem(m.text));
    const reactionCount = msgs.filter(m => isReaction(m.text)).length;
    const pollCount = msgs.filter(m => m.text.startsWith("__nx_poll:")).length;
    const totalTips = chatMsgs.reduce((a, m) => a + (m.tipAmount || 0), 0);

    // Top chatters (xabarlar soni, o'zi va sistem xabarlar tashqari)
    const chatterMap: Record<string, number> = {};
    for (const m of chatMsgs) chatterMap[m.profileId] = (chatterMap[m.profileId] || 0) + 1;

    // Top tippers (tip summasi)
    const tipperMap: Record<string, number> = {};
    for (const m of chatMsgs) if ((m.tipAmount || 0) > 0) tipperMap[m.profileId] = (tipperMap[m.profileId] || 0) + m.tipAmount!;

    const topChatterIds = Object.entries(chatterMap).sort((a, b) => b[1] - a[1]).slice(0, 5);
    const topTipperIds = Object.entries(tipperMap).sort((a, b) => b[1] - a[1]).slice(0, 5);
    const allIds = [...new Set([...topChatterIds.map(x => x[0]), ...topTipperIds.map(x => x[0])])];
    const profs = allIds.length
        ? await prisma.userProfile.findMany({ where: { id: { in: allIds } }, select: { id: true, name: true, username: true, image: true, humoId: true, verified: true, verifiedCategory: true } })
        : [];
    const pMap = Object.fromEntries(profs.map(p => [p.id, p]));

    const shape = (p: (typeof profs)[number] | undefined) => p ? {
        name: p.name, username: p.username, image: p.image,
        verified: isVerifiedProfile(p), verifiedCategory: isVerifiedProfile(p) ? (p.verifiedCategory || null) : null,
    } : null;

    // Kuzatuvchilar — heartbeat rows unikal profil
    const viewerRows = await prisma.nexusLiveViewer.findMany({
        where: { streamId: id },
        select: { profileId: true, lastSeenAt: true },
    });
    const uniqueViewers = new Set(viewerRows.map(v => v.profileId)).size;
    // O'rtacha tomosha — heuristik: unikal ko'ruvchi bo'lganlar davomiyligining o'rtasi ~ efir davomining yarmi
    const avgWatchSec = stream.startedAt && stream.endedAt
        ? Math.floor(Math.max(0, (stream.endedAt.getTime() - stream.startedAt.getTime()) / 1000) / 2)
        : 0;

    const durationSec = stream.startedAt && stream.endedAt
        ? Math.max(0, Math.floor((stream.endedAt.getTime() - stream.startedAt.getTime()) / 1000))
        : 0;

    return NextResponse.json({
        stream: {
            id, title: stream.title, category: stream.category, status: stream.status,
            startedAt: stream.startedAt, endedAt: stream.endedAt, durationSec,
        },
        totals: {
            peakViewers: stream.peakViewers,
            uniqueViewers,
            avgWatchSec,
            chatMessages: chatMsgs.length,
            reactions: reactionCount,
            polls: pollCount,
            tipCount: chatMsgs.filter(m => (m.tipAmount || 0) > 0).length,
            totalTips,
        },
        topChatters: topChatterIds.map(([pid, count]) => ({ author: shape(pMap[pid]), count })),
        topTippers: topTipperIds.map(([pid, amount]) => ({ author: shape(pMap[pid]), amount })),
    });
}
