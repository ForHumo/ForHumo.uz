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

// ============ Gemini TTS (tabiiy o'zbek ovoz) — chat "Ovoz bilan o'qish" uchun ============
// gemini-3.8-flash-tts: tabiiy o'zbek talaffuzi (sinovdan o'tgan, founder tasdiqlagan).
// Eski Google Cloud Standard ovozi (yuqorida) robotga o'xshaydi — u faqat Telegram OGG uchun qoladi.
const GEMINI_TTS_MODEL = "gemini-3.8-flash-tts";
export const GEMINI_TTS_VOICES = ["Kore", "Puck"] as const;   // tabiiy o'zbek ovozlar
export type GeminiTtsVoice = typeof GEMINI_TTS_VOICES[number];

// Boshi/oxiriga qisqa fade — audio boshi/oxiridagi "pop/klik" (radio o'chgan ovozi)ni yo'qotadi.
// 16-bit signed LE PCM. Toq bayt bo'lsa kesamiz (aks holda oxirgi sample buziladi = shovqin).
function fadePcm(pcmIn: Buffer, rate: number, fadeMs = 18): Buffer {
    let pcm = pcmIn;
    if (pcm.length % 2 !== 0) pcm = pcm.subarray(0, pcm.length - 1);   // toq baytni kes
    const out = Buffer.from(pcm);                                       // nusxa (mutatsiya qilmaymiz)
    const total = Math.floor(out.length / 2);
    const fade = Math.min(Math.floor((rate * fadeMs) / 1000), Math.floor(total / 2));
    for (let i = 0; i < fade; i++) {
        const gain = i / fade;
        const inIdx = i * 2;
        out.writeInt16LE(Math.round(out.readInt16LE(inIdx) * gain), inIdx);          // fade-in
        const outIdx = (total - 1 - i) * 2;
        out.writeInt16LE(Math.round(out.readInt16LE(outIdx) * gain), outIdx);         // fade-out
    }
    return out;
}

function wavFromPcm(pcm: Buffer, rate = 24000, channels = 1, bits = 16): Buffer {
    const blockAlign = channels * bits / 8;
    const h = Buffer.alloc(44);
    h.write("RIFF", 0);
    h.writeUInt32LE(36 + pcm.length, 4);
    h.write("WAVE", 8);
    h.write("fmt ", 12);
    h.writeUInt32LE(16, 16);
    h.writeUInt16LE(1, 20);            // PCM
    h.writeUInt16LE(channels, 22);
    h.writeUInt32LE(rate, 24);
    h.writeUInt32LE(rate * blockAlign, 28);
    h.writeUInt16LE(blockAlign, 32);
    h.writeUInt16LE(bits, 34);
    h.write("data", 36);
    h.writeUInt32LE(pcm.length, 40);
    return Buffer.concat([h, pcm]);
}

/**
 * Gemini TTS — matnni tabiiy o'zbek ovozida WAV'ga aylantiradi.
 * @returns WAV Buffer yoki null (kalit yo'q / xato — chaqiruvchi brauzer TTS'ga tushadi).
 */
export async function synthesizeGeminiWav(text: string, voice: GeminiTtsVoice = "Kore"): Promise<Buffer | null> {
    if (!GEMINI_KEY) return null;
    const clean = text
        .replace(/```[\s\S]*?```/g, " (kod bloki) ")   // kod bloklarini o'qimaymiz
        .replace(/<[^>]*>/g, "")
        .replace(/https?:\/\/\S+/g, "")
        .replace(/[*_`#>|]/g, "")                        // markdown belgilarini olib tashlaymiz
        .replace(/\s+/g, " ")
        .trim()
        .slice(0, 1500);
    if (!clean) return null;
    const useVoice = (GEMINI_TTS_VOICES as readonly string[]).includes(voice) ? voice : "Kore";
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_TTS_MODEL}:generateContent?key=${GEMINI_KEY}`;
    try {
        const r = await fetch(url, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                contents: [{ parts: [{ text: clean }] }],
                generationConfig: {
                    responseModalities: ["AUDIO"],
                    speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: useVoice } } },
                },
            }),
        });
        if (!r.ok) return null;
        const data = await r.json();
        const parts: { inlineData?: { data?: string; mimeType?: string }; inline_data?: { data?: string; mime_type?: string } }[] =
            data?.candidates?.[0]?.content?.parts ?? [];
        for (const p of parts) {
            const inline = p.inlineData ?? p.inline_data;
            if (inline?.data) {
                const pcm = Buffer.from(inline.data, "base64");
                const mime = (inline as { mimeType?: string; mime_type?: string }).mimeType ?? (inline as { mime_type?: string }).mime_type ?? "";
                const rate = Number(mime.match(/rate=(\d+)/)?.[1] ?? 24000);
                return wavFromPcm(fadePcm(pcm, rate), rate);   // fade — oxiridagi "pop"ni yo'qotadi
            }
        }
        return null;
    } catch {
        return null;
    }
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
