// BN AI Listing — sotuvchi rasm yuklaydi, AI mahsulot ma'lumotini to'ldiradi.
// Gemini Vision → { title, description, categorySlug, marketAvgPrice, attributes }
//
// POST /api/bn/ai/listing
//   body: { imageUrl: string, categorySlug?: string, hint?: string }
//
//   Faqat APPROVED do'kon egasi (sotuvchi) uchun.
//   Gemini kaliti yo'q bo'lsa 503.

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireBnAuth } from "@/lib/bn-auth";
import { aiVisionJSON, aiAvailable } from "@/lib/ai";

interface AIResult {
    title: string;
    description: string;
    categorySlug: string | null;
    marketAvgPrice: number | null;
    attributes: Record<string, string | number | boolean>;
    hasProblem?: string;   // agar rasm mahsulot emas (adult, forbidden, etc.) — sabab
}

export async function POST(req: Request) {
    const auth = await requireBnAuth();
    if (auth instanceof NextResponse) return auth;

    if (!aiAvailable()) {
        return NextResponse.json({ error: "ai_unavailable" }, { status: 503 });
    }

    const shop = await prisma.bnShop.findUnique({
        where: { profileId: auth.profileId }, select: { status: true },
    });
    if (!shop || shop.status !== "APPROVED") {
        return NextResponse.json({ error: "no_shop" }, { status: 403 });
    }

    const body = await req.json().catch(() => ({}));
    const imageUrl = String(body?.imageUrl ?? "").trim();
    const hint = String(body?.hint ?? "").trim().slice(0, 200);
    const targetCategorySlug = body?.categorySlug ? String(body.categorySlug) : null;

    if (!imageUrl) return NextResponse.json({ error: "imageUrl_required" }, { status: 400 });

    // Kategoriyalar ro'yxati (AI aynan bittasini tanlaydi)
    const cats = await prisma.bnCategory.findMany({
        where: { isActive: true },
        orderBy: [{ order: "asc" }, { name: "asc" }],
        select: { slug: true, name: true, parentId: true },
    });
    const catList = cats.map(c => `${c.parentId ? "  " : ""}${c.slug} — ${c.name}`).join("\n");

    // Prompt (o'zbekcha, aniq)
    const prompt = `
Sen ForHumo.uz Bozor Narxida marketplace uchun sotuvchi yordamchisisan.
Sotuvchi mahsulot rasmini yukladi. Sen quyidagi ma'lumotlarni JSON qaytar:

{
  "title": "mahsulot nomi (uzbek, aniq, brend+model bo'lsa yozing)",
  "description": "2-3 gap tavsif (uzbek, ishonchli, mubolag'asiz)",
  "categorySlug": "eng mos slug (quyidagi ro'yxatdan aynan bir)",
  "marketAvgPrice": 0,  // Toshkent bozorida taxminiy narx (UZS, butun son). Aniqmasa 0
  "attributes": { "brand": "...", "model": "...", ... },  // faqat rasmdan aniqlanadigan qiymatlar
  "hasProblem": null  // agar rasm mahsulot emas yoki nomaqbul bo'lsa (adult, silah, giyohvand), qisqa sabab. Aks holda null.
}

Kategoriya ro'yxati:
${catList}

${targetCategorySlug ? `Sotuvchi tanlagan kategoriya: ${targetCategorySlug}` : ""}
${hint ? `Sotuvchi qo'shimcha ma'lumot: ${hint}` : ""}

Muhim:
- EMOJI ISHLATMA
- Faqat aniq ko'rinadigan ma'lumot yoz — taxmin qilma
- Narx faqat mahsulot turi bo'yicha o'rtacha (Toshkent bozori, 2026)
- Diniy/xalqchil qadriyatlarni buzuvchi (cho'chqa mahsuloti, alkogol) uchun hasProblem = "haram"
- Attributes'da faqat ishonchli qiymatlar (brand, model, size, color, memory, ...) — bilmasang tashla
`.trim();

    const result = await aiVisionJSON<AIResult>(prompt, imageUrl);
    if (!result) {
        return NextResponse.json({ error: "ai_failed" }, { status: 502 });
    }

    // Qayta ishlash — kategoriya slug haqiqiy ekanligini tekshirish
    if (result.categorySlug) {
        const exists = cats.some(c => c.slug === result.categorySlug);
        if (!exists) result.categorySlug = null;
    }

    return NextResponse.json({ ok: true, result });
}
