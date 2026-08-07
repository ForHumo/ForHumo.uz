// BN uchun kuchaytirilgan moderatsiya.
// 2 bosqich:
//   1) Kalit-so'z tekshirishi (tez, aniq) — sinonim + transliteratsiya
//   2) AI (Gemini vision+text) — BN uchun aniqroq prompt bilan
//
// Qoidalar:
//   - O'zbekiston Respublikasi qonunlarini buzmasin
//   - Islom diniga zid mahsulot bo'lmasin (cho'chqa go'shti/yog'i,
//     tarkibida cho'chqa yog'i bo'lgan shokoladlar va h.k.)
//   - Boykot qilingan brendlar taqiqlangan
//   - Alkogol, giyohvand, qurol, sigareta, dori-darmon — taqiqlangan

import { aiAvailable, aiVisionJSON } from "@/lib/ai";
import type { ModResult, ModVerdict } from "@/lib/ai-moderate";

/**
 * Har toifada ko'p variantlar — o'zbek/rus/lotin/kirill/emoji almashtirishlari.
 * Sotuvchilar aylanib o'tishga harakat qilsa ham topa oladigan qilib yozilgan.
 */
const FORBIDDEN: Array<{ category: string; label: string; patterns: RegExp[]; severity?: number }> = [
    {
        category: "haram_pork",
        label: "Cho'chqa mahsuloti",
        severity: 0.95,
        patterns: [
            /\bcho['`ʻʼ]chqa\b/iu,
            /\bcho4qa\b/iu,             // aylanib o'tish
            /\bcho\.chqa\b/iu,
            /\bчочка\b/iu,
            /\bchochka\b/iu,
            /\bсвинин[аеы]\b/iu,
            /\bсвинья\b/iu,
            /\bсало\b/iu,               // cho'chqa yog'i
            /\bpork\b/iu,
            /\bbekon\b/iu,
            /\bbacon\b/iu,
            /\bветчин[аы]\b/iu,
            /\bxam\b\s*(pork|svin)/iu,
        ],
    },
    {
        category: "haram_alcohol",
        label: "Alkogol",
        severity: 0.9,
        patterns: [
            /\bvodka\b/iu,
            /\bviski\b/iu,
            /\bwhiskey\b/iu,
            /\bwine\b/iu,
            /\bvino\b/iu,
            /\bpivo\b/iu,
            /\bbeer\b/iu,
            /\bконьяк\b/iu,
            /\bkonyak\b/iu,
            /\bshampan/iu,
            /\bшампан/iu,
            /\bспирт\b/iu,
            /\bspirt\b/iu,
            /\balkogol/iu,
            /\bалкоголь\b/iu,
        ],
    },
    {
        category: "illegal_drug",
        label: "Giyohvand modda / dori-darmon",
        severity: 0.98,
        patterns: [
            /\bgeroin\b/iu, /\bheroin\b/iu,
            /\bkokain\b/iu, /\bcocaine\b/iu,
            /\bmarihuan/iu, /\bмарихуан/iu, /\bmarijuana\b/iu,
            /\bkanabis\b/iu, /\bcannabis\b/iu,
            /\bhashish\b/iu, /\bгашиш\b/iu,
            /\bамфетамин/iu, /\bamfetamin/iu,
            /\bekstazi\b/iu, /\bэкстази\b/iu,
            /\bLSD\b/i,
            /\btramadol\b/iu, /\bтрамадол/iu,
            /\bnarkotik/iu, /\bнаркотик/iu,
        ],
    },
    {
        category: "weapon",
        label: "Qurol",
        severity: 0.9,
        patterns: [
            /\bpistolet\b/iu, /\bпистолет/iu,
            /\bavtomat\b/iu,
            /\bpulemyot/iu, /\bпулемёт/iu,
            /\bgranata\b/iu, /\bграната/iu,
            /\btropovnik/iu,
            /\bkalashnikov/iu, /\bкалашников/iu,
            /\bAK-?47\b/i,
            /\bglock\b/iu, /\bглок\b/iu,
            /\bpatron\b\s*(9|7\.62|5\.45)/iu,
        ],
    },
    {
        category: "cigarette",
        label: "Tamaki mahsuloti",
        severity: 0.75,
        patterns: [
            /\bsigaret/iu, /\bсигарет/iu,
            /\bmarlboro\b/iu,
            /\bkent\b/iu,
            /\bparliament/iu, /\bпарламент/iu,
            /\bvape\b/iu, /\bвейп/iu,
            /\bэлектронн[аоы][ея]?\s*сигарет/iu,
            /\belectronic\s*cigarette/iu,
            /\biqos\b/iu,
        ],
    },
    {
        category: "boycott_brand",
        label: "Boykot qilingan brend",
        severity: 0.85,
        // NOTE: aniq ro'yxat foydalanuvchi + Jalol bilan uchrashib to'ldiriladi.
        // Hozircha yagona misol — kelasi kengaytiriladi.
        patterns: [
            // Bo'sh — MODERATOR panel orqali dinamik qo'shiladi (kelajakda)
        ],
    },
    {
        category: "adult",
        label: "18+ / voyaga yetmagan uchun mos emas",
        severity: 0.9,
        patterns: [
            /\bporn/iu, /\bпорн/iu,
            /\berotik/iu, /\bэротик/iu,
            /\bseks-?igrushk/iu,
            /\bsex\s*toy/iu,
        ],
    },
];

export interface BnModResult extends ModResult {
    /** Kalit-so'z asosli bloklandimi (AI'ga bormasdan) */
    keywordHit?: { category: string; label: string } | null;
}

/**
 * Matnda taqiqlangan kalit so'z bormi tekshirish.
 * Return: ({category, label, severity}) yoki null.
 */
export function checkForbiddenKeywords(text: string): { category: string; label: string; severity: number } | null {
    const t = (text || "").toLowerCase();
    if (!t.trim()) return null;
    for (const rule of FORBIDDEN) {
        for (const re of rule.patterns) {
            if (re.test(t)) {
                return { category: rule.category, label: rule.label, severity: rule.severity ?? 0.9 };
            }
        }
    }
    return null;
}

/** BN'ga xos qat'iyroq system prompt (rasm+matn birga). */
const BN_SYSTEM = `Sen "Bozor Narxida" (BN) marketplace uchun kontent moderatorisan.
Auditoriya: O'zbekiston. Mahsulotni tasdiqlash oldidan uni sinchkovlik bilan tekshir.

QAT'IY TAQIQLANGAN (BLOCK):
1) Cho'chqa mahsuloti: cho'chqa go'shti, cho'chqa yog'i, bekon, vetchina, cho'chqa yog'i qo'shilgan shokolad/kolbasa/qandolat.
2) Alkogol: aroq, vino, pivo, konyak, viski, shampan, spirt.
3) Sigareta va tamaki mahsuloti: sigaret, vape, IQOS, elektron sigareta.
4) Qurol va o'q-dorilar: har qanday shakl (o'yinchoq va bezaklardan tashqari).
5) Giyohvand modda va psixotrop dorilar (retsepsiz).
6) Retseptli dori-darmon retseptsiz.
7) Qalbaki brend (fake): asl brend nomi bilan sotilgan kontrafakt.
8) O'g'irlangan yoki qonun bilan taqiqlangan mol.
9) 18+ kontent: pornografik, jinsiy o'yinchoq.
10) Firibgarlik yoki soxta sotuv sxemasi.

Ehtiyot bo'lish (REVIEW, admin ko'rsin):
- Noaniq brend nomi (asl yoki qalbaki bo'lishi mumkin — rasmga qara)
- Retseptsiz sotilishi mumkin bo'lgan lekin sanoat farmatsevtik ko'rinishi
- Halol status shubhali oziq-ovqat (rasmda tarkib ko'rinmasa — REVIEW)
- Chegirma va garov haqidagi shubhali va'dalar

KO'ZDAN QOCHIRMA:
- Rasmda va matnda bir xil ma'lumot bo'lmasligi (matn hologram, rasm alkogol) — BLOCK
- Sotuvchi kalit so'zni yashirishga urinishi (masalan "vodka" o'rniga "v0dk4", "cho.chqa") — BLOCK
- Chet til (ru/en/uz) da yozilgan taqiqlangan kalit so'zlar
- Emoji va sonlar bilan yashirin so'zlar (🍺 = pivo)

Ruxsat (OK):
- Halol oziq-ovqat, kiyim, elektronika, ehtiyot qismlar
- Diniy va milliy taomlar, kitob, gilam, sovg'a
- Sport va bolalar mahsulotlari

verdict: "OK" | "REVIEW" | "BLOCK". severity: 0.0..1.0.
FAQAT JSON: {"verdict":"...","categories":["..."],"severity":0.0,"reason":"o'zbekcha qisqa sabab"}`;

/**
 * BN uchun mahsulotni moderatsiya qilish.
 * Avval kalit-so'zlar orqali tez tekshiruv (BLOCK yoki OK-quick).
 * Keyin AI (agar mavjud bo'lsa).
 */
export async function moderateBnProduct(input: {
    title: string;
    description?: string | null;
    imageUrl?: string | null;
}): Promise<BnModResult | null> {
    // 1) Kalit-so'z tekshiruvi (rus/uz/lotin/kirill sinonimlar bilan)
    const combined = [input.title, input.description ?? ""].join(" \n ");
    const hit = checkForbiddenKeywords(combined);
    if (hit) {
        return {
            verdict: "BLOCK",
            categories: [hit.category],
            severity: hit.severity,
            reason: `Taqiqlangan kalit so'z aniqlandi: ${hit.label}`,
            keywordHit: { category: hit.category, label: hit.label },
        };
    }

    // 2) AI tekshiruvi (rasm+matn birga)
    if (!aiAvailable()) {
        // AI yo'q bo'lsa OK deb qaytaramiz (fail-open)
        return { verdict: "OK", categories: [], severity: 0, reason: "" };
    }

    const prompt = `Mahsulot nomi: ${input.title.slice(0, 200)}
Tavsifi: ${(input.description ?? "").slice(0, 1500) || "(tavsif yo'q)"}
${input.imageUrl ? "Rasmni ham tahlil qil: matn va rasm mos keladimi, taqiqlangan mahsulot emasmi." : "Rasm yo'q."}`;

    try {
        const out = await aiVisionJSON<Partial<ModResult>>(prompt, input.imageUrl || null, {
            system: BN_SYSTEM,
            temperature: 0,
        });
        if (!out || !out.verdict) return null;

        const verdict = (["OK", "REVIEW", "BLOCK"].includes(out.verdict as string)
            ? out.verdict
            : "OK") as ModVerdict;

        const severity = typeof out.severity === "number"
            ? Math.max(0, Math.min(1, out.severity))
            : (verdict === "BLOCK" ? 0.85 : verdict === "REVIEW" ? 0.5 : 0);

        return {
            verdict,
            categories: Array.isArray(out.categories) ? out.categories.slice(0, 6).map(String) : [],
            severity,
            reason: typeof out.reason === "string" ? out.reason.slice(0, 300) : "",
            keywordHit: null,
        };
    } catch {
        return null;
    }
}
