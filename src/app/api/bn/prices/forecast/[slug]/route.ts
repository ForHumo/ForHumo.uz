// BN Kategoriya narx prognozi — Gemini AI orqali.
// Tarixiy narx (30 kun) + hozirgi mavsum ma'lumoti Gemini'ga uzatiladi,
// AI 2 hafta prognoz beradi (matn izohi + trend).
//
// GET /api/bn/prices/forecast/[slug] → { forecast: { direction, magnitude, reason, ... } }

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { aiJSON, aiAvailable } from "@/lib/ai";

export const dynamic = "force-dynamic";
export const revalidate = 21600; // 6 soat

interface Forecast {
    direction: "up" | "down" | "flat";
    magnitudePct: number;             // taxminiy % o'zgarish
    reason: string;                   // qisqa izoh (o'zbekcha)
    confidence: "low" | "medium" | "high";
    horizonDays: number;              // prognoz muddati
}

export async function GET(_req: Request, { params }: { params: Promise<{ slug: string }> }) {
    const { slug } = await params;
    if (!aiAvailable()) return NextResponse.json({ forecast: null, reason: "ai_unavailable" });

    const category = await prisma.bnCategory.findUnique({
        where: { slug },
        select: { id: true, name: true },
    });
    if (!category) return NextResponse.json({ error: "not_found" }, { status: 404 });

    // Sub-kategoriya id'lari
    const children = await prisma.bnCategory.findMany({
        where: { parentId: category.id }, select: { id: true },
    });
    const catIds = [category.id, ...children.map(c => c.id)];

    // Hozirgi narxlar
    const products = await prisma.bnProduct.findMany({
        where: {
            categoryId: { in: catIds },
            isActive: true, hidden: false, stock: { gt: 0 },
        },
        select: { id: true, price: true, title: true },
        take: 200,
    });
    if (products.length === 0) return NextResponse.json({ forecast: null });

    const currentAvg = Math.round(products.reduce((a, b) => a + b.price, 0) / products.length);

    // 30 kunlik tarix
    const monthAgo = new Date(Date.now() - 30 * 24 * 3600 * 1000);
    const history = await prisma.bnPriceHistory.findMany({
        where: { productId: { in: products.map(p => p.id) }, capturedAt: { gte: monthAgo } },
        select: { price: true, capturedAt: true },
        take: 1000,
    });

    // Kunlik o'rtacha
    const byDay = new Map<string, number[]>();
    for (const h of history) {
        const day = h.capturedAt.toISOString().slice(0, 10);
        const arr = byDay.get(day) ?? [];
        arr.push(h.price);
        byDay.set(day, arr);
    }
    const dailyAvg = Array.from(byDay.entries())
        .map(([day, arr]) => ({ day, avg: Math.round(arr.reduce((a, b) => a + b, 0) / arr.length) }))
        .sort((a, b) => a.day.localeCompare(b.day));

    const now = new Date();
    const month = now.getMonth() + 1;
    const seasonHint =
        month >= 3 && month <= 5 ? "bahor (yangi sabzavot/meva boshlanadi, narx pasayadi)" :
        month >= 6 && month <= 8 ? "yoz (mevalar mo'l, narx eng past)" :
        month >= 9 && month <= 11 ? "kuz (hosil yakuni, saqlashga o'tish, narx ko'tarila boshlaydi)" :
        "qish (asosan importi bor, narx eng yuqori)";

    const prompt = `Sen O'zbekiston bozor narxlari bo'yicha AI ekspert'sansan. Tahlil qilib prognoz ber.

KATEGORIYA: ${category.name}
JORIY O'RTACHA NARX: ${currentAvg} so'm
JORIY MAHSULOT SONI: ${products.length}
MAVSUM: ${seasonHint}
TARIX (kunlik o'rtacha, oxirgi 30 kun):
${dailyAvg.slice(-14).map(d => `${d.day}: ${d.avg}`).join("\n")}

VAZIFA: 14 kunlik prognoz ber. Faqat JSON qaytar:
{
  "direction": "up" | "down" | "flat",
  "magnitudePct": <taxminiy foiz o'zgarish, masalan 10 (+10%) yoki -5>,
  "reason": "qisqa o'zbekcha izoh, mavsum va tarixni asos qil (max 100 belgi)",
  "confidence": "low" | "medium" | "high",
  "horizonDays": 14
}`;

    const forecast = await aiJSON<Forecast>(prompt).catch(() => null);
    if (!forecast) return NextResponse.json({ forecast: null });

    // Clamp values
    forecast.magnitudePct = Math.max(-50, Math.min(50, Math.round(forecast.magnitudePct)));
    if (!["up", "down", "flat"].includes(forecast.direction)) forecast.direction = "flat";
    if (!["low", "medium", "high"].includes(forecast.confidence)) forecast.confidence = "low";

    return NextResponse.json({
        forecast,
        currentAvg,
        productCount: products.length,
        category: { slug, name: category.name },
    });
}
