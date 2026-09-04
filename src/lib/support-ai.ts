// C yondashuv — AI first-line support.
//
// Foydalanuvchi @support DM'ga yozganda avval Gemini AI javob berishga urinadi.
// Confidence past bo'lsa yoki user "human"/"admin"/"tirik odam" so'rasa
// → eskalatsiya (admin bell + qizil badge).
//
// Kontekst (RAG-lite): bir necha kalit modul haqida qisqacha ma'lumot promptga qo'shiladi.
// Rate limit: aiSupport kind (belisRate uslubi) — kuniga 20 AI javob/profil.

import { aiJSON, aiAvailable } from "@/lib/ai";
import { prisma } from "@/lib/prisma";

export const AI_MODEL_NAME = "gemini-2.5-flash-lite";
export const AI_MAX_MSGS_PER_TICKET = 3;                    // bitta ticket ichida AI 3 marta javob beradi, keyin eskalatsiya
export const AI_MIN_CONFIDENCE = 0.55;                       // undan past → eskalatsiya
export const AI_MAX_MSGS_PER_DAY = 20;                       // per-profile
export const AI_MSG_WINDOW_MS = 24 * 60 * 60 * 1000;

const MODULES = ["belis", "bn", "nexus", "market", "pay", "id", "esport", "ai", "support"] as const;
export type SupportModule = typeof MODULES[number];

// Modul haqida qisqa kontekst — RAG-lite (real ma'lumot bazasi o'rniga)
const MODULE_CONTEXT: Record<SupportModule, string> = {
    belis:   "Belis — Fotiha va Beshik to'y marosimlariga sarpo qutilarini IJARAGA beruvchi studiya. Ega @sevinch. belis.uz. Ijara 2 kun default, max 3 kun. Zaklat + pasport nusxasi majburiy. Yetkazish: PICKUP / YANDEX_CUSTOMER / YANDEX_BELIS.",
    bn:      "Bozor Narxida (BN) — Toshkent bozorlaridan mahsulot va do'kon marketplace. bozornarxida.uz. Hozir MARKETING FAZA — sotuvchi register waitlist orqali. Sotuvchi wait'da bo'lsa mahsulot sotmaydi. Referral: chaqirgan 10K, chaqirilgan 5K so'm.",
    nexus:   "Nexus — For Humo ijtimoiy tarmog'i. Post/story/video/DM/live/kanal. Verified badge founder va tekshirilganlarga. DM'da rate limit bor.",
    market:  "Humo Market — mahsulot va brendlar savdosi. Sotuvchi payout escrow 5% komissiya. To'lov Zij (test).",
    pay:     "For Pay — ALKH wallet. UZS/USD. Deposit hozir TEST rejim (real Payme/Click MChJ ochilishini kutmoqda). Withdraw so'rovi manual.",
    id:      "Humo ID — asosiy identity (Google login). Username o'zgartirish 14 kunda 1 marta. Humo ID formati UZxxxxxxx.",
    esport:  "Humo eSport — MLBB/PUBG/CS2 jamoalar va turnirlar. Elo reyting. Steam OpenID identity link (login emas).",
    ai:      "Humo AI — Gemini asosidagi yordamchi. iframe orqali /ai da ochiladi.",
    support: "Bu yordam markazi. Har savolga javob berishga urinamiz.",
};

// Foydalanuvchi eskalatsiya so'rov ibora'lari
const ESCALATE_KEYWORDS = [
    "human", "odam", "operator", "tirik", "admin", "menejer", "yordam bering",
    "sizni odam", "aq odam", "gapirmoq", "ai emas", "bot emas", "muallif",
    "sinovsiz", "chin", "aslida",
];

interface AiSupportInput {
    userText: string;
    priorMessages?: Array<{ role: "user" | "ai" | "admin"; body: string }>;
    userLocale?: "uz" | "ru" | "en";
    userName?: string | null;
}

interface AiSupportReply {
    reply: string;                 // AI matn (uz)
    confidence: number;            // 0..1
    module: SupportModule | null;  // aniqlangan modul
    escalate: boolean;             // eskalatsiya tavsiya
    reason?: string;               // nima uchun escalate
}

