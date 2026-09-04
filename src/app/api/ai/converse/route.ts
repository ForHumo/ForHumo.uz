// Humo AI universal chat endpoint.
// Har modul chaqiradi (Belis, BN, Nexus, Support, /ai/chat, ...).
//
// POST /api/ai/converse
// Body: {
//   message: string,                    // foydalanuvchi xabari
//   conversationId?: string,            // mavjud suhbatga qo'shish (yo'q bo'lsa yangi)
//   moduleOrigin?: string,              // "belis"|"bn"|"nexus"|"market"|"pay"|"support"|"ai"
//   audioUrl?: string,                  // ovozli xabar URL (transcript = message)
//   extractKnowledge?: boolean,         // default true — xabardan fact extraction
// }
// Javob: { conversationId, messages: [userMsg, aiMsg], extracted?: number }

import { NextResponse, after } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { aiAvailable, aiChat, aiText } from "@/lib/ai";
import { buildAiSystemPrompt } from "@/lib/ai-context-builder";
import { extractKnowledgeFromMessage } from "@/lib/user-knowledge";
import { belisRate } from "@/lib/belis-rate";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

const MAX_MSG_LEN = 4000;
const RECENT_MSGS = 12;   // konteksga oxirgi 12 xabar

export async function POST(req: Request) {
    if (!aiAvailable()) return NextResponse.json({ error: "ai_unavailable" }, { status: 503 });

    const session = await getServerSession(authOptions);
    if (!session?.user?.email) return NextResponse.json({ error: "auth_required" }, { status: 401 });

    const me = await prisma.userProfile.findUnique({
        where: { email: session.user.email },
        select: { id: true },
    });
    if (!me) return NextResponse.json({ error: "profile_not_found" }, { status: 404 });

    // Rate-limit — belisRate("aiChat") uslubi (30/kun/profil)
    // (belisRate lib yagona rate-limit sifatida qayta ishlatiladi; kelajakda ai-rate.ts ajratilishi mumkin)
    try {
        const rate = await belisRate(me.id, "aiChat");
        if (rate.limited) {
            return NextResponse.json({
                error: "rate_limited",
                message: `Kuniga ${rate.max} AI so'rov chegarasi. Ertaga qaytadan urinib ko'ring.`,
            }, { status: 429 });
        }
    } catch { /* fail-open */ }

    const body = await req.json().catch(() => ({}));
    const userMsg = String(body?.message ?? "").trim().slice(0, MAX_MSG_LEN);
    if (!userMsg) return NextResponse.json({ error: "message_required" }, { status: 400 });
    const moduleOrigin = typeof body?.moduleOrigin === "string" ? body.moduleOrigin.slice(0, 20) : undefined;
    const audioUrl = typeof body?.audioUrl === "string" ? body.audioUrl.slice(0, 500) : null;
    const extractKB = body?.extractKnowledge !== false;
    let conversationId: string | undefined = typeof body?.conversationId === "string" ? body.conversationId : undefined;

    // Suhbatni topish/yaratish
    let conversation;
    if (conversationId) {
        conversation = await prisma.aiConversation.findFirst({
            where: { id: conversationId, profileId: me.id },
        });
        if (!conversation) conversationId = undefined;   // boshqa userniki — yangi ochamiz
    }
    if (!conversation) {
        // Sarlavha uchun birinchi xabardan qisqa ekstrakt
        const title = userMsg.slice(0, 60).replace(/\s+/g, " ");
        conversation = await prisma.aiConversation.create({
            data: {
                profileId: me.id,
                title,
                moduleOrigin: moduleOrigin ?? null,
                topic: moduleOrigin ?? null,
                lastMsgAt: new Date(),
            },
        });
        conversationId = conversation.id;
    }

    // 1. Foydalanuvchi xabarini yozamiz
    const userDbMsg = await prisma.aiMessage.create({
        data: {
            conversationId: conversation.id,
            role: "user",
            body: userMsg,
            audioUrl,
            attachmentType: audioUrl ? "audio" : null,
        },
    });

    // 2. Konteksga oxirgi N xabar
    const priorMsgs = await prisma.aiMessage.findMany({
        where: { conversationId: conversation.id },
        orderBy: { createdAt: "desc" },
        take: RECENT_MSGS,
        select: { role: true, body: true },
    });
    const history = priorMsgs.reverse();

    // 3. System prompt (foydalanuvchi haqidagi kontekst)
    const { system } = await buildAiSystemPrompt({
        profileId: me.id,
        moduleOrigin,
        includeKnowledge: true,
        includeSignals: true,
    });

    // 4. Gemini chaqiruv
    let aiReply: string;
    try {
        aiReply = await aiChat(
            history.map(m => ({
                role: m.role === "ai" ? "model" as const : "user" as const,
                text: m.body,
            })),
            { system, temperature: 0.7 },
        );
        aiReply = (aiReply || "").trim().slice(0, 3000);
        if (!aiReply) throw new Error("empty_response");
    } catch (e) {
        // Fallback — oddiy prompt bilan urinib ko'ramiz
        try {
            aiReply = await aiText(userMsg, { system, temperature: 0.7 });
            aiReply = (aiReply || "").trim().slice(0, 3000);
        } catch {
            console.error("aiChat failed:", e);
            return NextResponse.json({ error: "ai_failed" }, { status: 502 });
        }
    }

    // 5. AI javobini yozamiz
    const aiDbMsg = await prisma.aiMessage.create({
        data: {
            conversationId: conversation.id,
            role: "ai",
            body: aiReply,
            aiModel: process.env.GEMINI_MODEL || "gemini-2.5-flash-lite",
        },
    });

    // 6. Suhbat topic + lastMsgAt yangilanadi
    await prisma.aiConversation.update({
        where: { id: conversation.id },
        data: {
            lastMsgAt: new Date(),
            topic: conversation.topic ?? moduleOrigin ?? null,
        },
    });

    // 7. Knowledge extraction (fon rejim — javobni kechiktirmaydi)
    if (extractKB) {
        after(async () => {
            await extractKnowledgeFromMessage({
                profileId: me.id,
                userMessage: userMsg,
                aiReply,
                conversationContext: history.map(h => `${h.role}: ${h.body}`).join("\n"),
            });
            // AI usage log (aiUsage — rate limit hisobi)
            await prisma.aiUsage.create({
                data: { profileId: me.id, kind: `converse:${moduleOrigin || "general"}` },
            });
        });
    }

    return NextResponse.json({
        conversationId: conversation.id,
        messages: [
            { id: userDbMsg.id, role: "user", body: userMsg, createdAt: userDbMsg.createdAt.toISOString() },
            { id: aiDbMsg.id, role: "ai", body: aiReply, createdAt: aiDbMsg.createdAt.toISOString() },
        ],
    });
}
