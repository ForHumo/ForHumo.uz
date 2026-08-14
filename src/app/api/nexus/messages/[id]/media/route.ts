// Chat media galereya — DM suhbat ichidagi barcha rasm/video/audio/fayl/link.
//
//   GET /api/nexus/messages/[id]/media?type=<media|file|link>&limit=50&offset=0
//     type=media  → image, video, video-circle
//     type=file   → audio, file
//     type=link   → matnida havola bo'lgan xabarlar

import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const { id } = await params;
    const me = await prisma.userProfile.findUnique({
        where: { email: session.user.email }, select: { id: true },
    });
    if (!me) return NextResponse.json({ error: "Profil topilmadi" }, { status: 404 });

    const conv = await prisma.nexusConversation.findUnique({
        where: { id }, select: { user1Id: true, user2Id: true },
    });
    if (!conv) return NextResponse.json({ error: "Topilmadi" }, { status: 404 });
    if (conv.user1Id !== me.id && conv.user2Id !== me.id) {
        return NextResponse.json({ error: "Ruxsat yo'q" }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const type = searchParams.get("type") || "media";
    const limit = Math.min(100, Math.max(1, Number(searchParams.get("limit") || 50)));
    const offset = Math.max(0, Number(searchParams.get("offset") || 0));

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let where: any;
    if (type === "media") {
        where = { conversationId: id, mediaType: { in: ["image", "video", "video-circle"] } };
    } else if (type === "file") {
        where = { conversationId: id, mediaType: { in: ["audio", "file"] } };
    } else if (type === "link") {
        where = {
            conversationId: id,
            text: { contains: "http" },        // sodda: link matn ichida
        };
    } else {
        return NextResponse.json({ error: "Noto'g'ri type" }, { status: 400 });
    }

    const total = await prisma.nexusMessage.count({ where });
    const messages = await prisma.nexusMessage.findMany({
        where,
        orderBy: { createdAt: "desc" },
        take: limit, skip: offset,
        select: {
            id: true, text: true, createdAt: true, senderId: true,
            mediaUrl: true, mediaType: true, mediaMime: true, mediaName: true, mediaSize: true, durationMs: true,
        },
    });

    return NextResponse.json({
        type, total,
        items: messages.map(m => ({
            id: m.id, text: m.text, createdAt: m.createdAt,
            mine: m.senderId === me.id,
            mediaUrl: m.mediaUrl, mediaType: m.mediaType, mediaMime: m.mediaMime,
            mediaName: m.mediaName, mediaSize: m.mediaSize, durationMs: m.durationMs,
        })),
    });
}
