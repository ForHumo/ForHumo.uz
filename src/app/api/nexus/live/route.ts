import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { isVerifiedProfile } from "@/lib/nexus";
import { nexusRateLimited, RATE_MSG } from "@/lib/nexus-rate";
import { nexusNotifyFollowers } from "@/lib/nexus-notify";
import { moderateOnCreate } from "@/lib/moderation";
import { getHiddenAuthorIds } from "@/lib/nexus-block";
import { after } from "next/server";

// Onlayn ko'ruvchi — oxirgi 30 soniyada heartbeat yuborganlar
const VIEWER_WINDOW_MS = 30_000;

// GET /api/nexus/live — efirlar ro'yxati (status=live|upcoming|ended, category)
export async function GET(req: Request) {
    const { searchParams } = new URL(req.url);
    const statusParam = (searchParams.get("status") || "live").toUpperCase();
    const status = ["LIVE", "UPCOMING", "ENDED"].includes(statusParam) ? statusParam as "LIVE" | "UPCOMING" | "ENDED" : "LIVE";
    const category = searchParams.get("category") || "";
    const author = searchParams.get("author") || "";
    const limit = Math.min(Number(searchParams.get("limit") ?? 20), 40);

    // Muallif berilsa — uning ochiq efirlari (har qanday status, eng yangidan)
    let authorId: string | null = null;
    if (author) {
        const a = await prisma.userProfile.findUnique({ where: { username: author }, select: { id: true } });
        authorId = a?.id ?? "__none__";
    }

    // Bloklangan/mute mualliflar (o'zim emas)
    let meId: string | null = null;
    const sess = await getServerSession(authOptions);
    if (sess?.user?.email) { const m = await prisma.userProfile.findUnique({ where: { email: sess.user.email }, select: { id: true } }); meId = m?.id ?? null; }
    const hiddenIds = (await getHiddenAuthorIds(meId)).filter(x => x !== meId);
    const notHidden = hiddenIds.length ? { profileId: { notIn: hiddenIds } } : {};

    const streams = await prisma.nexusLiveStream.findMany({
        where: authorId
            ? { profileId: authorId, privacy: "PUBLIC", hidden: false }
            : { status, privacy: "PUBLIC", hidden: false, ...(category ? { category } : {}), ...notHidden },
        orderBy: authorId
            ? { createdAt: "desc" }
            : status === "UPCOMING" ? { scheduledAt: "asc" } : { createdAt: "desc" },
        take: limit,
    });

    // Mualliflar
    const authorIds = [...new Set(streams.map(s => s.profileId))];
    const profs = await prisma.userProfile.findMany({
        where: { id: { in: authorIds } }, select: { id: true, name: true, username: true, image: true, humoId: true, verified: true },
    });
    const pMap = Object.fromEntries(profs.map(p => [p.id, p]));

    // Jonli efirlar uchun real ko'ruvchi soni
    const viewerCounts: Record<string, number> = {};
    if (status === "LIVE" && streams.length) {
        const since = new Date(Date.now() - VIEWER_WINDOW_MS);
        const counts = await prisma.nexusLiveViewer.groupBy({
            by: ["streamId"],
            where: { streamId: { in: streams.map(s => s.id) }, lastSeenAt: { gt: since } },
            _count: { streamId: true },
        });
        for (const c of counts) viewerCounts[c.streamId] = c._count.streamId;
    }

    const out = streams.map(s => {
        const p = pMap[s.profileId];
        return {
            id: s.id, title: s.title, category: s.category, status: s.status,
            scheduledAt: s.scheduledAt, startedAt: s.startedAt, endedAt: s.endedAt,
            viewers: viewerCounts[s.id] ?? 0, peakViewers: s.peakViewers, likes: s.likes,
            createdAt: s.createdAt,
            author: p ? { name: p.name, username: p.username, image: p.image, verified: isVerifiedProfile(p) } : null,
        };
    });

    return NextResponse.json({ streams: out });
}

// POST /api/nexus/live — efir yaratish (darhol LIVE yoki rejalashtirilgan UPCOMING)
export async function POST(req: Request) {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const me = await prisma.userProfile.findUnique({ where: { email: session.user.email }, select: { id: true } });
    if (!me) return NextResponse.json({ error: "Profil topilmadi" }, { status: 404 });

    const { title, category, privacy, scheduledAt } = await req.json();
    if (!title?.trim()) return NextResponse.json({ error: "Sarlavha kerak" }, { status: 400 });
    if (await nexusRateLimited(me.id, "live")) return NextResponse.json({ error: RATE_MSG }, { status: 429 });

    // Bitta odamda bitta faol efir
    await prisma.nexusLiveStream.updateMany({
        where: { profileId: me.id, status: "LIVE" },
        data: { status: "ENDED", endedAt: new Date() },
    });

    const sched = scheduledAt ? new Date(scheduledAt) : null;
    const isUpcoming = !!(sched && sched.getTime() > Date.now() + 60_000);

    const stream = await prisma.nexusLiveStream.create({
        data: {
            profileId: me.id,
            title: String(title).trim().slice(0, 200),
            category: typeof category === "string" && category ? category : null,
            privacy: privacy === "FRIENDS" ? "FRIENDS" : privacy === "PRIVATE" ? "PRIVATE" : "PUBLIC",
            status: isUpcoming ? "UPCOMING" : "LIVE",
            scheduledAt: sched,
            startedAt: isUpcoming ? null : new Date(),
        },
    });

    // Efir nomi/kategoriyasini moderatsiya (javobni bloklamaydi)
    after(() => moderateOnCreate({
        module: "NEXUS", targetType: "LIVE", targetId: stream.id,
        text: [stream.title, stream.category].filter(Boolean).join(" — "), kind: "jonli efir sarlavhasi",
    }));

    // Darhol jonli + ochiq efir bo'lsa — kuzatuvchilarga xabar
    if (!isUpcoming && stream.privacy === "PUBLIC") {
        after(() => nexusNotifyFollowers({ actorId: me.id, type: "LIVE", liveId: stream.id }));
    }

    return NextResponse.json({ stream });
}
