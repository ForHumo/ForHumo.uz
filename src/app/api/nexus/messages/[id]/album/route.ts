import { NextResponse } from "next/server";
import { after } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { otherId } from "@/lib/nexus-dm";
import { nexusRateLimited, RATE_MSG } from "@/lib/nexus-rate";
import { isBlockedBetween } from "@/lib/nexus-block";
import { sendPushToProfile, pushAvailable } from "@/lib/push";
import { pusherTrigger, userChannel } from "@/lib/pusher-server";

// POST /api/nexus/messages/[id]/album
// Body: { items: [{mediaUrl, mediaType, mediaMime, mediaName, mediaSize, durationMs?}], text?, replyToId?, silent? }
// N xabar bitta albumId bilan yaratiladi (2-10 tagacha). Faqat rasm va video ruxsat.
// Caption faqat 1-xabarga qo'yiladi (Telegram uslub).

async function meAndConv(email: string, id: string) {
    const me = await prisma.userProfile.findUnique({ where: { email }, select: { id: true } });
    if (!me) return { me: null, conv: null };
    const conv = await prisma.nexusConversation.findUnique({ where: { id } });
    return { me, conv };
}

const ALBUM_MEDIA_TYPES = new Set(["image", "video"]);

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const { id } = await params;
    const { me, conv } = await meAndConv(session.user.email, id);
    if (!me) return NextResponse.json({ error: "Profil topilmadi" }, { status: 404 });
    if (!conv) return NextResponse.json({ error: "Suhbat topilmadi" }, { status: 404 });
    if (conv.user1Id !== me.id && conv.user2Id !== me.id) return NextResponse.json({ error: "Ruxsat yo'q" }, { status: 403 });

    if (await isBlockedBetween(me.id, otherId(conv, me.id))) {
        return NextResponse.json({ error: "Bu suhbatga yoza olmaysiz" }, { status: 403 });
    }

    const body = (await req.json()) as {
        items?: Array<{ mediaUrl: string; mediaType: string; mediaMime?: string;
            mediaName?: string; mediaSize?: number; durationMs?: number; }>;
        text?: string;
        replyToId?: string;
        silent?: boolean;
    };
    const items = Array.isArray(body.items) ? body.items : [];
    if (items.length < 2 || items.length > 10) {
        return NextResponse.json({ error: "Albom 2-10 ta element bo'lishi kerak" }, { status: 400 });
    }
    for (const it of items) {
        if (!it.mediaUrl || !ALBUM_MEDIA_TYPES.has(it.mediaType)) {
            return NextResponse.json({ error: "Album uchun faqat rasm/video ruxsat etilgan" }, { status: 400 });
        }
    }
    if (await nexusRateLimited(me.id, "dm")) return NextResponse.json({ error: RATE_MSG }, { status: 429 });

    // Reply — birinchi xabarga biriktiriladi
    let replyToId: string | null = null;
    if (typeof body.replyToId === "string" && body.replyToId) {
        const target = await prisma.nexusMessage.findUnique({
            where: { id: body.replyToId }, select: { id: true, conversationId: true },
        });
        if (target && target.conversationId === id) replyToId = target.id;
    }

    const caption = String(body.text ?? "").trim().slice(0, 2000);
    // Album ID — barcha xabarlar uchun umumiy
    const albumId = `alb-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
    const now = new Date();

    // Atomik: N ta xabar bitta transaksiyada. Bir xil createdAt tartibini saqlaydi.
    const createdMessages = await prisma.$transaction(items.map((it, i) =>
        prisma.nexusMessage.create({
            data: {
                conversationId: id,
                senderId: me.id,
                // Caption faqat birinchi xabarda; qolganlarda bo'sh
                text: i === 0 ? caption : "",
                replyToId: i === 0 ? replyToId : null,
                albumId,
                mediaUrl: it.mediaUrl,
                mediaType: it.mediaType,
                mediaMime: it.mediaMime ?? null,
                mediaName: it.mediaName?.slice(0, 200) ?? null,
                mediaSize: typeof it.mediaSize === "number" ? Math.max(0, Math.floor(it.mediaSize)) : null,
                durationMs: typeof it.durationMs === "number" ? Math.max(0, Math.floor(it.durationMs)) : null,
                // Album'da bir xil createdAt bo'lishi mumkin — millisec offset bilan ajratamiz
                createdAt: new Date(now.getTime() + i),
            },
        })
    ));

    // Suhbat preview
    const previewLabel = caption || (items.length + " ta media");
    await prisma.nexusConversation.update({
        where: { id },
        data: {
            lastMessageAt: new Date(),
            lastMessageText: previewLabel.slice(0, 120),
            lastSenderId: me.id,
            ...(conv.user1Id === me.id ? { user1ReadAt: new Date() } : { user2ReadAt: new Date() }),
        },
    });

    // Real-time push (Pusher) — har xabar alohida event, klient albumId bo'yicha guruhlaydi
    const recipientId = otherId(conv, me.id);
    after(() => {
        for (const msg of createdMessages) {
            const payload = {
                convId: id,
                message: {
                    id: msg.id, text: msg.text, mine: false, createdAt: msg.createdAt,
                    mediaUrl: msg.mediaUrl, mediaType: msg.mediaType, mediaMime: msg.mediaMime,
                    mediaName: msg.mediaName, mediaSize: msg.mediaSize, durationMs: msg.durationMs,
                    senderId: me.id, replyToId: msg.replyToId, albumId: msg.albumId,
                    reactions: [], bookmarked: false,
                },
            };
            void pusherTrigger(userChannel(recipientId), "nx:msg:new", payload);
            void pusherTrigger(userChannel(me.id), "nx:msg:new", { ...payload, message: { ...payload.message, mine: true } });
        }
    });

    // Web Push (bitta bildirishnoma butun album uchun)
    if (!body.silent && pushAvailable()) {
        after(async () => {
            const isRecipientMuted = conv.user1Id === recipientId ? !!conv.mutedByUser1 : !!conv.mutedByUser2;
            if (isRecipientMuted) return;
            const recipient = await prisma.userProfile.findUnique({
                where: { id: recipientId }, select: { privacyPushPreview: true },
            });
            const mode = (recipient?.privacyPushPreview ?? "full") as "full" | "name" | "hidden";
            const sender = mode === "hidden" ? null : await prisma.userProfile.findUnique({
                where: { id: me.id }, select: { name: true, username: true },
            });
            const senderName = sender?.name ?? sender?.username ?? "Foydalanuvchi";
            let title: string, bodyText: string;
            const previewMedia = `${items.length} ta ${items[0].mediaType === "video" ? "video" : "rasm"}`;
            if (mode === "hidden") { title = "For Humo"; bodyText = "Yangi xabar"; }
            else if (mode === "name") { title = senderName; bodyText = "Yangi xabar"; }
            else { title = senderName; bodyText = caption || previewMedia; }
            await sendPushToProfile(recipientId, {
                title, body: bodyText.slice(0, 120),
                url: sender?.username ? `/nexus?dm=${sender.username}` : "/nexus",
                tag: `dm-${id}`,
            });
        });
    }

    return NextResponse.json({
        albumId,
        messages: createdMessages.map(m => ({
            id: m.id, text: m.text, mine: true, createdAt: m.createdAt,
            mediaUrl: m.mediaUrl, mediaType: m.mediaType, mediaMime: m.mediaMime,
            mediaName: m.mediaName, mediaSize: m.mediaSize, durationMs: m.durationMs,
            albumId: m.albumId, replyToId: m.replyToId,
        })),
    });
}
