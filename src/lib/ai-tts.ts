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
// Tabiiy o'zbek ovozlar (chat TTS default = Kore) + Humo Live ovozlari (Orus=Umid, Zephyr=Dilnoza) preview uchun.
export const GEMINI_TTS_VOICES = ["Kore", "Puck", "Orus", "Zephyr", "Charon", "Aoede", "Leda"] as const;
export type GeminiTtsVoice = typeof GEMINI_TTS_VOICES[number];

// Boshi/oxiriga qisqa fade — audio boshi/oxiridagi "pop/klik" (radio o'chgan ovozi)ni yo'qotadi.
// 16-bit signed LE PCM. Toq bayt bo'lsa kesamiz (aks holda oxirgi sample buziladi = shovqin).
function fadePcm(pcmIn: Buffer, rate: number, fadeMs = 35): Buffer {
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

// Matnning ustun tilini aniqlaydi (kirill = rus, lotin = o'zbek/ingliz).
// gemini-3.8-flash-tts style-prompt'ni O'QIB YUBORADI (uslub sifatida qabul qilmaydi) —
// shuning uchun aksentni prompt bilan boshqarib bo'lmaydi. Buning o'rniga: model o'zbek RAQAMLARINI
// (1,2,3) rus tilida o'qiydi (один/два), lekin o'zbek SO'ZLARINI to'g'ri o'qiydi. Yechim —
// o'zbekcha matnda raqamlarni oldindan so'zga aylantiramiz. Rus/ingliz matnda raqamlar model
// tomonidan tabiiy (grammatik to'g'ri) o'qiladi — tegmaymiz.
function detectTtsLang(text: string): "uz" | "ru" | "en" {
    const cyr = (text.match(/[а-яё]/gi) || []).length;
    const lat = (text.match(/[a-z]/gi) || []).length;
    if (cyr > lat) return "ru";                          // ustun kirill → rus
    // Lotin — o'zbek yoki ingliz. O'zbek belgilarini qidiramiz (o'/g' + keng tarqalgan so'zlar).
    if (/[oʻg]['ʻʼ']/i.test(text) || /\b(va|bilan|uchun|ham|yoki|emas|kerak|qil|deb|shu|bu|men|siz|biz|ning|lar|dan|ga|ni)\b/i.test(text)) return "uz";
    // Lotin, o'zbek belgisi yo'q — ingliz bo'lishi mumkin (aniq inglizcha so'zlar bo'lsa)
    if (/\b(the|and|is|are|you|this|of|to|in|for|with|that|have|will)\b/i.test(text)) return "en";
    return "uz";                                          // default — auditoriyamiz o'zbek
}

// ---- O'zbekcha raqam → so'z (0 dan 999 milliardgacha) ----
const UZ_ONES = ["nol", "bir", "ikki", "uch", "to'rt", "besh", "olti", "yetti", "sakkiz", "to'qqiz"];
const UZ_TENS = ["", "o'n", "yigirma", "o'ttiz", "qirq", "ellik", "oltmish", "yetmish", "sakson", "to'qson"];
function uzUnder1000(n: number): string {
    const parts: string[] = [];
    const h = Math.floor(n / 100), t = Math.floor((n % 100) / 10), o = n % 10;
    if (h) parts.push(h === 1 ? "yuz" : UZ_ONES[h] + " yuz");   // 100 = "yuz", 200 = "ikki yuz"
    if (t) parts.push(UZ_TENS[t]);
    if (o) parts.push(UZ_ONES[o]);
    return parts.join(" ");
}
function uzInt(n: number): string {
    if (n === 0) return "nol";
    const scales: [number, string][] = [[1e9, "milliard"], [1e6, "million"], [1e3, "ming"]];
    const parts: string[] = [];
    let rem = n;
    for (const [val, name] of scales) {
        if (rem >= val) {
            const cnt = Math.floor(rem / val);
            rem = rem % val;
            parts.push(name === "ming" && cnt === 1 ? "ming" : uzUnder1000(cnt) + " " + name);  // 1000 = "ming"
        }
    }
    if (rem > 0) parts.push(uzUnder1000(rem));
    return parts.join(" ").replace(/\s+/g, " ").trim();
}
// Matndagi raqamlarni o'zbekcha so'zga aylantiradi (faqat o'zbekcha matn uchun chaqiriladi).
function spellUzNumbers(text: string): string {
    // 1. Minglik ajratgichlarni yig'amiz: "45 000" / "45,000" → "45000" (faqat 3 xonali guruh oldidan)
    let t = text.replace(/(\d)[  ,](?=\d{3}(?:\D|$))/g, "$1");
    t = t.replace(/(\d)[  ,](?=\d{3}(?:\D|$))/g, "$1");           // zanjirli guruhlar (masalan 1 234 567)
    // 2. Kasrlar: "3.5" / "3,5" → "uch nuqta besh"
    t = t.replace(/(\d+)[.,](\d+)/g, (_, a: string, b: string) =>
        `${uzInt(Number(a))} nuqta ${[...b].map(d => UZ_ONES[Number(d)]).join(" ")}`);
    // 3. Qolgan butun sonlar (12 xonagacha; undan kattasini raqamligicha qoldiramiz)
    t = t.replace(/\d+/g, m => (m.length <= 12 ? uzInt(Number(m)) : m));
    return t;
}

/**
 * Gemini TTS — matnni tabiiy ovozda WAV'ga aylantiradi.
 * O'zbekcha matnda raqamlar so'zga aylantiriladi (aks holda model ularni rus tilida o'qiydi).
 * @returns WAV Buffer yoki null (kalit yo'q / xato — chaqiruvchi brauzer TTS'ga tushadi).
 */
export async function synthesizeGeminiWav(text: string, voice: GeminiTtsVoice = "Kore"): Promise<Buffer | null> {
    if (!GEMINI_KEY) return null;
    let clean = text
        .replace(/```[\s\S]*?```/g, " (kod bloki) ")   // kod bloklarini o'qimaymiz
        .replace(/<[^>]*>/g, "")
        .replace(/https?:\/\/\S+/g, "")
        .replace(/[*_`#>|]/g, "")                        // markdown belgilarini olib tashlaymiz
        .replace(/\s+/g, " ")
        .trim()
        .slice(0, 1500);
    if (!clean) return null;
    // O'zbekcha bo'lsa — raqamlarni so'zga aylantiramiz (один/два bug'ini yo'qotadi)
    if (detectTtsLang(clean) === "uz") clean = spellUzNumbers(clean);
    const useVoice = (GEMINI_TTS_VOICES as readonly string[]).includes(voice) ? voice : "Kore";
    const speakText = clean;
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_TTS_MODEL}:generateContent?key=${GEMINI_KEY}`;
    try {
        const r = await fetch(url, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                contents: [{ parts: [{ text: speakText }] }],
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
