// POST /api/nexus/ai/suggest-post — trending hashtag'lardan post fikri (Gemini)
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { aiText, aiAvailable } from "@/lib/ai";
import { nexusRateLimited } from "@/lib/nexus-rate";

export async function POST(req: Request) {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) return NextResponse.json({ error: "auth" }, { status: 401 });
    if (!aiAvailable()) return NextResponse.json({ error: "AI mavjud emas" }, { status: 503 });

    const me = await prisma.userProfile.findUnique({ where: { email: session.user.email }, select: { id: true } });
    if (!me) return NextResponse.json({ error: "no_profile" }, { status: 404 });

    // Rate-limit — post yaratish bilan bir xil oyna (spam'ni oldini olish)
    if (await nexusRateLimited(me.id, "post")) {
        return NextResponse.json({ error: "Ko'p urinish. Bir oz kuting" }, { status: 429 });
    }

    const body = await req.json().catch(() => ({}));
    const seedHint = typeof body?.hint === "string" ? body.hint.trim().slice(0, 200) : "";

    // So'nggi 200 postdan top-8 trending hashtag
    const recent = await prisma.nexusPost.findMany({
        where: { hidden: false, hashtags: { isEmpty: false } },
        select: { hashtags: true }, orderBy: { createdAt: "desc" }, take: 200,
    });
    const counts = new Map<string, number>();
    for (const r of recent) for (const t of r.hashtags) counts.set(t, (counts.get(t) || 0) + 1);
    const trending = [...counts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 8).map(([t]) => t);
    const tagBlock = trending.length ? `Trending mavzular: ${trending.map(t => "#" + t).join(", ")}.` : "";

    const sys = "Sen ForHumo Nexus ijtimoiy tarmog'i uchun O'zbek tilida qisqa, jonli post yozuvchi assistant'sen. " +
                "Faqat matn qaytar — hech qanday sarlavha, tushuntirish, tirnoq belgisi yoki markdown yo'q. " +
                "80-160 belgi orasida bo'lsin. 1-2 ta mos hashtag qo'shsa bo'ladi.";
    const prompt = [
        tagBlock,
        seedHint ? `Foydalanuvchi ishorasi: ${seedHint}` : "Trending mavzulardan birini tanla va do'stona post yoz.",
    ].filter(Boolean).join("\n");

    try {
        const text = await aiText(prompt, { system: sys, temperature: 0.9 });
        const clean = text.replace(/^["'`]|["'`]$/g, "").trim().slice(0, 280);
        return NextResponse.json({ text: clean, trending });
    } catch {
        return NextResponse.json({ error: "AI xatosi" }, { status: 502 });
    }
}
