// AI kontent moderatsiyasi — Gemini orqali (matn + ixtiyoriy rasm).
// Fail-open: AI o'chiq/xato → null qaytaradi, kontent bloklanmaydi.

import { aiAvailable, aiVisionJSON } from "@/lib/ai";

export type ModVerdict = "OK" | "REVIEW" | "BLOCK";

export interface ModResult {
    verdict: ModVerdict;
    categories: string[]; // scam, adult, hate, violence, illegal, spam, offtopic
    severity: number;     // 0..1
    reason: string;       // qisqa o'zbekcha sabab
}

export const AUTO_HIDE_SEVERITY = 0.8; // BLOCK + shu chegaradan yuqori → avto-yashirish

const SYSTEM = `Sen "ForHumo" super-app uchun kontent moderatorisan. Auditoriya: O'zbekiston.
Berilgan kontent (matn va/yoki rasm) zararli yoki qoidabuzar ekanligini baholaysan.

Toifalar:
- scam: firibgarlik, aldov, soxta sotuv, tashqi havola orqali pul talab qilish
- adult: voyaga yetmaganlar uchun nomaqbul, pornografik, jinsiy mazmun
- hate: nafrat, kamsitish, til/din/millat/jins asosida haqorat
- violence: zo'ravonlik, tahdid, terrorizm
- illegal: giyohvand modda, qurol, qalbaki hujjat, o'g'irlangan mol
- spam: takroriy reklama, ma'nosiz yoki aloqasiz havolalar
- offtopic: butunlay mavzudan tashqari (kamdan-kam BLOCK)

MUHIM: Oddiy diniy, madaniy yoki milliy kontentni (namoz, bayram, milliy taom, an'ana) ZARARLI deb belgilama.
Oddiy tanqid yoki shaxsiy fikr — haqorat emas. Shubha bo'lsa "REVIEW" ber, "BLOCK" emas.

verdict: "OK" (muammosiz) | "REVIEW" (shubhali, admin ko'rsin) | "BLOCK" (aniq qoidabuzar).
severity: 0.0 (zararsiz) dan 1.0 (o'ta jiddiy) gacha.

FAQAT JSON qaytar:
{"verdict":"OK|REVIEW|BLOCK","categories":["toifa"],"severity":0.0,"reason":"qisqa o'zbekcha sabab"}`;

export async function moderateContent(input: {
    kind: string;
    text?: string | null;
    imageUrl?: string | null;
}): Promise<ModResult | null> {
    if (!aiAvailable()) return null;

    const text = (input.text || "").slice(0, 4000).trim();
    // Tekshiradigan hech narsa yo'q
    if (!text && !input.imageUrl) return { verdict: "OK", categories: [], severity: 0, reason: "" };

    const prompt = `Kontent turi: ${input.kind}
Matn: """${text || "(matn yo'q)"}"""${input.imageUrl ? "\nRasm ham biriktirilgan — uni ham tahlil qil." : ""}`;

    try {
        const out = await aiVisionJSON<Partial<ModResult>>(prompt, input.imageUrl || null, {
            system: SYSTEM,
            temperature: 0,
        });
        if (!out || !out.verdict) return null;

        const verdict = (["OK", "REVIEW", "BLOCK"].includes(out.verdict as string)
            ? out.verdict
            : "OK") as ModVerdict;

        const severity = typeof out.severity === "number"
            ? Math.max(0, Math.min(1, out.severity))
            : (verdict === "BLOCK" ? 0.7 : verdict === "REVIEW" ? 0.4 : 0);

        return {
            verdict,
            categories: Array.isArray(out.categories) ? out.categories.slice(0, 6).map(String) : [],
            severity,
            reason: typeof out.reason === "string" ? out.reason.slice(0, 300) : "",
        };
    } catch {
        return null; // fail-open
    }
}
