// Agent inbox — agent server tomonga xabar yuboradi.
// Ikki holat:
//   1. Foydalanuvchi DM yozgan → agent avtomatik javobi (webhookdan qaytadi, alohida bu endpoint EMAS)
//   2. Agent proaktiv xabar yuboradi (masalan cron, tashqi event)
//
// Bu endpoint 2-holat uchun: agent xohlagan foydalanuvchiga xabar yuborishi mumkin.
//
//   POST /api/nexus/agents/webhook-inbox
//     Headers:
//       X-Forhumo-Api-Key: agk_...
//       X-Forhumo-Timestamp: <unix seconds>
//       X-Forhumo-Signature: sha256=<hex>
//     Body: { toUsername, text?, mediaUrl?, mediaType?, mediaMime?, mediaName? }
//
// Autentifikatsiya: apiKey → agent, keyin HMAC imzo tekshiruvi (timestamp + body).
// Faqat AGENT tomonidan boshlangan (yoki mavjud) suhbatlarga xabar yuboriladi —
// spam himoyasi uchun agent oldindan foydalanuvchi bilan DM bo'lishi shart EMAS
// (Telegram'da ham bot foydalanuvchiga birinchi yozishi mumkin; lekin foydalanuvchi
// "bot bloklash" tugmasi bosishi mumkin — bizda agent DM'ini o'chirib qo'yish
// yoki blok qilish keyin qo'shiladi).

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
    AGENT_API_KEY_HEADER,
    WEBHOOK_SIGNATURE_HEADER,
    WEBHOOK_TIMESTAMP_HEADER,
    verifySignature,
} from "@/lib/agent-webhook";
import { normalizePair } from "@/lib/nexus-dm";
import { nexusRateLimited, RATE_MSG } from "@/lib/nexus-rate";

export async function POST(req: Request) {
    const apiKey = req.headers.get(AGENT_API_KEY_HEADER);
    const timestamp = req.headers.get(WEBHOOK_TIMESTAMP_HEADER);
    const signature = req.headers.get(WEBHOOK_SIGNATURE_HEADER);
    const rawBody = await req.text();

    if (!apiKey || !timestamp || !signature) {
        return NextResponse.json({ error: "Auth headers yo'q" }, { status: 401 });
    }

    const agent = await prisma.nexusAgent.findUnique({
        where: { apiKey },
        select: { id: true, profileId: true, apiKey: true },
    });
    if (!agent || !agent.apiKey) {
        return NextResponse.json({ error: "Noto'g'ri kalit" }, { status: 401 });
    }

    if (!verifySignature(agent.apiKey, timestamp, rawBody, signature)) {
        return NextResponse.json({ error: "Imzo noto'g'ri yoki eskirgan" }, { status: 401 });
    }

    // Rate limit — agent daqiqasiga 60 xabar (DM rate limitiga o'xshash)
    if (await nexusRateLimited(agent.profileId, "dm")) {
        return NextResponse.json({ error: RATE_MSG }, { status: 429 });
    }

    let body: {
        toUsername?: string;
        text?: string;
        mediaUrl?: string;
        mediaType?: string;
        mediaMime?: string;
        mediaName?: string;
    };
    try { body = JSON.parse(rawBody); } catch { return NextResponse.json({ error: "Noto'g'ri JSON" }, { status: 400 }); }

    const toUsername = String(body.toUsername ?? "").trim().replace(/^@/, "").toLowerCase();
    if (!toUsername) return NextResponse.json({ error: "toUsername kerak" }, { status: 400 });

    const target = await prisma.userProfile.findUnique({
        where: { username: toUsername },
        select: { id: true },
    });
    if (!target) return NextResponse.json({ error: "Foydalanuvchi topilmadi" }, { status: 404 });
    if (target.id === agent.profileId) return NextResponse.json({ error: "O'ziga yubora olmaydi" }, { status: 400 });

    const text = typeof body.text === "string" ? body.text.trim().slice(0, 4000) : "";
    const mediaUrl = typeof body.mediaUrl === "string" && body.mediaUrl.startsWith("http") ? body.mediaUrl.slice(0, 1000) : null;
    const mediaType = mediaUrl && typeof body.mediaType === "string" && ["image", "video", "audio", "file"].includes(body.mediaType) ? body.mediaType : (mediaUrl ? "file" : null);
    if (!text && !mediaUrl) return NextResponse.json({ error: "Xabar bo'sh" }, { status: 400 });

    // Suhbat topish yoki yaratish (agent = sender, target = recipient)
    const [user1Id, user2Id] = normalizePair(agent.profileId, target.id);
    const conv = await prisma.nexusConversation.upsert({
        where: { user1Id_user2Id: { user1Id, user2Id } },
        update: {},
        create: { user1Id, user2Id },
        select: { id: true },
    });

    const msg = await prisma.nexusMessage.create({
        data: {
            conversationId: conv.id,
            senderId: agent.profileId,
            text,
            mediaUrl, mediaType,
            mediaMime: typeof body.mediaMime === "string" ? body.mediaMime.slice(0, 100) : null,
            mediaName: typeof body.mediaName === "string" ? body.mediaName.slice(0, 200) : null,
        },
        select: { id: true, createdAt: true },
    });

    const preview = text || (mediaType ? `[${mediaType}]` : "Yangi xabar");
    await prisma.nexusConversation.update({
        where: { id: conv.id },
        data: {
            lastMessageAt: new Date(),
            lastMessageText: preview.slice(0, 120),
            lastSenderId: agent.profileId,
        },
    });

    return NextResponse.json({
        ok: true,
        chatId: conv.id,
        messageId: msg.id,
        createdAt: msg.createdAt,
    });
}
