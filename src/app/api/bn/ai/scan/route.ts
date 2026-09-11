// BN AI Scan — foydalanuvchi mahsulot rasmini yuklaydi, Vision AI tavsifiga
// asosan DB'da o'xshash mahsulotlarni topib qaytaradi.
//
// POST /api/bn/ai/scan   body: { imageUrl: string }
//   → { detected: { title, category, keywords }, products: BnProductDTO[] }

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { aiVisionJSON, aiAvailable } from "@/lib/ai";
import { searchProducts } from "@/lib/bn-data";
import { aiGate } from "@/lib/ai-gate";

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

    // Auth + tezlik cheklovi (Gemini xarajatini himoya qilish)
    const gate = await aiGate("bn-scan");
    if (!gate.ok) return NextResponse.json({ error: gate.error }, { status: gate.status });

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

    // Qidiruv — bir necha strategiyada urinamiz (bosqichma-bosqich kengaytiramiz)
    const det = detected;   // TS uchun — closure ichida null-narrowing yo'qolmasin
    const keywords = (det.keywords ?? []).filter(k => k && k.length >= 2);
    const title = det.title || "";

    // Har bir kalit so'zni alohida qidiramiz, dublikatsiz birlashtiramiz
    const tried = new Set<string>();
    const collected: import("@/lib/bn-data").BnProductDTO[] = [];

    async function push(q: string, opts: { withCat?: boolean } = {}) {
        if (!q || tried.has(q + (opts.withCat ? "|c" : ""))) return;
        tried.add(q + (opts.withCat ? "|c" : ""));
        const arr = await searchProducts({
            q,
            categorySlug: opts.withCat ? det.categorySlug ?? undefined : undefined,
            limit: 20,
        });
        for (const p of arr) {
            if (!collected.find(x => x.id === p.id)) collected.push(p);
        }
    }

    // 1. Kategoriya + brand+model (aniq)
    if (keywords.length >= 2 && det.categorySlug) {
        await push(keywords.slice(0, 2).join(" "), { withCat: true });
    }
    // 2. Brand+model (kategoriyasiz — kategoriya noto'g'ri chiqishi mumkin)
    if (collected.length < 5 && keywords.length >= 2) {
        await push(keywords.slice(0, 2).join(" "));
    }
    // 3. To'liq keywords
    if (collected.length < 5 && keywords.length > 0) {
        await push(keywords.join(" "));
    }
    // 4. Har bir keyword alohida
    if (collected.length < 5) {
        for (const kw of keywords.slice(0, 4)) {
            if (collected.length >= 20) break;
            await push(kw);
        }
    }
    // 5. Sarlavha bo'yicha
    if (collected.length < 5 && title) {
        await push(title);
        // Sarlavhaning birinchi so'zi
        const first = title.split(/\s+/)[0];
        if (first && first.length >= 3) await push(first);
    }
    // 6. Faqat kategoriya (bo'sh bo'lmasa hech bo'lmasa kategoriya bo'yicha ko'rsatamiz)
    if (collected.length < 3 && det.categorySlug) {
        const arr = await searchProducts({ categorySlug: det.categorySlug, limit: 10 });
        for (const p of arr) {
            if (!collected.find(x => x.id === p.id)) collected.push(p);
        }
    }

    return NextResponse.json({ ok: true, detected: det, products: collected.slice(0, 20) });
}
