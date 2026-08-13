// Suhbat ichida server-side qidiruv (100+ xabarli suhbatlar uchun).
//   GET /api/nexus/messages/[convId]/search?q=X&limit=50

import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const MAX_LIMIT = 100;
const DEFAULT_LIMIT = 30;

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id } = await params;
    const url = new URL(req.url);
    const q = (url.searchParams.get("q") ?? "").trim();
    const limit = Math.min(MAX_LIMIT, Math.max(1, parseInt(url.searchParams.get("limit") ?? String(DEFAULT_LIMIT), 10) || DEFAULT_LIMIT));
    if (q.length < 2) return NextResponse.json({ results: [], total: 0 });

    const me = await prisma.userProfile.findUnique({
        where: { email: session.user.email }, select: { id: true },
    });
    if (!me) return NextResponse.json({ error: "Profil topilmadi" }, { status: 404 });

    const conv = await prisma.nexusConversation.findUnique({ where: { id } });
    if (!conv) return NextResponse.json({ error: "Suhbat topilmadi" }, { status: 404 });
    if (conv.user1Id !== me.id && conv.user2Id !== me.id) {
        return NextResponse.json({ error: "Ruxsat yo'q" }, { status: 403 });
    }

    const now = new Date();
    // Case-insensitive contains + expired/scheduled filtri
    const where = {
        conversationId: id,
        text: { contains: q, mode: "insensitive" as const },
        OR: [{ expiresAt: null }, { expiresAt: { gt: now } }],
        AND: [{
            OR: [
                { scheduledFor: null },
                { scheduledFor: { lte: now } },
                { senderId: me.id },
            ],
        }],
    };

    const [rows, total] = await Promise.all([
        prisma.nexusMessage.findMany({
            where, orderBy: { createdAt: "desc" }, take: limit,
            select: {
                id: true, text: true, senderId: true, createdAt: true,
                mediaType: true, mediaUrl: true,
            },
        }),
        prisma.nexusMessage.count({ where }),
    ]);

    return NextResponse.json({
        results: rows.map(r => ({
            id: r.id, text: r.text, mine: r.senderId === me.id, createdAt: r.createdAt,
            mediaType: r.mediaType, mediaUrl: r.mediaUrl,
        })),
        total,
    });
}
