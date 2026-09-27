// Humo Live — ephemeral token (server mint qiladi, GEMINI_API_KEY brauzerga chiqmaydi).
// Client shu token bilan Gemini Live WebSocket'ga ulanadi (@google/genai, v1alpha).
//   POST /api/ai/live/token  ->  { token, model }

import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { nexusRateLimited, RATE_MSG } from "@/lib/nexus-rate";
import { GoogleGenAI } from "@google/genai";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Sinovdan o'tgan native-audio (jonli suhbat) modeli.
// ⚠️ Route faylida faqat maxsus eksportlar ruxsat etiladi — LIVE_MODEL'ni EKSPORT QILMA (lokal const).
const LIVE_MODEL = "gemini-2.5-flash-native-audio-preview-09-2025";

export async function POST() {
    if (!process.env.GEMINI_API_KEY) return NextResponse.json({ error: "live_unavailable" }, { status: 503 });

    const session = await getServerSession(authOptions);
    if (!session?.user?.email) return NextResponse.json({ error: "auth_required" }, { status: 401 });
    const me = await prisma.userProfile.findUnique({
        where: { email: session.user.email }, select: { id: true },
    });
    if (!me) return NextResponse.json({ error: "profile_not_found" }, { status: 404 });
    // Yengil rate-limit (Live pullik bo'lishi mumkin — suiiste'molni cheklaymiz)
    if (await nexusRateLimited(me.id, "ai")) return NextResponse.json({ error: RATE_MSG }, { status: 429 });

    try {
        const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
        const now = Date.now();
        const token = await ai.authTokens.create({
            config: {
                uses: 1,                                                       // bitta sessiya
                expireTime: new Date(now + 30 * 60_000).toISOString(),        // 30 daqiqa amal qiladi
                newSessionExpireTime: new Date(now + 60_000).toISOString(),   // 1 daqiqada ulanish boshlanishi kerak
            },
        });
        return NextResponse.json({ token: token.name, model: LIVE_MODEL });
    } catch (e) {
        console.error("[live/token]", e);
        return NextResponse.json({ error: "token_failed" }, { status: 502 });
    }
}
