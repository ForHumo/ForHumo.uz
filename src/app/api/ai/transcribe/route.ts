// Ovozli xabar (audio) transkripsiyasi — Gemini API orqali.
//   POST /api/ai/transcribe  { audioUrl }

import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { aiAvailable } from "@/lib/ai";
import { nexusRateLimited, RATE_MSG } from "@/lib/nexus-rate";
import { prisma } from "@/lib/prisma";

const GEMINI_KEY = process.env.GEMINI_API_KEY;
const GEMINI_MODEL = process.env.GEMINI_MODEL || "gemini-2.5-flash-lite";
const MAX_AUDIO_BYTES = 8 * 1024 * 1024; // 8MB

export async function POST(req: Request) {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (!aiAvailable()) return NextResponse.json({ error: "AI yoqilmagan" }, { status: 503 });

    const me = await prisma.userProfile.findUnique({
        where: { email: session.user.email }, select: { id: true },
    });
    if (!me) return NextResponse.json({ error: "Profil topilmadi" }, { status: 404 });
    if (await nexusRateLimited(me.id, "ai")) return NextResponse.json({ error: RATE_MSG }, { status: 429 });

    const body = await req.json().catch(() => ({}));
    const audioUrl = String(body?.audioUrl ?? "").trim();
    if (!audioUrl || !/^https:\/\//.test(audioUrl)) {
        return NextResponse.json({ error: "audioUrl kerak" }, { status: 400 });
    }
    // Faqat Vercel Blob URL'iga ruxsat (SSRF himoya)
    if (!audioUrl.includes(".public.blob.vercel-storage.com")) {
        return NextResponse.json({ error: "Faqat ichki media URL" }, { status: 400 });
    }

    try {
        // Audio faylni yuklab olish (max 8MB)
        const audioRes = await fetch(audioUrl, { signal: AbortSignal.timeout(10_000) });
        if (!audioRes.ok) return NextResponse.json({ error: "audio topilmadi" }, { status: 502 });
        const contentLength = parseInt(audioRes.headers.get("content-length") || "0", 10);
        if (contentLength > MAX_AUDIO_BYTES) return NextResponse.json({ error: "audio juda katta (>8MB)" }, { status: 413 });
        const buf = await audioRes.arrayBuffer();
        if (buf.byteLength > MAX_AUDIO_BYTES) return NextResponse.json({ error: "audio juda katta" }, { status: 413 });

        const mime = audioRes.headers.get("content-type") || "audio/webm";
        const base64 = Buffer.from(buf).toString("base64");

        // Gemini so'rovi — inline audio + prompt
        const url = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${GEMINI_KEY}`;
        const r = await fetch(url, {
            method: "POST", headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                contents: [{ parts: [
                    { text: "Ushbu ovozli xabarni to'liq matnga aylantir. Faqat matnni qaytar, boshqa hech narsa yozma. Agar til noaniq bo'lsa, so'zlarni eshitilgani kabi yoz." },
                    { inline_data: { mime_type: mime, data: base64 } },
                ] }],
                generationConfig: { temperature: 0.1 },
            }),
            signal: AbortSignal.timeout(30_000),
        });
        if (!r.ok) {
            const t = await r.text().catch(() => "");
            return NextResponse.json({ error: `Gemini xato: ${r.status}`, hint: t.slice(0, 200) }, { status: 502 });
        }
        const data = await r.json();
        const text = String(data?.candidates?.[0]?.content?.parts?.[0]?.text ?? "").trim();
        if (!text) return NextResponse.json({ error: "Transkripsiya bo'sh" }, { status: 502 });
        return NextResponse.json({ ok: true, text });
    } catch (e) {
        return NextResponse.json({ error: e instanceof Error ? e.message : "transcribe_failed" }, { status: 500 });
    }
}
