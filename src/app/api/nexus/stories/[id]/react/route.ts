import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { nexusNotify } from "@/lib/nexus-notify";
import { after } from "next/server";
import { banGuard } from "@/lib/moderation-guard";
import { nexusRateLimited, RATE_MSG } from "@/lib/nexus-rate";

const ALLOWED = new Set(["❤️", "😂", "😮", "🔥", "👏", "😢"]);

// POST /api/nexus/stories/[id]/react — story'ga emoji reaksiya (Instagram uslubi)
// body: { emoji: string, slideId?: string }
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const { id: storyId } = await params;
    const me = await prisma.userProfile.findUnique({ where: { email: session.user.email }, select: { id: true } });
    if (!me) return NextResponse.json({ error: "Profil topilmadi" }, { status: 404 });
    const banned = await banGuard(me.id); if (banned) return banned;
    // Spam himoyasi — reaksiyalar 10 daq'da 30 tagacha (dm bilan bir xil budjet)
    if (await nexusRateLimited(me.id, "dm")) return NextResponse.json({ error: RATE_MSG }, { status: 429 });

    const { emoji, slideId } = (await req.json()) as { emoji?: string; slideId?: string };
    if (!emoji || !ALLOWED.has(emoji)) return NextResponse.json({ error: "Emoji noto'g'ri" }, { status: 400 });

    const story = await prisma.nexusStory.findUnique({
        where: { id: storyId }, select: { profileId: true, expiresAt: true },
    });
    if (!story) return NextResponse.json({ error: "Story topilmadi" }, { status: 404 });
    if (story.expiresAt < new Date()) return NextResponse.json({ error: "Story muddati tugagan" }, { status: 400 });

    await prisma.nexusStoryReaction.create({
        data: { storyId, profileId: me.id, slideId: slideId || null, emoji },
    });

    // Story egasiga bildirishnoma (o'zidan tashqari)
    if (story.profileId !== me.id) {
        after(() => nexusNotify({
            recipientId: story.profileId,
            actorId: me.id,
            type: "LIKE",   // MOD_WARN'dan boshqa mavjud tur — story reaction alohida tur bo'lishi mumkin kelajakda
        }));
    }

    return NextResponse.json({ ok: true });
}

// GET /api/nexus/stories/[id]/react — reaksiyalarni ko'rish (faqat ega)
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const { id: storyId } = await params;
    const me = await prisma.userProfile.findUnique({ where: { email: session.user.email }, select: { id: true } });
    if (!me) return NextResponse.json({ error: "Profil topilmadi" }, { status: 404 });

    const story = await prisma.nexusStory.findUnique({ where: { id: storyId }, select: { profileId: true } });
    if (!story) return NextResponse.json({ error: "Story topilmadi" }, { status: 404 });
    if (story.profileId !== me.id) return NextResponse.json({ error: "Ruxsat yo'q" }, { status: 403 });

    const reactions = await prisma.nexusStoryReaction.findMany({
        where: { storyId }, orderBy: { createdAt: "desc" }, take: 100,
    });
    const profIds = [...new Set(reactions.map(r => r.profileId))];
    const profs = profIds.length
        ? await prisma.userProfile.findMany({ where: { id: { in: profIds } }, select: { id: true, name: true, username: true, image: true } })
        : [];
    const pMap = Object.fromEntries(profs.map(p => [p.id, p]));

    return NextResponse.json({
        reactions: reactions.map(r => ({
            emoji: r.emoji, slideId: r.slideId, createdAt: r.createdAt,
            actor: pMap[r.profileId] ?? null,
        })),
    });
}
