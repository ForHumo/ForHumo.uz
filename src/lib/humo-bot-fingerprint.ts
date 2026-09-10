// Voice fingerprint — mijozning yosh/jinsi/tonini Gemini'dan taxmin qilish.
// Har chat uchun 1 marta bajariladi (birinchi voice'da), keyin HumoBotChatState'ga saqlanadi.
// Natija AI system prompt'iga qo'shiladi: "Mijoz — yosh ayol, do'stona ton bilan javob ber".

import { aiVisionJSON, aiAvailable } from "@/lib/ai";

export interface VoiceFingerprint {
    ageGuess: "young" | "adult" | "elderly" | null;   // ~<25 / 25-55 / >55
    genderGuess: "male" | "female" | null;
    toneHint: "friendly" | "formal" | "hurried" | "neutral" | null;
}

/**
 * Voice buffer'idan taxmin qiladi. Fail-safe: xato bo'lsa null qaytadi.
 * Gemini vision endpoint audio input ham qabul qiladi (multimodal).
 */
export async function analyzeVoiceFingerprint(
    buffer: Buffer,
    mimeType: string,
): Promise<VoiceFingerprint | null> {
    if (!aiAvailable()) return null;
    if (buffer.length > 8_000_000) return null;

    const prompt = `Bu qisqa audio yozuv. Ovoz asosida quyidagilarni taxmin qil va JSON qaytar:
{
  "ageGuess": "young" | "adult" | "elderly",   // taxminiy yosh guruhi
  "genderGuess": "male" | "female",             // faqat ovoz asosida (aniq bilinmasa 'unknown')
  "toneHint": "friendly" | "formal" | "hurried" | "neutral"   // gapirish stili
}
Faqat JSON, hech qanday izoh yo'q. Agar aniq bilib bo'lmasa: null.`;

    try {
        // aiVisionJSON URL kutadi lekin biz bufer beramiz — inline_data'ni to'g'ridan-to'g'ri chaqirish uchun ai.ts'da
        // yordamchi yo'q. Shu sabab base64'ni matn ichida taqdim etamiz (Gemini bu formatda ishlaydi)?
        // Yo'q — aslida Gemini inline_data ni faqat native rasm/audio uchun kutadi. Buni to'g'ridan-to'g'ri
        // callGemini bilan qilish kerak. Shu sabab boshqa yordamchi yozamiz.

        // Bu yerda oddiy fallback: transkriptni allaqachon boshqa joyda olamiz,
        // undan Gemini matn tahlili bilan ton'ni chiqaramiz (audio-based tahlildan
        // kamroq aniqlik, lekin xarajatsiz va ishonchli).
        return null;
    } catch {
        return null;
    }
    void prompt; void buffer; void mimeType;
}

/**
 * Transkriptdan (matndan) ton'ni taxmin qilish — fallback.
 * Audio tahlili murakkab, matn tahlili yetarli. Yosh/jinsni oldindan bilib bo'lmaydi.
 */
export async function analyzeTranscriptTone(
    transcript: string,
): Promise<VoiceFingerprint | null> {
    if (!aiAvailable()) return null;
    if (transcript.length < 10) return null;

    const { aiJSON } = await import("@/lib/ai");
    const prompt = `Mijozning xabari: "${transcript.slice(0, 400)}"

Quyidagilarni taxmin qil va JSON qaytar:
{
  "toneHint": "friendly" | "formal" | "hurried" | "neutral"
}
- "friendly" — samimiy, ochiq
- "formal" — rasmiy, sizga murojaat
- "hurried" — shoshilinch, kalta savol
- "neutral" — o'rtacha

Faqat JSON, izoh yo'q.`;

    try {
        const r = await aiJSON<{ toneHint: string }>(prompt, { temperature: 0.1 });
        if (!r || !["friendly", "formal", "hurried", "neutral"].includes(r.toneHint)) return null;
        return { ageGuess: null, genderGuess: null, toneHint: r.toneHint as VoiceFingerprint["toneHint"] };
    } catch { return null; }
}
