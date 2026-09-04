// Streaming AI converse — Gemini streamGenerateContent + SSE.
// Foydalanuvchi javob so'z-so'z paydo bo'lishini ko'radi (chat UX).
//
// POST /api/ai/converse-stream
// Body: { message, conversationId?, moduleOrigin?, attachmentUrl?, attachmentType? }
// Javob: text/event-stream
//   data: {"type":"start","conversationId":"..."}
//   data: {"type":"chunk","text":"..."}
//   data: {"type":"done","messages":[user,ai],"followUps":[...]}
//   data: {"type":"error","message":"..."}

import { after } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { buildAiSystemPrompt } from "@/lib/ai-context-builder";
import { extractKnowledgeFromMessage } from "@/lib/user-knowledge";
import { belisRate } from "@/lib/belis-rate";
import { aiJSON } from "@/lib/ai";
import { embedAiMessage, findRelevantOldMessages } from "@/lib/ai-memory-search";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const GEMINI_KEY = process.env.GEMINI_API_KEY;
const GEMINI_MODEL = process.env.GEMINI_MODEL || "gemini-2.5-flash-lite";
const MAX_MSG_LEN = 4000;
const RECENT_MSGS = 12;

export async function POST(req: Request) {
    if (!GEMINI_KEY) {
        return sseError("ai_unavailable", 503);
    }

    const session = await getServerSession(authOptions);
    if (!session?.user?.email) return sseError("auth_required", 401);
    const me = await prisma.userProfile.findUnique({
        where: { email: session.user.email }, select: { id: true },
    });
    if (!me) return sseError("profile_not_found", 404);

    try {
        const rate = await belisRate(me.id, "aiChat");
        if (rate.limited) return sseError(`Kuniga ${rate.max} AI so'rov chegarasi.`, 429);
    } catch { /* fail-open */ }

    const body = await req.json().catch(() => ({}));
    const userMsg = String(body?.message ?? "").trim().slice(0, MAX_MSG_LEN);
    if (!userMsg) return sseError("message_required", 400);
    const moduleOrigin = typeof body?.moduleOrigin === "string" ? body.moduleOrigin.slice(0, 20) : undefined;
    const attachmentUrl = typeof body?.attachmentUrl === "string" ? body.attachmentUrl.slice(0, 500) : null;
    const attachmentType = typeof body?.attachmentType === "string" ? body.attachmentType.slice(0, 20) : null;
    const lang = ["uz", "ru", "en"].includes(String(body?.language)) ? String(body.language) as "uz" | "ru" | "en" : "uz";

    // Suhbatni topish/yaratish
    let conversationId: string | undefined = typeof body?.conversationId === "string" ? body.conversationId : undefined;
    let conversation = conversationId
        ? await prisma.aiConversation.findFirst({ where: { id: conversationId, profileId: me.id } })
        : null;
    if (!conversation) {
        conversation = await prisma.aiConversation.create({
            data: {
                profileId: me.id,
                title: userMsg.slice(0, 60).replace(/\s+/g, " "),
                moduleOrigin: moduleOrigin ?? null,
                topic: moduleOrigin ?? null,
                lastMsgAt: new Date(),
            },
        });
        conversationId = conversation.id;
    }

    // User xabari yozamiz
    const userDbMsg = await prisma.aiMessage.create({
        data: {
            conversationId: conversation.id,
            role: "user",
            body: userMsg,
            attachmentUrl,
            attachmentType,
        },
    });

    // History + context
    const priorMsgs = await prisma.aiMessage.findMany({
        where: { conversationId: conversation.id },
        orderBy: { createdAt: "desc" },
        take: RECENT_MSGS,
        select: { role: true, body: true },
    });
    const history = priorMsgs.reverse();
    const { system: baseSystem } = await buildAiSystemPrompt({
        profileId: me.id, moduleOrigin,
        includeKnowledge: true, includeSignals: true,
        language: lang,
    });

    // Semantic memory — foydalanuvchining qadimgi eng mos xabarlari (RAG-lite)
    let memoryContext = "";
    try {
        const relevant = await findRelevantOldMessages(me.id, userMsg, 3, [conversation.id]);
        if (relevant.length > 0) {
            memoryContext = `\n\nSIZNING QADIMGI SUHBATLARINGIZDAN MOS QISM:\n` +
                relevant.map((r, i) => `${i + 1}. ${r.body.slice(0, 200)}`).join("\n");
        }
    } catch { /* fail-safe */ }
    const system = baseSystem + memoryContext;

    const encoder = new TextEncoder();
    const stream = new ReadableStream({
        async start(controller) {
            function push(obj: object) {
                controller.enqueue(encoder.encode(`data: ${JSON.stringify(obj)}\n\n`));
            }

            push({ type: "start", conversationId: conversation!.id });

            // Gemini streaming API
            const url = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:streamGenerateContent?alt=sse&key=${GEMINI_KEY}`;
            const contents = history.map(m => ({
                role: m.role === "ai" ? "model" : "user",
                parts: [{ text: m.body }],
            }));

            let fullReply = "";
            try {
                const geminiRes = await fetch(url, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        contents,
                        systemInstruction: { parts: [{ text: system }] },
                        generationConfig: { temperature: 0.7 },
                    }),
                });

                if (!geminiRes.ok || !geminiRes.body) {
                    push({ type: "error", message: "ai_failed" });
                    controller.close();
                    return;
                }

                const reader = geminiRes.body.getReader();
                const decoder = new TextDecoder();
                let buffer = "";
                while (true) {
                    const { done, value } = await reader.read();
                    if (done) break;
                    buffer += decoder.decode(value, { stream: true });
                    // SSE parse — "data: {...}\n\n"
                    const lines = buffer.split("\n");
                    buffer = lines.pop() ?? "";
                    for (const line of lines) {
                        const trimmed = line.trim();
                        if (!trimmed.startsWith("data:")) continue;
                        const jsonStr = trimmed.slice(5).trim();
                        if (!jsonStr) continue;
                        try {
                            const parsed = JSON.parse(jsonStr);
                            const chunkText = parsed?.candidates?.[0]?.content?.parts?.[0]?.text || "";
                            if (chunkText) {
                                fullReply += chunkText;
                                push({ type: "chunk", text: chunkText });
                            }
                        } catch { /* skip malformed */ }
                    }
                }

                fullReply = fullReply.trim().slice(0, 3000);
                if (!fullReply) {
                    push({ type: "error", message: "empty_response" });
                    controller.close();
                    return;
                }

                // AI xabarini DB'ga yozamiz
                const aiDbMsg = await prisma.aiMessage.create({
                    data: {
                        conversationId: conversation!.id,
                        role: "ai",
                        body: fullReply,
                        aiModel: GEMINI_MODEL,
                    },
                });
                await prisma.aiConversation.update({
                    where: { id: conversation!.id },
                    data: { lastMsgAt: new Date() },
                });

                // Follow-up suggestions (parallel, 3s timeout)
                let followUps: string[] = [];
                try {
                    const fResult = await Promise.race([
                        aiJSON<{ suggestions: string[] }>(
                            `Foydalanuvchi: "${userMsg.slice(0, 200)}"\nAI: "${fullReply.slice(0, 400)}"\n\n3 ta qisqa keyingi savol (uz, 3-8 so'z) JSON: {"suggestions":["...","...","..."]}`,
                            { temperature: 0.7 },
                        ),
                        new Promise<null>(r => setTimeout(() => r(null), 3000)),
                    ]);
                    if (fResult?.suggestions) {
                        followUps = fResult.suggestions
                            .filter((s: unknown): s is string => typeof s === "string" && s.length > 0)
                            .slice(0, 3)
                            .map(s => s.slice(0, 100).trim());
                    }
                } catch { /* ignore */ }

                push({
                    type: "done",
                    messages: [
                        { id: userDbMsg.id, role: "user", body: userMsg, createdAt: userDbMsg.createdAt.toISOString() },
                        { id: aiDbMsg.id, role: "ai", body: fullReply, createdAt: aiDbMsg.createdAt.toISOString() },
                    ],
                    followUps,
                });
                controller.close();

                // Fon rejim — knowledge extraction + embedding + usage log
                after(async () => {
                    await Promise.all([
                        extractKnowledgeFromMessage({
                            profileId: me.id,
                            userMessage: userMsg,
                            aiReply: fullReply,
                            conversationContext: history.map(h => `${h.role}: ${h.body}`).join("\n"),
                        }),
                        embedAiMessage(userDbMsg.id, userMsg),
                        embedAiMessage(aiDbMsg.id, fullReply),
                    ]);
                    await prisma.aiUsage.create({
                        data: { profileId: me.id, kind: `converse-stream:${moduleOrigin || "general"}` },
                    });
                });
            } catch (e) {
                console.error("stream failed:", e);
                push({ type: "error", message: "internal" });
                controller.close();
            }
        },
    });

    return new Response(stream, {
        headers: {
            "Content-Type": "text/event-stream",
            "Cache-Control": "no-cache, no-transform",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        },
    });
}

function sseError(msg: string, status: number): Response {
    const body = `data: ${JSON.stringify({ type: "error", message: msg })}\n\n`;
    return new Response(body, {
        status,
        headers: { "Content-Type": "text/event-stream" },
    });
}
