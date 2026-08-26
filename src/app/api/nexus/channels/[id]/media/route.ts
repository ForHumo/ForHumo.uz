// GET /api/nexus/channels/[id]/media?type=image|video|audio|file|link&limit=50&cursor=...
// Guruh/kanal ichida ulashilgan barcha media/fayl/havolalarni tab'lar bo'yicha
// qaytaradi (Telegram uslubi).

import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const PAGE = 50;

function guessMediaKindFromUrl(url: string): "image" | "video" | "audio" | "file" {
    const u = url.toLowerCase();
    if (/\.(jpg|jpeg|png|webp|gif|avif|heic)(\?|$)/.test(u)) return "image";
    if (/\.(mp4|webm|mov|m4v|avi)(\?|$)/.test(u)) return "video";
    if (/\.(mp3|wav|ogg|webm|m4a|opus|aac)(\?|$)/.test(u)) return "audio";
    return "file";
}

function extractLinks(text: string | null | undefined): string[] {
    if (!text) return [];
    const re = /(https?:\/\/[^\s]+)/gi;
    return Array.from(text.matchAll(re)).map(m => m[1]).slice(0, 5);
}

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const { id } = await params;

    const me = await prisma.userProfile.findUnique({ where: { email: session.user.email }, select: { id: true } });
    if (!me) return NextResponse.json({ error: "profile" }, { status: 404 });

    const member = await prisma.nexusChannelMember.findUnique({
        where: { channelId_profileId: { channelId: id, profileId: me.id } },
        select: { id: true },
    });
    if (!member) return NextResponse.json({ error: "not_member" }, { status: 403 });

    const url = new URL(req.url);
    const type = url.searchParams.get("type") ?? "image";
    const limit = Math.min(Math.max(1, Number(url.searchParams.get("limit") ?? PAGE)), PAGE);
    const cursor = url.searchParams.get("cursor") ?? null;

    // Havolalar (link) — text ichidan URL'lar
    if (type === "link") {
        const msgs = await prisma.nexusChannelMessage.findMany({
            where: {
                channelId: id, hidden: false, deletedForEveryoneAt: null,
                text: { contains: "http", mode: "insensitive" },
                ...(cursor ? { id: { lt: cursor } } : {}),
            },
            orderBy: { id: "desc" },
            take: limit,
            select: { id: true, text: true, createdAt: true, senderId: true },
        });
        const items: Array<{ id: string; url: string; text: string | null; createdAt: Date; senderId: string }> = [];
        for (const m of msgs) {
            for (const link of extractLinks(m.text)) {
                items.push({ id: m.id, url: link, text: m.text, createdAt: m.createdAt, senderId: m.senderId });
            }
        }
        return NextResponse.json({ items, nextCursor: msgs.length === limit ? msgs[msgs.length - 1].id : null });
    }

    // Media/fayl — mediaType bo'yicha OR media[] massividagi URL'lar bo'yicha
    // Fast path: mediaType bo'yicha filter (yangi xabarlar)
    const mediaTypeFilter = ["image", "video", "audio", "file", "video-circle"].includes(type)
        ? { mediaType: { in: type === "video" ? ["video", "video-circle"] : [type] } }
        : {};

    const msgs = await prisma.nexusChannelMessage.findMany({
        where: {
            channelId: id, hidden: false, deletedForEveryoneAt: null,
            OR: [
                { ...mediaTypeFilter },
                { media: { isEmpty: false } },
            ],
            ...(cursor ? { id: { lt: cursor } } : {}),
        },
        orderBy: { id: "desc" },
        take: limit * 2, // Extra fetch — eski xabarlarda mediaType yo'q, media[] ichidan filter qilamiz
        select: {
            id: true, media: true, mediaType: true, mediaMime: true, mediaName: true,
            mediaSize: true, durationMs: true, createdAt: true, senderId: true,
        },
    });

    const items: Array<{
        id: string; url: string; kind: string; mime: string | null; name: string | null;
        size: number | null; durationMs: number | null; createdAt: Date; senderId: string;
    }> = [];

    for (const m of msgs) {
        // Yangi format: mediaType + media[0]
        if (m.mediaType && m.media.length > 0) {
            const kind = m.mediaType === "video-circle" ? "video" : m.mediaType;
            if (type === "video" ? (kind === "video") : (kind === type)) {
                items.push({
                    id: m.id, url: m.media[0], kind: m.mediaType, mime: m.mediaMime,
                    name: m.mediaName, size: m.mediaSize, durationMs: m.durationMs,
                    createdAt: m.createdAt, senderId: m.senderId,
                });
            }
            continue;
        }
        // Eski format: media[] massivi (URL'dan turini aniqlash)
        for (const url of m.media) {
            const kind = guessMediaKindFromUrl(url);
            if (kind === type) {
                items.push({
                    id: m.id, url, kind, mime: null, name: null,
                    size: null, durationMs: null, createdAt: m.createdAt, senderId: m.senderId,
                });
            }
        }
    }

    const trimmed = items.slice(0, limit);
    const nextCursor = msgs.length >= limit ? msgs[msgs.length - 1].id : null;
    return NextResponse.json({ items: trimmed, nextCursor });
}
