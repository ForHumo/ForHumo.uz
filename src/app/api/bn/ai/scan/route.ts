// BN AI Scan — foydalanuvchi mahsulot rasmini yuklaydi, Vision AI tavsifiga
// asosan DB'da o'xshash mahsulotlarni topib qaytaradi.
//
// POST /api/bn/ai/scan   body: { imageUrl: string }
//   → { detected: { title, category, keywords }, products: BnProductDTO[] }

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { aiVisionJSON, aiAvailable } from "@/lib/ai";
import { searchProducts } from "@/lib/bn-data";

interface Detected {
    title: string;         // qisqa nom (masalan "iPhone 13 Midnight")
    categorySlug: string | null;
    keywords: string[];    // qidiruv uchun (brand, model, ...)
    hasProblem: string | null;
}

export async function POST(req: Request) {
    if (!aiAvailable()) {
        return NextResponse.json({ error: "ai_unavailable" }, { status: 503 });
    }

    const body = await req.json().catch(() => ({}));
    const imageUrl = String(body?.imageUrl ?? "").trim();
    if (!imageUrl) return NextResponse.json({ error: "imageUrl_required" }, { status: 400 });

    const cats = await prisma.bnCategory.findMany({
        where: { isActive: true },
        select: { slug: true, name: true },
    });
    const catList = cats.map(c => `${c.slug} — ${c.name}`).join("\n");

    const prompt = `
Sen ForHumo.uz Bozor Narxida uchun mahsulot skaneri. Foydalanuvchi mahsulot
rasmini yubordi. Rasmda nima ekanini aniqlab JSON qaytar:

{
  "title": "aniq nom (brand + model bo'lsa yozing, masalan 'Apple iPhone 13')",
  "categorySlug": "eng mos kategoriya slug (bo'lmasa null)",
  "keywords": ["brand", "model", "asosiy_xarakteristika", ...],  // 2-6 so'z, qidiruv uchun
  "hasProblem": null   // agar rasm mahsulot emas yoki nomaqbul bo'lsa, sabab. Aks holda null
}

Kategoriyalar:
${catList}

Muhim:
- EMOJI ISHLATMA
- Faqat ko'rinadigan narsani ta'riflang
- Keywords o'zbekcha/inglizcha bo'lishi mumkin, brand nomlarini asl ko'rinishda
`.trim();

    const detected = await aiVisionJSON<Detected>(prompt, imageUrl);
    if (!detected) {
        return NextResponse.json({ error: "ai_failed" }, { status: 502 });
    }
    if (detected.hasProblem) {
        return NextResponse.json({ ok: false, detected, products: [], reason: detected.hasProblem });
    }

    // Kategoriya validatsiyasi
    if (detected.categorySlug && !cats.some(c => c.slug === detected.categorySlug)) {
        detected.categorySlug = null;
    }

    // Qidiruv — asosiy keyword (birinchi 2 so'z) + kategoriya
    const searchQ = (detected.keywords ?? []).slice(0, 3).join(" ") || detected.title;
    const products = await searchProducts({
        q: searchQ,
        categorySlug: detected.categorySlug ?? undefined,
        limit: 20,
    });

    return NextResponse.json({ ok: true, detected, products });
}
