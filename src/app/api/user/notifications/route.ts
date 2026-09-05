// Universal notification tray — barcha modul (Nexus + BN + Support + Belis) birlashtirilgan.
//
//   GET /api/user/notifications?limit=30&unreadOnly=1
//
// Har notif normal shaklda: { id, source, type, title, body?, href?, read, at }

import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

interface UniNotif {
    id: string;              // uniq: "nx-abc", "bn-xyz", "belis-...", "sup-..."
    source: "nexus" | "bn" | "belis" | "support" | "market";
    type: string;
    title: string;
    body?: string;
    href?: string;
    read: boolean;
    at: string;
}

const NX_LABEL: Record<string, string> = {
    LIKE: "Postingizga like", COMMENT: "Yangi izoh", REPLY: "Izohga javob", FOLLOW: "Yangi obunachi",
    VIDEO_LIKE: "Videoga like", VIDEO_COMMENT: "Videoga izoh", TRACK_LIKE: "Trekka like",
    PURCHASE: "Xarid qilindi", LIVE: "Jonli efir boshlandi",
    SUPPORT: "Support javob", CALL_MISSED: "O'tkazib yuborilgan chaqiruv",
};

export async function GET(req: Request) {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) return NextResponse.json({ error: "auth_required" }, { status: 401 });

    const profile = await prisma.userProfile.findUnique({
        where: { email: session.user.email }, select: { id: true },
    });
    if (!profile) return NextResponse.json({ error: "profile_not_found" }, { status: 404 });

    const { searchParams } = new URL(req.url);
    const limit = Math.min(50, Math.max(5, Number(searchParams.get("limit")) || 30));
    const unreadOnly = searchParams.get("unreadOnly") === "1";

    const [nexus, bn, belis, support] = await Promise.all([
        prisma.nexusNotification.findMany({
            where: { recipientId: profile.id, ...(unreadOnly ? { read: false } : {}) },
            orderBy: { createdAt: "desc" }, take: limit,
            select: { id: true, type: true, postId: true, videoId: true, trackId: true, liveId: true, ticketId: true, read: true, createdAt: true },
        }).catch(() => []),
        prisma.bnNotification.findMany({
            where: { profileId: profile.id, ...(unreadOnly ? { read: false } : {}) },
            orderBy: { createdAt: "desc" }, take: limit,
            select: { id: true, type: true, title: true, body: true, link: true, read: true, createdAt: true },
        }).catch(() => []),
        prisma.belisRentalBooking.findMany({
            where: {
                buyerId: profile.id,
                updatedAt: { gte: new Date(Date.now() - 7 * 86400000) },
            },
            orderBy: { updatedAt: "desc" }, take: 10,
            select: { id: true, code: true, status: true, updatedAt: true },
        }).catch(() => []),
        prisma.supportTicket.findMany({
            where: { profileId: profile.id, ...(unreadOnly ? { status: { in: ["open", "pending"] } } : {}) },
            orderBy: { updatedAt: "desc" }, take: 10,
            select: { id: true, subject: true, status: true, aiHandled: true, escalated: true, updatedAt: true },
        }),
    ]);

    const items: UniNotif[] = [];

    for (const n of nexus) {
        items.push({
            id: `nx-${n.id}`, source: "nexus", type: String(n.type),
            title: NX_LABEL[String(n.type)] || String(n.type),
            href: n.postId ? `/nexus/p/${n.postId}` : n.videoId ? `/nexus/v/${n.videoId}` : n.liveId ? `/nexus/live/${n.liveId}` : `/nexus`,
            read: n.read,
            at: n.createdAt.toISOString(),
        });
    }
    for (const b of bn) {
        items.push({
            id: `bn-${b.id}`, source: "bn", type: String(b.type),
            title: b.title, body: b.body || undefined,
            href: b.link || undefined,
            read: b.read,
            at: b.createdAt.toISOString(),
        });
    }
    for (const bk of belis) {
        items.push({
            id: `belis-${bk.id}`, source: "belis", type: bk.status,
            title: `Belis: ${bk.code}`,
            body: `Holat: ${bk.status}`,
            href: `/belis/booking/${bk.code}`,
            read: true, // Belis'da hozircha read tracking yo'q
            at: bk.updatedAt.toISOString(),
        });
    }
    for (const t of support) {
        items.push({
            id: `sup-${t.id}`, source: "support", type: t.status,
            title: `Support: ${t.subject}`,
            body: t.escalated ? "Inson javob berayotgan" : t.aiHandled ? "AI javob berdi" : "Kutilmoqda",
            href: `/support`,
            read: t.status === "closed",
            at: t.updatedAt.toISOString(),
        });
    }

    items.sort((a, b) => (a.at < b.at ? 1 : -1));
    const sliced = items.slice(0, limit);
    const unreadCount = items.filter(i => !i.read).length;

    return NextResponse.json({
        items: sliced,
        unreadCount,
        totalCount: items.length,
    });
}
