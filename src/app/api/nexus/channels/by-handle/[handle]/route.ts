// GET /api/nexus/channels/by-handle/[handle]
// Ommaviy kanal ma'lumoti + so'nggi 10 post. Auth talab qilinmaydi (public preview).
// Yopiq kanal (isPrivate) uchun faqat metadata qaytadi, postlar bo'sh.

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export async function GET(_req: Request, { params }: { params: Promise<{ handle: string }> }) {
    const { handle } = await params;
    const clean = handle.replace(/^@/, "").toLowerCase();
    if (!clean) return NextResponse.json({ error: "handle" }, { status: 400 });

    const channel = await prisma.nexusChannel.findUnique({ where: { handle: clean } });
    if (!channel || channel.hidden) return NextResponse.json({ error: "not_found" }, { status: 404 });

    // Session (ixtiyoriy) — men a'zomanmi tekshirish
    const session = await getServerSession(authOptions);
    let myMembership: { role: string } | null = null;
    if (session?.user?.email) {
        const me = await prisma.userProfile.findUnique({ where: { email: session.user.email }, select: { id: true } });
        if (me) {
            const m = await prisma.nexusChannelMember.findUnique({
                where: { channelId_profileId: { channelId: channel.id, profileId: me.id } },
                select: { role: true },
            });
            if (m) myMembership = { role: m.role };
        }
    }

    // Owner ma'lumoti (verified badge uchun)
    const owner = await prisma.userProfile.findUnique({
        where: { id: channel.ownerId },
        select: { id: true, name: true, username: true, image: true, humoId: true },
    });

    // So'nggi 10 post — faqat ochiq kanal uchun (private = list bo'sh)
    let recent: Array<{
        id: string;
        text: string | null;
        media: string[];
        mediaType: string | null;
        pollQuestion: string | null;
        viewCount: number;
        createdAt: Date;
    }> = [];
    if (!channel.isPrivate) {
        const msgs = await prisma.nexusChannelMessage.findMany({
            where: {
                channelId: channel.id,
                hidden: false,
                deletedForEveryoneAt: null,
                scheduledFor: null,
                topicId: null,
            },
            orderBy: { createdAt: "desc" },
            take: 10,
            select: {
                id: true, text: true, media: true, mediaType: true,
                pollQuestion: true, viewCount: true, createdAt: true,
            },
        });
        recent = msgs;
    }

    return NextResponse.json({
        channel: {
            id: channel.id,
            handle: channel.handle,
            name: channel.name,
            type: channel.type,
            description: channel.description,
            avatarUrl: channel.avatarUrl,
            coverUrl: channel.coverUrl,
            isPrivate: channel.isPrivate,
            memberCount: channel.memberCount,
            rules: channel.rules,
            isSystem: channel.isSystem,
            createdAt: channel.createdAt,
        },
        owner: owner ? {
            id: owner.id, name: owner.name, username: owner.username, image: owner.image, humoId: owner.humoId,
        } : null,
        isMember: !!myMembership,
        myRole: myMembership?.role ?? null,
        recent: recent.map(m => ({
            id: m.id,
            preview: m.text ? m.text.slice(0, 280) : null,
            hasMedia: m.media.length > 0,
            mediaType: m.mediaType,
            firstMedia: m.media[0] ?? null,
            mediaCount: m.media.length,
            isPoll: !!m.pollQuestion,
            viewCount: m.viewCount,
            createdAt: m.createdAt,
        })),
    });
}
