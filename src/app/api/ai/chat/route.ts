import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";
import { aiAvailable, aiChatJSON, type ChatMsg } from "@/lib/ai";
import { MARKET_CATEGORIES } from "@/lib/market-categories";

interface ChatReply {
    reply: string;
    search?: { keywords?: string; category?: string | null; maxPrice?: number | null } | null;
}

// POST /api/ai/chat — suhbat yordamchisi (mahsulot tavsiyasi bilan)
export async function POST(req: Request) {
    if (!aiAvailable())
        return NextResponse.json({ error: "AI hali sozlanmagan", code: "AI_NO_KEY" }, { status: 503 });

    const { messages } = await req.json() as { messages: { role: "user" | "assistant"; content: string }[] };
    if (!Array.isArray(messages) || !messages.length)
        return NextResponse.json({ error: "Xabar yo'q" }, { status: 400 });

    const catList = MARKET_CATEGORIES.map(c => `${c.slug} (${c.name})`).join(", ");
    const system = `Sen "Humo Market" onlayn-do'konining do'stona xarid yordamchisisan.
Foydalanuvchiga mahsulot tanlashda yordam ber, savol ber, tavsiya qil. TILI: O'zbek (lotin). EMOJI ISHLATMA. Qisqa va samimiy.
Agar foydalanuvchi nimadir qidirsa yoki tavsiya so'rasa, "search" maydonini to'ldir.
Kategoriya FAQAT shu ro'yxatdan yoki null: ${catList}. Narx Ƶ (1Ƶ=1$).

HAR DOIM faqat JSON qaytar:
{"reply": "javobing (o'zbekcha)", "search": {"keywords": "qidiruv so'zi yoki bo'sh", "category": "slug yoki null", "maxPrice": son yoki null} yoki null}`;

    const chatMsgs: ChatMsg[] = messages.slice(-10).map(m => ({
        role: m.role === "assistant" ? "model" : "user",
        text: String(m.content || "").slice(0, 1000),
    }));

    let out: ChatReply | null = null;
    try {
        out = await aiChatJSON<ChatReply>(chatMsgs, { system, temperature: 0.7 });
    } catch (e) {
        return NextResponse.json({ error: "AI xatosi: " + (e as Error).message.slice(0, 120) }, { status: 502 });
    }
    if (!out?.reply) return NextResponse.json({ reply: "Kechirasiz, qayta urinib ko'ring.", products: [] });

    // Tavsiya qilingan mahsulotlar
    let products: unknown[] = [];
    const s = out.search;
    if (s && (s.keywords?.trim() || s.category)) {
        const validCat = s.category && MARKET_CATEGORIES.some(c => c.slug === s.category) ? s.category : null;
        const where: Prisma.MarketProductWhereInput = {
            isActive: true,
            ...(validCat ? { category: validCat } : {}),
            ...(typeof s.maxPrice === "number" && s.maxPrice > 0 ? { price: { lte: s.maxPrice } } : {}),
            ...(s.keywords?.trim() ? {
                OR: [
                    { name: { contains: s.keywords.trim(), mode: "insensitive" } },
                    { description: { contains: s.keywords.trim(), mode: "insensitive" } },
                ],
            } : {}),
        };
        products = await prisma.marketProduct.findMany({
            where, orderBy: [{ isFeatured: "desc" }, { sold: "desc" }], take: 6,
            include: { brand: { select: { name: true, slug: true, verified: true } } },
        });
    }

    return NextResponse.json({ reply: out.reply, products });
}
