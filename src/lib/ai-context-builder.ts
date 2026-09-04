// Universal AI kontekst quruvchi.
// Profil + bilim bazasi + signallar + modul kontexti → yagona system prompt.
// Har chaqiruv fresh (foydalanuvchi so'nggi holati bilan).

import { prisma } from "@/lib/prisma";
import { listKnowledge, KNOWLEDGE_CATEGORIES } from "@/lib/user-knowledge";
import { getOrRefreshSignals } from "@/lib/user-signals";

const MODULE_CONTEXT: Record<string, string> = {
    belis:   "Belis — Fotiha va Beshik to'y marosimlariga sarpo qutilarini IJARAGA beruvchi studiya (belis.uz). Ega @sevinch. Ijara 2 kun default, max 3 kun. Zaklat + pasport nusxasi majburiy. Yetkazish: do'kondan olib ketish yoki Yandex.",
    bn:      "Bozor Narxida (BN) — Toshkent bozor va do'konlar marketplace (bozornarxida.uz). Hozir marketing faza. Referral: chaqirgan 10K, chaqirilgan 5K so'm.",
    nexus:   "Humo Nexus — For Humo ijtimoiy tarmog'i. Post/story/video/DM/live/kanal.",
    market:  "Humo Market — mahsulot va brendlar. Sotuvchi payout escrow 5% komissiya.",
    pay:     "For Pay (ALKH) — hamyon (UZS/USD). Deposit test rejim; withdraw manual. Belis to'lovlari escrow bilan.",
    id:      "Humo ID — asosiy identity (Google login). UZ+7 raqam Humo ID.",
    esport:  "Humo eSport — MLBB/PUBG/CS2 jamoalar va turnirlar. Elo reyting.",
    ai:      "Humo AI — Gemini asosidagi yordamchi. Barcha modul haqida yordam beradi.",
    support: "Humo Support — yordam markazi. Har ticket AI first-line bilan (Gemini) → keyin adminga eskalatsiya.",
};

export interface AiContextInput {
    profileId: string;
    moduleOrigin?: string;    // qaysi moduldan so'rov keldi (belis/support/...)
    includeKnowledge?: boolean;
    includeSignals?: boolean;
    verboseModules?: boolean; // barcha modul haqida qisqacha kontekst ham qo'shsin
    language?: "uz" | "ru" | "en";  // AI javob tili (default uz)
}

const LANG_INSTRUCTIONS: Record<"uz" | "ru" | "en", string> = {
    uz: `- **O'zbek** tilida javob ber.`,
    ru: `- Отвечай на **русском** языке (грамотный, вежливый).`,
    en: `- Reply in **English** (concise, polite, professional).`,
};

export interface AiSystemPrompt {
    system: string;
    // Debug uchun — nima ishlatilganini bilish (log qilinmaydi)
    tokensEstimate: number;
}

/**
 * Foydalanuvchi haqidagi barcha kontekstni yagona system prompt'ga jamlaydi.
 * AI Gemini uchun System instruction sifatida yuboriladi.
 */
