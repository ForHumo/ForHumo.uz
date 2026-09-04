// Foydalanuvchi bilim bazasi — For Humo unga o'z ekotizimini yaxshi tatbiq
// etsin uchun. Har fakt shifrlangan (AES-256-GCM purpose="knowledge") —
// DB dump'da o'qib bo'lmaydi. Admin ham ko'ra olmaydi.
//
// Manba (source) foydalanuvchi uchun transparency:
//   "user"       — foydalanuvchi qo'lda kiritdi (verified)
//   "onboarding" — profil to'ldirish paytida
//   "ai_extract" — AI suhbat DM'lardan xulosa qildi (confidence 0.6-0.8)
//   "signal:X"   — cross-modul harakatlardan (masalan "signal:market" —
//                  ko'p sotib olingan kategoriya) (confidence 0.4-0.6)

import { prisma } from "@/lib/prisma";
import { encryptPII, decryptPII } from "@/lib/crypto";
import { aiJSON, aiAvailable } from "@/lib/ai";

export const KNOWLEDGE_CATEGORIES = [
    "identity",   // ism, kim ekanligi, kelib chiqishi
    "family",     // uylanganmi, farzandlar, ota-ona
    "work",       // ish joyi, kasb, ta'lim
    "interests",  // hobbi, sport, san'at, o'yin
    "lifestyle",  // sog'liq, sport, ovqat, uyqu
    "goals",      // rejalari, ertangi kun, uzoq maqsad
    "contacts",   // do'stlar, aloqadagi odamlar
    "assets",     // uy, mashina, boshqa mulk
    "habits",     // odatlar, kunlik ish
    "other",
] as const;

export type KnowledgeCategory = typeof KNOWLEDGE_CATEGORIES[number];

export interface KnowledgeFact {
    id: string;
    category: KnowledgeCategory;
    key: string;
    value: string;
    source: string;
    confidence: number;
    sensitive: boolean;
    verifiedByUser: boolean;
    createdAt: Date;
    updatedAt: Date;
}

/** Bir fakt yozadi/yangilaydi (idempotent — [profileId, category, key] unique). */
export async function upsertKnowledge(input: {
    profileId: string;
    category: KnowledgeCategory;
    key: string;
    value: string;
    source: string;
    confidence?: number;
    sensitive?: boolean;
    verifiedByUser?: boolean;
}): Promise<KnowledgeFact | null> {
    if (!input.value?.trim()) return null;
    const { encrypted, iv } = encryptPII(input.value.trim().slice(0, 2000), "knowledge");
    try {
        const row = await prisma.userKnowledge.upsert({
            where: {
                profileId_category_key: {
                    profileId: input.profileId,
                    category: input.category,
                    key: input.key,
                },
            },
            create: {
                profileId: input.profileId,
                category: input.category,
                key: input.key,
                valueEnc: encrypted,
                valueIv: iv,
                source: input.source,
                confidence: input.confidence ?? 1.0,
                sensitive: input.sensitive ?? false,
                verifiedByUser: input.verifiedByUser ?? false,
            },
            update: {
                valueEnc: encrypted,
                valueIv: iv,
                source: input.source,
                confidence: input.confidence ?? 1.0,
                sensitive: input.sensitive ?? undefined,
                verifiedByUser: input.verifiedByUser ?? undefined,
            },
        });
        return decodeRow(row);
    } catch (e) {
        console.error("upsertKnowledge failed:", e);
        return null;
    }
}

/** Foydalanuvchi barcha bilim bazasi (categoriyalar bo'yicha guruh). */
export async function listKnowledge(profileId: string): Promise<KnowledgeFact[]> {
    const rows = await prisma.userKnowledge.findMany({
        where: { profileId },
        orderBy: { updatedAt: "desc" },
        take: 500,
    });
    return rows.map(decodeRow).filter(Boolean) as KnowledgeFact[];
}

/** O'chirish — foydalanuvchi bir faktni o'chirsin (audit yo'q, tozalikcha o'chadi). */
export async function deleteKnowledge(profileId: string, id: string): Promise<boolean> {
    try {
        const r = await prisma.userKnowledge.deleteMany({
            where: { id, profileId },
        });
        return r.count > 0;
    } catch {
        return false;
    }
}

/** Butun bilim bazasini o'chirish (GDPR right to erasure — foydalanuvchi so'roviga ko'ra). */
export async function eraseAllKnowledge(profileId: string): Promise<number> {
    try {
        const r = await prisma.userKnowledge.deleteMany({ where: { profileId } });
        return r.count;
    } catch {
        return 0;
    }
}

// ── Kritik PII/spam filterlar ────────────────────────────────────────────
// Gemini prompt'da qoida yozgan bo'lsak ham, ba'zan chetlab o'tishi mumkin.
// Bu yerda deterministik ikkinchi qatlam.

/** 12-19 raqamli davomiy sonlar (karta, IBAN, IMEI, hisob) — hech qachon KB'ga tushmasin. */
export function looksLikeCriticalPii(value: string): boolean {
    const digits = value.replace(/\D/g, "");
    if (digits.length >= 12 && digits.length <= 19) return true;
    // Yashirin parol/kalit belgilari
    if (/pass(word)?[:=]|api[_-]?key|secret|token/i.test(value)) return true;
    // Email formatida bo'lgan qiymatlar (aniq foydalanuvchi email'ini KB'ga yozmaymiz — login orqali bilamiz)
    if (/^[\w.+-]+@[\w-]+\.[a-z]{2,}$/i.test(value.trim())) return true;
    return false;
}

