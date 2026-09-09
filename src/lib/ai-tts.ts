// Text-to-Speech — Google Cloud TTS REST API (GEMINI_API_KEY ishlatiladi, agar
// TTS API loyihada yoqilgan bo'lsa). Aks holda null qaytadi (fail-safe).
//
// Chiqish: OGG/OPUS buffer (Telegram sendVoice uchun tayyor).

const GEMINI_KEY = process.env.GEMINI_API_KEY;
const TTS_KEY = process.env.GOOGLE_TTS_KEY ?? GEMINI_KEY;   // Alohida kalit yo'q bo'lsa GEMINI_API_KEY

const VOICE_UZ = { languageCode: "uz-UZ", name: "uz-UZ-Standard-A" };
const VOICE_RU = { languageCode: "ru-RU", name: "ru-RU-Standard-A" };
const VOICE_EN = { languageCode: "en-US", name: "en-US-Standard-C" };

export function ttsAvailable(): boolean {
    return !!TTS_KEY;
}

/**
 * Matnni ovozga aylantiradi. Til bo'yicha ovoz tanlanadi.
 * @returns Buffer (OGG/OPUS) yoki null (kalit yo'q / xato).
 */
export async function synthesizeToOgg(
    text: string,
    lang: "uz" | "ru" | "en",
): Promise<Buffer | null> {
    if (!TTS_KEY) return null;
    if (!text || text.length === 0) return null;
    const clean = text
        .replace(/<[^>]*>/g, "")   // HTML teglarni olib tashlaymiz
        .replace(/https?:\/\/\S+/g, "")   // URL'larni ham (ovozda o'qilmasin)
        .trim()
        .slice(0, 900);   // Google TTS <5000 chars, xavfsiz 900
    if (!clean) return null;

    const voice = lang === "ru" ? VOICE_RU : lang === "en" ? VOICE_EN : VOICE_UZ;
    const url = `https://texttospeech.googleapis.com/v1/text:synthesize?key=${TTS_KEY}`;
    const body = {
        input: { text: clean },
        voice,
        audioConfig: { audioEncoding: "OGG_OPUS", speakingRate: 1.0 },
    };
    try {
        const r = await fetch(url, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(body),
        });
        if (!r.ok) {
            // 403 (API o'chiq) yoki 401 (kalit noto'g'ri) — silent skip
            return null;
        }
        const j = await r.json() as { audioContent?: string };
        if (!j.audioContent) return null;
        return Buffer.from(j.audioContent, "base64");
    } catch {
        return null;
    }
}
