// Kanal (handle bo'yicha) va bitta xabar — deep-link uchun ommaviy.
//   GET /api/nexus/channels/by-handle/[handle]/messages/[id]

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(_req: Request, { params }: { params: Promise<{ handle: string; id: string }> }) {
    const { handle, id } = await params;
    const ch = await prisma.nexusChannel.findFirst({
        where: { handle, hidden: false },
        select: { id: true, name: true, handle: true, type: true, description: true, avatarUrl: true, memberCount: true, isPrivate: true },
    });
    if (!ch) return NextResponse.json({ error: "Kanal topilmadi" }, { status: 404 });
    if (ch.isPrivate) return NextResponse.json({ error: "Xususiy kanal" }, { status: 403 });

    const msg = await prisma.nexusChannelMessage.findFirst({
        where: { id, channelId: ch.id, hidden: false },
        select: {
            id: true, text: true, createdAt: true, senderId: true, media: true,
            pollQuestion: true, pollOptions: true,
            editedAt: true, pinnedAt: true,
        },
    });
    if (!msg) return NextResponse.json({ error: "Xabar topilmadi" }, { status: 404 });

    const sender = await prisma.userProfile.findUnique({
        where: { id: msg.senderId },
        select: { name: true, username: true, image: true, verified: true },
    });

    return NextResponse.json({
        channel: {
            id: ch.id, name: ch.name, handle: ch.handle, type: ch.type,
            description: ch.description, avatarUrl: ch.avatarUrl, memberCount: ch.memberCount,
        },
        message: {
            id: msg.id, text: msg.text, createdAt: msg.createdAt,
            media: msg.media, pollQuestion: msg.pollQuestion, pollOptions: msg.pollOptions,
            editedAt: msg.editedAt, pinnedAt: msg.pinnedAt,
            sender: sender ? { name: sender.name, username: sender.username, image: sender.image, verified: sender.verified } : null,
        },
    });
}