/** Bo'sh yoki takroriy belgi, faqat emoji/simvol yoki juda qisqa (< 2 harf) — spam. */
export function isSpamOrGibberish(value: string): boolean {
    const trimmed = value.trim();
    if (trimmed.length < 2) return true;
    // Faqat bir harf takrori ("aaaaa" yoki "!!!!!")
    if (/^(.)\1{4,}$/.test(trimmed)) return true;
    // 80%+ non-alfa (juda ko'p simvol/emoji)
    const alpha = (trimmed.match(/[\p{L}\p{N}]/gu) || []).length;
    if (alpha / trimmed.length < 0.3) return true;
    return false;
}

/** Deshifrlangan qatorni o'qish (fail-safe). */
function decodeRow(row: {
    id: string; category: string; key: string; valueEnc: string; valueIv: string;
    source: string; confidence: number; sensitive: boolean; verifiedByUser: boolean;
    createdAt: Date; updatedAt: Date;
}): KnowledgeFact | null {
    const value = decryptPII(row.valueEnc, row.valueIv, "knowledge");
    if (!value) return null;
    return {
        id: row.id,
        category: row.category as KnowledgeCategory,
        key: row.key,
        value,
        source: row.source,
        confidence: row.confidence,
        sensitive: row.sensitive,
        verifiedByUser: row.verifiedByUser,
        createdAt: row.createdAt,
        updatedAt: row.updatedAt,
    };
}

/**
 * Foydalanuvchi xabari asosida yangi bilim topib yozadi (Gemini asosli).
 * Fail-safe: AI ishlamasa hech nima qilmaydi.
 * Yangi faktlar confidence <= 0.8 bilan (foydalanuvchi keyin tasdiqlashi mumkin).
 */
export async function extractKnowledgeFromMessage(input: {
    profileId: string;
    userMessage: string;
    aiReply?: string;
    conversationContext?: string;
}): Promise<{ extracted: number }> {
    if (!aiAvailable()) return { extracted: 0 };

    const prompt = `Sen foydalanuvchi haqida faktlar chiqarish bo'yicha uskunasan. Faqat foydalanuvchi O'ZI aytgan yoki tasdiqlagan aniq faktlarni ol.

QOIDA (kritik):
- Faqat foydalanuvchi haqida bo'lgan aniq faktlar. Boshqa odamlar haqida emas.
- Fakt aniq bo'lmasa — SKIP.
- **HAQORAT/SPAM/SIYOSIY EKSTREMIZM/CHAQIRIQ** — SKIP (facts=[]).
- **PII kritik ma'lumot** (pasport raqami, karta raqami, parol, IP, IMEI) — SKIP.
- **Yolg'on ekanligi ochiq** ("Men prezidentman", "Men Bill Gatesman") — SKIP.
- **Boshqa foydalanuvchini yomonlash** yoki uni "aniqlash" ("filan qari kishi") — SKIP.
- Sezgir mavzular (sog'liq, jinsiy hayot, siyosat, din) — sensitive=true (skip qilma, lekin belgila).
- Har fakt {category, key, value, confidence, sensitive}
- Kategoriyalar: identity, family, work, interests, lifestyle, goals, contacts, assets, habits, other

MISOL:
Xabar: "Men Toshkentda yashayman, IT sohasida ishlayman va sayr qilishni yaxshi ko'raman"
Chiqadi: [
  {category:"identity", key:"city", value:"Toshkent", confidence:0.95, sensitive:false},
  {category:"work", key:"industry", value:"IT", confidence:0.9, sensitive:false},
  {category:"interests", key:"activity", value:"sayr qilish", confidence:0.85, sensitive:false}
]

Xabar: "Bugun charchadim"
Chiqadi: []   (uzoq muddat bilim emas)

Xabar: "Karta raqamim 8600 1234 5678 9012"
Chiqadi: []   (kritik PII — hech qachon saqlanmasin)

Xabar: "Men Toshkent hokimiman"
Chiqadi: []   (yolg'on — tekshirilmagan)

${input.conversationContext ? `Suhbat konteksti:\n${input.conversationContext.slice(-500)}\n` : ""}
Foydalanuvchi xabari: "${input.userMessage.slice(0, 1000)}"
${input.aiReply ? `AI javob: "${input.aiReply.slice(0, 300)}"` : ""}

JSON qaytar:
{ "facts": [{ "category": "...", "key": "...", "value": "...", "confidence": 0.0..1.0, "sensitive": boolean }] }
Faktlar bo'lmasa: { "facts": [] }`;

    try {
        const result = await aiJSON<{ facts: Array<{
            category: string; key: string; value: string;
            confidence: number; sensitive: boolean;
        }> }>(prompt, { temperature: 0.2 });
        if (!result || !Array.isArray(result.facts)) return { extracted: 0 };

        let count = 0;
        for (const f of result.facts) {
            if (!f.category || !f.key || !f.value) continue;
            if (!KNOWLEDGE_CATEGORIES.includes(f.category as KnowledgeCategory)) continue;
            const conf = Math.max(0, Math.min(1, Number(f.confidence) || 0));
            if (conf < 0.5) continue;  // past ishonch — o'tkazib yuboramiz

            // Belgilar filter: aniq kritik PII yoki spam — jim rad etamiz
            if (looksLikeCriticalPii(f.value)) continue;
            if (isSpamOrGibberish(f.value)) continue;

            await upsertKnowledge({
                profileId: input.profileId,
                category: f.category as KnowledgeCategory,
                key: f.key.slice(0, 60).replace(/\s+/g, "_").toLowerCase(),
                value: f.value.slice(0, 500),
                source: "ai_extract",
                confidence: Math.min(0.8, conf),  // AI extractlar 0.8 dan yuqori bo'lmasin
                sensitive: !!f.sensitive,
            });
            count++;
        }
        return { extracted: count };
    } catch (e) {
        console.error("extractKnowledgeFromMessage failed:", e);
        return { extracted: 0 };
    }
}
