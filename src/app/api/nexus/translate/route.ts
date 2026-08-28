import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { aiText, aiAvailable } from "@/lib/ai";

// Batch X — Chat/matn tarjima (Gemini)
// POST /api/nexus/translate { text, targetLang: "uz"|"ru"|"en"|... }
// Rate: har user'ga 60 req/min
const RATE_MS = 60_000;
const RATE_MAX = 60;
const store = new Map<string, number[]>();

function limited(id: string): boolean {
    const now = Date.now();
    const arr = (store.get(id) || []).filter(t => now - t < RATE_MS);
    if (arr.length >= RATE_MAX) return true;
    arr.push(now); store.set(id, arr);
    return false;
}

export async function POST(req: Request) {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const me = await prisma.userProfile.findUnique({ where: { email: session.user.email }, select: { id: true } });
    if (!me) return NextResponse.json({ error: "Profil topilmadi" }, { status: 404 });
    if (limited(me.id)) return NextResponse.json({ error: "Juda ko'p so'rov" }, { status: 429 });
    if (!aiAvailable()) return NextResponse.json({ error: "AI mavjud emas" }, { status: 503 });

    const { text, targetLang } = await req.json();
    const t = String(text || "").trim().slice(0, 500);
    const lang = ["uz", "ru", "en", "tr", "ar", "es", "fr"].includes(targetLang) ? targetLang : "uz";
    if (!t) return NextResponse.json({ error: "Matn kerak" }, { status: 400 });

    const prompt = `Translate the following text to ${lang === "uz" ? "Uzbek (Latin script)" : lang === "ru" ? "Russian" : lang === "en" ? "English" : lang === "tr" ? "Turkish" : lang === "ar" ? "Arabic" : lang === "es" ? "Spanish" : "French"}. Preserve emojis and hashtags. Output ONLY the translation, no explanations, no quotes:\n\n${t}`;
    try {
        const translated = await aiText(prompt);
        return NextResponse.json({ translated: (translated || "").trim().slice(0, 800) });
    } catch {
        return NextResponse.json({ error: "Tarjima muvaffaqiyatsiz" }, { status: 500 });
    }
}