export async function buildAiSystemPrompt(input: AiContextInput): Promise<AiSystemPrompt> {
    const parts: string[] = [];

    const lang = input.language ?? "uz";
    parts.push(`Sen — For Humo super-app'ning yagona AI yordamchisisan. Ismingiz "Humo AI".

MUHIM QOIDA:
- Faqat For Humo va shu foydalanuvchi mavzusida javob ber.
- Ma'lumotlarni faqat aniq bilsang tasdiqla; noaniq bo'lsa halolgina "aniq bilmayman" degin.
${LANG_INSTRUCTIONS[lang]}
- Emoji ishlatma. Lucide brandiga sodiq.
- Foydalanuvchi haqida ma'lumotlarni faqat unga foyda keltirish uchun ishlat.
- Boshqa foydalanuvchilar haqida hech qachon ma'lumot bermang (privacy).`);

    // 1. Profil ma'lumotlari
    try {
        const p = await prisma.userProfile.findUnique({
            where: { id: input.profileId },
            select: {
                name: true, username: true, humoId: true,
                bio: true, country: true, city: true, birthday: true,
                verified: true, verifiedCategory: true, level: true,
            },
        });
        if (p) {
            const profileBits: string[] = [];
            if (p.name) profileBits.push(`Ismi: ${p.name}`);
            if (p.username) profileBits.push(`@${p.username}`);
            if (p.humoId) profileBits.push(`Humo ID: ${p.humoId}`);
            if (p.bio) profileBits.push(`Bio: "${p.bio.slice(0, 200)}"`);
            if (p.city) profileBits.push(`Shahar: ${p.city}`);
            if (p.country) profileBits.push(`Davlat: ${p.country}`);
            if (p.birthday) profileBits.push(`Tug'ilgan sana: ${p.birthday.toISOString().slice(0, 10)}`);
            if (p.verified) profileBits.push(`Verified (${p.verifiedCategory ?? "tasdiqlangan"})`);
            if (profileBits.length) {
                parts.push("\nFOYDALANUVCHI PROFILI:\n" + profileBits.join("\n"));
            }
        }
    } catch { /* fail-safe */ }

    // 2. Bilim bazasi (foydalanuvchi haqidagi to'plangan faktlar)
    if (input.includeKnowledge !== false) {
        try {
            const facts = await listKnowledge(input.profileId);
            if (facts.length > 0) {
                const byCat = new Map<string, string[]>();
                for (const f of facts) {
                    if (f.sensitive && f.confidence < 0.8) continue; // sezgir + past ishonch — o'tkazamiz
                    const arr = byCat.get(f.category) ?? [];
                    arr.push(`${f.key}: ${f.value}${f.confidence < 0.7 ? " (aniqlashtirish kerak)" : ""}`);
                    byCat.set(f.category, arr);
                }
                if (byCat.size > 0) {
                    const kbLines: string[] = ["\nFOYDALANUVCHI HAQIDA MA'LUMOT (uning yaxshi tanish uchun):"];
                    for (const cat of KNOWLEDGE_CATEGORIES) {
                        const items = byCat.get(cat);
                        if (!items?.length) continue;
                        kbLines.push(`[${cat}] ${items.slice(0, 6).join("; ")}`);
                    }
                    parts.push(kbLines.join("\n"));
                }
            }
        } catch { /* fail-safe */ }
    }

    // 3. Signallar (cross-modul harakati)
    if (input.includeSignals !== false) {
        try {
            const sig = await getOrRefreshSignals(input.profileId);
            if (sig) {
                const sigBits: string[] = [];
                if (sig.nexusFollows > 0) sigBits.push(`${sig.nexusFollows} obuna (Nexus)`);
                if (sig.nexusVideosSeen > 0) sigBits.push(`${sig.nexusVideosSeen} video ko'rgan (30 kun)`);
                if (sig.marketOrders > 0) sigBits.push(`${sig.marketOrders} Market buyurtma`);
                if (sig.belisBookings > 0) sigBits.push(`${sig.belisBookings} Belis ijara`);
                if (sig.payTransfers > 0) sigBits.push(`${sig.payTransfers} pul o'tkazma (30 kun)`);
                if (sig.marketCategories.length > 0) sigBits.push(`sotib olayotgan kategoriyalar: ${sig.marketCategories.slice(0, 5).join(", ")}`);
                if (sig.bnCategoryClicks.length > 0) sigBits.push(`BN'da qidiradigan: ${sig.bnCategoryClicks.slice(0, 5).join(", ")}`);
                if (sig.topFollowedAuthors.length > 0) sigBits.push(`kuzatgan bloggerlar: @${sig.topFollowedAuthors.slice(0, 3).join(", @")}`);
                if (sigBits.length) {
                    parts.push("\nHARAKAT SIGNALLARI:\n" + sigBits.join("\n"));
                }
            }
        } catch { /* fail-safe */ }
    }

    // 4. Modul konteksti
    if (input.moduleOrigin && MODULE_CONTEXT[input.moduleOrigin]) {
        parts.push(`\nHOZIRGI MODUL (${input.moduleOrigin.toUpperCase()}):\n${MODULE_CONTEXT[input.moduleOrigin]}`);
    } else if (input.verboseModules) {
        const all = Object.entries(MODULE_CONTEXT)
            .map(([k, v]) => `[${k}] ${v}`)
            .join("\n");
        parts.push(`\nFOR HUMO MODULLARI:\n${all}`);
    }

    parts.push(`\nSUHBAT USLUBI:
- Xushmuomala va samimiy (o'zbekcha "siz" ishlatib).
- Qisqa (2-5 gap). Zarur bo'lganda ro'yxat.
- Foydalanuvchini o'z rejalari, oilasi va qadriyatlariga hurmat bilan qara.
- Sog'lig'i, pul-mol, oila kabi jiddiy mavzularda ehtiyot bo'l.`);

    const system = parts.join("\n");
    return {
        system,
        tokensEstimate: Math.ceil(system.length / 4),  // taxminiy
    };
}
