// Gen Pic — rasm yaratish (Cloudflare Workers AI, Flux-1-schnell — bepul tier).
// POST /api/ai/imagen  body: { prompt, conversationId? }
// Rasm Vercel Blob'ga saqlanadi; AiConversation(mode="pic") + AiMessage (user prompt + AI rasm).
//
// Kalit: CLOUDFLARE_ACCOUNT_ID (mavjud — Stream uchun) + CLOUDFLARE_WORKERS_AI_TOKEN (yangi,
// "Workers AI" ruxsatli). Yo'q bo'lsa 503 — sayt buzilmaydi.

import { NextResponse, after } from "next/server";
import { put } from "@vercel/blob";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { aiGenerateImage } from "@/lib/ai";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

const CF_ACCOUNT = process.env.CLOUDFLARE_ACCOUNT_ID;
const CF_TOKEN = process.env.CLOUDFLARE_WORKERS_AI_TOKEN;
const MODEL = "@cf/black-forest-labs/flux-1-schnell";
const MAX_PER_DAY = 15;              // 15 rasm / kun / profil
const DAY_MS = 24 * 60 * 60 * 1000;

const CF_READY = !!(CF_ACCOUNT && CF_TOKEN);
const GEMINI_READY = !!process.env.GEMINI_API_KEY;

export async function POST(req: Request) {
    // Kamida bitta rasm-provayder kerak: Cloudflare Flux YOKI Gemini flash-image
    if (!CF_READY && !GEMINI_READY) {
        return NextResponse.json({ error: "Gen Pic hali sozlanmagan (rasm-model kaliti yo'q)" }, { status: 503 });
    }
    if (!process.env.BLOB_READ_WRITE_TOKEN) {
        return NextResponse.json({ error: "storage_not_configured" }, { status: 503 });
    }

    const session = await getServerSession(authOptions);
    if (!session?.user?.email) return NextResponse.json({ error: "auth_required" }, { status: 401 });
    const me = await prisma.userProfile.findUnique({
        where: { email: session.user.email }, select: { id: true },
    });
    if (!me) return NextResponse.json({ error: "profile_not_found" }, { status: 404 });

    // Rate limit — kuniga 15 rasm (aiUsage.kind="imagen" bilan sanaladi)
    try {
        const used = await prisma.aiUsage.count({
            where: { profileId: me.id, kind: "imagen", createdAt: { gt: new Date(Date.now() - DAY_MS) } },
        });
        if (used >= MAX_PER_DAY) {
            return NextResponse.json({ error: `Kuniga ${MAX_PER_DAY} rasm chegarasi. Ertaga urinib ko'ring.` }, { status: 429 });
        }
    } catch { /* fail-open */ }

    const body = await req.json().catch(() => ({}));
    const prompt = String(body?.prompt ?? "").trim().slice(0, 1000);
    if (prompt.length < 3) return NextResponse.json({ error: "prompt_required" }, { status: 400 });
    // Suhbat rejimi — Chat Bot ichida rasm so'ralsa suhbat "chat" bo'lib qoladi (pic history'ga ketmaydi)
    const convMode = ["chat", "code", "pic", "vid", "music", "cowork"].includes(String(body?.mode)) ? String(body.mode) : "pic";
    let conversationId: string | undefined = typeof body?.conversationId === "string" ? body.conversationId : undefined;

    // Rasm generatsiya — 1) Cloudflare Flux (sozlangan bo'lsa), 2) Gemini flash-image (fallback)
    let base64 = "";
    let outMime = "image/jpeg";
    let usedModel = "";

    if (CF_READY) {
        try {
            const res = await fetch(
                `https://api.cloudflare.com/client/v4/accounts/${CF_ACCOUNT}/ai/run/${MODEL}`,
                {
                    method: "POST",
                    headers: { "Authorization": `Bearer ${CF_TOKEN}`, "Content-Type": "application/json" },
                    body: JSON.stringify({ prompt, steps: 4 }),
                },
            );
            if (res.ok) {
                const data = await res.json();
                base64 = data?.result?.image ?? "";
                if (base64) { outMime = "image/jpeg"; usedModel = "flux-1-schnell"; }
            } else {
                console.error("[imagen] CF error", res.status, (await res.text().catch(() => "")).slice(0, 200));
            }
        } catch (e) {
            console.error("[imagen] CF network", e);
        }
    }

    // Fallback: Gemini flash-image ("Nano Banana") — GEMINI_API_KEY mavjud (chat bilan bir xil)
    if (!base64 && GEMINI_READY) {
        const img = await aiGenerateImage(prompt);
        if (img) { base64 = img.base64; outMime = img.mime || "image/png"; usedModel = "gemini-2.5-flash-image"; }
    }

    if (!base64) {
        return NextResponse.json({ error: "Rasm yaratilmadi (server band). Birozdan keyin urinib ko'ring." }, { status: 502 });
    }

    // base64 → Vercel Blob
    const buf = Buffer.from(base64, "base64");
    const ext = outMime.includes("png") ? "png" : outMime.includes("webp") ? "webp" : "jpg";
    const filename = `ai/gen/${me.id.slice(0, 12)}-${Date.now()}.${ext}`;
    const blob = await put(filename, buf, { access: "public", contentType: outMime, addRandomSuffix: true });

    // Suhbat (mode="pic") + xabarlar
    let conv = conversationId
        ? await prisma.aiConversation.findFirst({ where: { id: conversationId, profileId: me.id } })
        : null;
    if (!conv) {
        conv = await prisma.aiConversation.create({
            data: {
                profileId: me.id,
                title: prompt.slice(0, 60).replace(/\s+/g, " "),
                mode: convMode, topic: convMode === "pic" ? "pic" : null,
                lastMsgAt: new Date(),
            },
        });
        conversationId = conv.id;
    }
    const userMsg = await prisma.aiMessage.create({
        data: { conversationId: conv.id, role: "user", body: prompt },
    });
    const aiMsg = await prisma.aiMessage.create({
        data: {
            conversationId: conv.id, role: "ai", body: "",
            attachmentUrl: blob.url, attachmentType: "image", aiModel: usedModel || "gen-image",
        },
    });
    await prisma.aiConversation.update({ where: { id: conv.id }, data: { lastMsgAt: new Date() } });
    after(() => prisma.aiUsage.create({ data: { profileId: me.id, kind: "imagen" } }).catch(() => {}));

    return NextResponse.json({
        ok: true,
        conversationId: conv.id,
        messages: [
            { id: userMsg.id, role: "user", body: prompt, createdAt: userMsg.createdAt.toISOString() },
            { id: aiMsg.id, role: "ai", body: "", attachmentUrl: blob.url, attachmentType: "image", createdAt: aiMsg.createdAt.toISOString() },
        ],
    });
}