/** User so'rovida eskalatsiya iborasi bormi? */
export function userRequestedHuman(text: string): boolean {
    const low = text.toLowerCase();
    return ESCALATE_KEYWORDS.some(k => low.includes(k));
}

/** AI javob generatsiyasi (fail-safe — null qaytsa kutish rejimi). */
export async function generateSupportAiReply(input: AiSupportInput): Promise<AiSupportReply | null> {
    if (!aiAvailable()) return null;
    const context = MODULES.map(m => `[${m}] ${MODULE_CONTEXT[m]}`).join("\n");
    const history = (input.priorMessages ?? []).slice(-6)
        .map(m => `${m.role === "user" ? "Mijoz" : m.role === "ai" ? "AI" : "Admin"}: ${m.body}`)
        .join("\n");

    const prompt = `Sen "Humo Support" AI yordamchisi — For Humo super-app foydalanuvchilariga birinchi qatorda javob berasan.

FOR HUMO MODULLARI (kontekst):
${context}

QOIDALAR:
1. Faqat SHU modullar haqida javob ber. Boshqa mavzu bo'lsa ("dunyoda nima gap", "hazillash") — muloyim rad et va "Support faqat For Humo bo'yicha yordam beradi" degin, escalate=false.
2. Xushmuomala, qisqa (2-4 gap). Emoji ishlatma. Faqat Lucide brandiga sodiq.
3. Aniq javobing bo'lmasa — halolgina "Buni admin tekshiradi" degin, escalate=true, confidence past.
4. Foydalanuvchi "odam bilan gaplashaman/human/operator" so'rasa — escalate=true, confidence 0.
5. Modulni aniqla (bn/nexus/market/pay/belis/id/esport/ai/support/null bo'lishi mumkin).
6. Uzbek tilida javob ber (foydalanuvchi ${input.userLocale ?? "uz"} tilida so'ragan bo'lsa ham hozircha uzbek).
7. To'lov, refund, banned hisob, xavfsizlik kabi jiddiy masalalarga o'zing javob berma — escalate=true.

${input.userName ? `Mijoz ismi: ${input.userName}` : ""}
${history ? `Oldingi suhbat:\n${history}\n` : ""}
Mijozning yangi xabari: "${input.userText}"

JSON qaytar:
{
  "reply": "2-4 gap javob (uz)",
  "confidence": 0.0..1.0,
  "module": "bn|nexus|market|pay|belis|id|esport|ai|support|null",
  "escalate": boolean,
  "reason": "user_requested|ai_low_confidence|out_of_scope|sensitive|null"
}`;

    try {
        const result = await aiJSON<AiSupportReply>(prompt, { temperature: 0.4 });
        if (!result || !result.reply) return null;
        return {
            reply: result.reply.trim().slice(0, 1000),
            confidence: Math.max(0, Math.min(1, Number(result.confidence) || 0)),
            module: MODULES.includes(result.module as SupportModule) ? (result.module as SupportModule) : null,
            escalate: !!result.escalate || (Number(result.confidence) || 0) < AI_MIN_CONFIDENCE,
            reason: result.reason ? result.reason.slice(0, 60) : undefined,
        };
    } catch {
        return null;
    }
}

/** Kunlik AI javob soni cheklovi (kuniga 20 per profile). */
export async function aiSupportRateLimited(profileId: string): Promise<boolean> {
    const since = new Date(Date.now() - AI_MSG_WINDOW_MS);
    try {
        const used = await prisma.aiUsage.count({
            where: { profileId, kind: "support-ai", createdAt: { gt: since } },
        });
        return used >= AI_MAX_MSGS_PER_DAY;
    } catch {
        return false; // fail-open
    }
}

/** AI javob berildi — logga yozib qo'yamiz (rate limit va analitika uchun). */
export async function logAiSupport(profileId: string): Promise<void> {
    try {
        await prisma.aiUsage.create({ data: { profileId, kind: "support-ai" } });
    } catch {}
}

/** Ticketda AI necha marta javob berdi. */
export async function aiRepliesCount(ticketId: string): Promise<number> {
    try {
        return await prisma.supportMessage.count({
            where: { ticketId, authorRole: "AI" },
        });
    } catch {
        return 0;
    }
}
