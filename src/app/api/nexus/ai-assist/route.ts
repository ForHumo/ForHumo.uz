import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { aiAvailable, aiText, aiJSON } from "@/lib/ai";

// POST /api/nexus/ai-assist — ijodkorga AI yordami (Gemini)
// body: { action: "caption"|"title"|"tags"|"translate", ... }
export async function POST(req: Request) {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const me = await prisma.userProfile.findUnique({ where: { email: session.user.email }, select: { id: true } });
    if (!me) return NextResponse.json({ error: "Profil topilmadi" }, { status: 404 });
    if (!aiAvailable()) return NextResponse.json({ error: "AI hozircha mavjud emas" }, { status: 503 });

    const body = await req.json();
    const action = String(body.action || "");
    const input = String(body.input || body.text || body.topic || body.title || "").trim().slice(0, 4000);
    const kindLabel = ({ video: "video", track: "audio trek", post: "ijtimoiy post" } as Record<string, string>)[body.kind] || "ijtimoiy post";

    try {
        if (action === "caption") {
            if (!input) return NextResponse.json({ error: "Mavzu yoki sarlavha kerak" }, { status: 400 });
            const text = await aiText(
                `Sen O'zbekistondagi "Nexus" ijtimoiy platformasi uchun matn yozuvchisisan. Quyidagi mavzu bo'yicha qiziqarli, tabiiy ${kindLabel} tavsifini o'zbek tilida yoz. 2-4 jumla, jonli va do'stona ohangda. Oxirida 2-4 ta mos #hashtag qo'sh. Faqat tavsif matnini qaytar, boshqa hech narsa yozma.\n\nMavzu: ${input}`,
                { temperature: 0.85 },
            );
            return NextResponse.json({ result: text.trim() });
        }

        if (action === "translate") {
            const to = ({ uz: "o'zbek", ru: "rus", en: "ingliz" } as Record<string, string>)[body.to] || "o'zbek";
            if (!input) return NextResponse.json({ error: "Matn kerak" }, { status: 400 });
            const text = await aiText(
                `Quyidagi matnni ${to} tiliga tabiiy va ravon tarjima qil. Faqat tarjimani qaytar, izohsiz.\n\n${input}`,
                { temperature: 0.3 },
            );
            return NextResponse.json({ result: text.trim() });
        }

        if (action === "title") {
            if (!input) return NextResponse.json({ error: "Matn kerak" }, { status: 400 });
            const r = await aiJSON<{ titles: string[] }>(
                `Quyidagi ${kindLabel} mazmuni uchun 3 ta qisqa, jozibali sarlavha taklif qil (o'zbek tilida, har biri 60 belgidan kam). JSON: {"titles": ["...","...","..."]}\n\nMazmun: ${input}`,
                { temperature: 0.9 },
            );
            return NextResponse.json({ titles: (r?.titles ?? []).slice(0, 3) });
        }

        if (action === "tags") {
            if (!input) return NextResponse.json({ error: "Matn kerak" }, { status: 400 });
            const r = await aiJSON<{ tags: string[] }>(
                `Quyidagi matn uchun 5-8 ta mos hashtag taklif qil (o'zbekcha yoki inglizcha, # belgisiz, bo'sh joysiz). JSON: {"tags": ["tag1","tag2"]}\n\nMatn: ${input}`,
                { temperature: 0.7 },
            );
            const tags = (r?.tags ?? []).map(t => String(t).replace(/^#+/, "").replace(/\s+/g, "").trim()).filter(Boolean).slice(0, 8);
            return NextResponse.json({ tags });
        }

        return NextResponse.json({ error: "Noma'lum amal" }, { status: 400 });
    } catch {
        return NextResponse.json({ error: "AI javob bermadi, birozdan keyin urinib ko'ring" }, { status: 502 });
    }
}
