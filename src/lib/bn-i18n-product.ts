// BN mahsulot tarjimasi — sotuvchi bir tilda yozadi, AI 3 tilga tarjima qiladi
// va searchIndex hosil qiladi. Xaridor har uchta tilda ham topa oladi.
//
// Muhim: bu fon (fire-and-forget) jarayon — sotuvchining POST javobi kechiktirilmaydi.
// Xato bo'lsa jim (fail-safe), title/description asosiy tilda qoladi.

import { prisma } from "@/lib/prisma";
import { aiJSON, aiAvailable } from "@/lib/ai";
import { transliterate } from "@/lib/bn-i18n-product-lite";

interface Translations {
    titleUz: string;
    titleRu: string;
    titleEn: string;
    descUz: string;
    descRu: string;
    descEn: string;
    keywords: string[];   // qo'shimcha kalit so'zlar (transliteratsiya, sinonimlar)
}

// transliterate — bn-i18n-product-lite.ts dan import qilinadi (Prisma'siz)

/**
 * `searchIndex` maydonini tuzish. Barcha tarjimalar + transliteratsiya + kalit so'zlar
 * bo'shliq bilan ajratilib, lowercased qilinadi. `contains` qidiruv shu maydonga qarab
 * juda tez ishlaydi (Postgres GIN indeksi bo'lsa yaxshi, lekin oddiy trgm ham yetadi).
 */
export function buildSearchIndex(fields: {
    title?: string | null;
    titleUz?: string | null;
    titleRu?: string | null;
    titleEn?: string | null;
    description?: string | null;
    descriptionUz?: string | null;
    descriptionRu?: string | null;
    descriptionEn?: string | null;
    keywords?: string[];
}): string {
    const parts: string[] = [];
    const add = (s: string | null | undefined) => {
        if (!s) return;
        const t = s.trim();
        if (!t) return;
        parts.push(t.toLowerCase());
        // Transliteratsiya (kirillcha bor bo'lsa lotin, aksincha)
        for (const alt of transliterate(t)) parts.push(alt.toLowerCase());
    };
    add(fields.title);
    add(fields.titleUz); add(fields.titleRu); add(fields.titleEn);
    add(fields.description);
    add(fields.descriptionUz); add(fields.descriptionRu); add(fields.descriptionEn);
    for (const k of fields.keywords ?? []) add(k);
    // Dublikatsiz + max 4000 belgi
    const uniq = Array.from(new Set(parts));
    return uniq.join(" ").slice(0, 4000);
}

/**
 * Yaratilgan mahsulot uchun 3 tilga tarjima + searchIndex.
 * Fon rejimida chaqiriladi (after()) — API javobini kechiktirmaydi.
 * Xato bo'lsa jim.
 */
export async function translateAndIndexProduct(productId: string): Promise<void> {
    try {
        const p = await prisma.bnProduct.findUnique({
            where: { id: productId },
            select: {
                title: true, description: true,
                titleUz: true, titleRu: true, titleEn: true,
                descriptionUz: true, descriptionRu: true, descriptionEn: true,
            },
        });
        if (!p) return;

        // AI mavjud bo'lsa 3 tilga tarjima
        let translations: Translations | null = null;
        if (aiAvailable()) {
            const prompt = `Sen ForHumo.uz Bozor Narxida marketplace uchun mahsulot tarjimonisan.
Sotuvchi mahsulotini kiritdi, uni 3 tilga (o'zbek lotincha, rus, ingliz) tarjima qil.
Xaridor har uchta tilda ham topa olishi uchun sinonimlar va kalit so'zlar ham qo'sh.

Kiritilgan:
  Sarlavha: ${p.title}
  Tavsif: ${p.description ?? ""}

JSON qaytar:
{
  "titleUz": "o'zbekcha (lotin) nomi",
  "titleRu": "russkoye nazvaniye (кириллица)",
  "titleEn": "english name",
  "descUz": "qisqa o'zbekcha tavsifi (yoki bo'sh string)",
  "descRu": "русское описание (или пустая строка)",
  "descEn": "english description (or empty string)",
  "keywords": ["sinonimlar", "transliteratsiya varianti", "brand", "часы", "watch", ...]
}

Muhim:
- Titles majburiy 3 tilda ham to'ldirilsin
- Description bo'sh bo'lsa bo'sh qoldiring, o'zingizdan yaratmang
- Keywords ichida ISHLATILADIGAN sinonimlar/brend variantlari (masalan "kolbasa" → "колбаса", "sausage" ; "soat" → "часы", "watch") bo'lsin
- EMOJI ISHLATMA`;
            translations = await aiJSON<Translations>(prompt).catch(() => null);
        }

        // AI ishlamasa faqat asosiy tildan tuzamiz (searchIndex faqat title/description bilan)
        const data: {
            titleUz?: string | null; titleRu?: string | null; titleEn?: string | null;
            descriptionUz?: string | null; descriptionRu?: string | null; descriptionEn?: string | null;
            searchIndex: string;
        } = { searchIndex: "" };

        if (translations) {
            if (translations.titleUz) data.titleUz = translations.titleUz.slice(0, 200);
            if (translations.titleRu) data.titleRu = translations.titleRu.slice(0, 200);
            if (translations.titleEn) data.titleEn = translations.titleEn.slice(0, 200);
            if (translations.descUz)  data.descriptionUz = translations.descUz.slice(0, 2000);
            if (translations.descRu)  data.descriptionRu = translations.descRu.slice(0, 2000);
            if (translations.descEn)  data.descriptionEn = translations.descEn.slice(0, 2000);
        }

        data.searchIndex = buildSearchIndex({
            title: p.title,
            titleUz: data.titleUz ?? p.titleUz,
            titleRu: data.titleRu ?? p.titleRu,
            titleEn: data.titleEn ?? p.titleEn,
            description: p.description,
            descriptionUz: data.descriptionUz ?? p.descriptionUz,
            descriptionRu: data.descriptionRu ?? p.descriptionRu,
            descriptionEn: data.descriptionEn ?? p.descriptionEn,
            keywords: translations?.keywords ?? [],
        });

        await prisma.bnProduct.update({
            where: { id: productId },
            data,
        });
    } catch (e) {
        console.error("[bn-i18n-product]", e);
    }
}
