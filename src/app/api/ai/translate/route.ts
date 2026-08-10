// Matnni Gemini orqali o'zbek tiliga (yoki boshqasiga) tarjima qilish.
//   POST /api/ai/translate  body: { text, target?: "uz"|"ru"|"en" }

import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { aiAvailable, aiText } from "@/lib/ai";
import { nexusRateLimited, RATE_MSG } from "@/lib/nexus-rate";
import { prisma } from "@/lib/prisma";

const TARGET_LABEL: Record<string, string> = {
    uz: "O'zbek (lotin)",
    ru: "Русский",
    en: "English",
};

export async function POST(req: Request) {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (!aiAvailable()) return NextResponse.json({ error: "AI yoqilmagan" }, { status: 503 });

    const me = await prisma.userProfile.findUnique({ where: { email: session.user.email }, select: { id: true } });
    if (!me) return NextResponse.json({ error: "Profil topilmadi" }, { status: 404 });
    if (await nexusRateLimited(me.id, "ai")) return NextResponse.json({ error: RATE_MSG }, { status: 429 });

    const body = await req.json().catch(() => ({}));
    const text = String(body?.text ?? "").trim().slice(0, 3000);
    const target = ["uz", "ru", "en"].includes(String(body?.target)) ? String(body.target) : "uz";
    if (text.length < 1) return NextResponse.json({ error: "Matn bo'sh" }, { status: 400 });

    const prompt = `Quyidagi matnni ${TARGET_LABEL[target]} tiliga tarjima qil. Faqat tarjimani qaytar, boshqa hech narsa yozma.

Matn: """${text}"""`;

    try {
        const translated = await aiText(prompt);
        return NextResponse.json({ ok: true, translated: translated.trim() });
    } catch (e) {
        return NextResponse.json({ error: e instanceof Error ? e.message : "translate_failed" }, { status: 500 });
    }
}
