// Humo AI — matnni tabiiy o'zbek ovoziga aylantirish (Gemini TTS, gemini-3.8-flash-tts).
// Chat "Ovoz bilan o'qish" tugmasi shu route'ni chaqiradi; xato bo'lsa frontend brauzer TTS'ga tushadi.
//   POST /api/ai/tts  { text, voice? }  ->  audio/wav

import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { nexusRateLimited, RATE_MSG } from "@/lib/nexus-rate";
import { synthesizeGeminiWav, GEMINI_TTS_VOICES, type GeminiTtsVoice } from "@/lib/ai-tts";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 30;

export async function POST(req: Request) {
    if (!process.env.GEMINI_API_KEY) {
        return NextResponse.json({ error: "tts_unavailable" }, { status: 503 });
    }
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) return NextResponse.json({ error: "auth_required" }, { status: 401 });
    const me = await prisma.userProfile.findUnique({
        where: { email: session.user.email }, select: { id: true },
    });
    if (!me) return NextResponse.json({ error: "profile_not_found" }, { status: 404 });
    // Yengil rate-limit (nexus "ai" oynasi) — TTS pullik bo'lishi mumkin, suiiste'molni cheklaymiz
    if (await nexusRateLimited(me.id, "ai")) return NextResponse.json({ error: RATE_MSG }, { status: 429 });

    const body = await req.json().catch(() => ({}));
    const text = String(body?.text ?? "").trim();
    if (!text) return NextResponse.json({ error: "text_required" }, { status: 400 });
    const voice = (GEMINI_TTS_VOICES as readonly string[]).includes(String(body?.voice))
        ? (String(body.voice) as GeminiTtsVoice) : "Kore";

    const wav = await synthesizeGeminiWav(text, voice);
    if (!wav) return NextResponse.json({ error: "tts_failed" }, { status: 502 });

    return new Response(new Uint8Array(wav), {
        status: 200,
        headers: {
            "Content-Type": "audio/wav",
            "Content-Length": String(wav.length),
            "Cache-Control": "no-store",
        },
    });
}
