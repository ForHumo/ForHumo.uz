// Gemini (Google Generative AI) — REST orqali (SDK shart emas, serverless'da ishlaydi)
// Kalit: GEMINI_API_KEY (Google AI Studio'dan bepul). Model: GEMINI_MODEL (default gemini-2.0-flash)

const GEMINI_KEY = process.env.GEMINI_API_KEY;
const GEMINI_MODEL = process.env.GEMINI_MODEL || "gemini-2.5-flash-lite";

export function aiAvailable() { return !!GEMINI_KEY; }

type Part = { text: string } | { inline_data: { mime_type: string; data: string } };

interface GenOpts { system?: string; json?: boolean; temperature?: number }

type Content = { role?: "user" | "model"; parts: Part[] };

async function callGemini(contents: Content[], opts: GenOpts = {}): Promise<string> {
    if (!GEMINI_KEY) throw new Error("AI_NO_KEY");
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${GEMINI_KEY}`;
    const body: Record<string, unknown> = {
        contents,
        generationConfig: {
            temperature: opts.temperature ?? 0.7,
            ...(opts.json ? { responseMimeType: "application/json" } : {}),
        },
    };
    if (opts.system) body.systemInstruction = { parts: [{ text: opts.system }] };

    // 503/429 (vaqtinchalik yuklama) — qisqa kutib qayta urinish
    let lastErr = "AI_ERR";
    for (let attempt = 0; attempt < 3; attempt++) {
        const res = await fetch(url, {
            method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body),
        });
        if (res.ok) {
            const data = await res.json();
            return data?.candidates?.[0]?.content?.parts?.[0]?.text ?? "";
        }
        lastErr = `AI_ERR ${res.status}`;
        if (res.status === 503 || res.status === 429) {
            await new Promise(r => setTimeout(r, 700 * (attempt + 1)));
            continue;
        }
        const t = await res.text().catch(() => "");
        throw new Error(`AI_ERR ${res.status}: ${t.slice(0, 300)}`);
    }
    throw new Error(`${lastErr} — model band, birozdan keyin urinib ko'ring`);
}

async function generate(parts: Part[], opts: GenOpts = {}): Promise<string> {
    return callGemini([{ parts }], opts);
}

export async function aiText(prompt: string, opts: GenOpts = {}): Promise<string> {
    return generate([{ text: prompt }], opts);
}

// Ko'p-turli suhbat (chat) + JSON javob
export interface ChatMsg { role: "user" | "model"; text: string }
export async function aiChatJSON<T>(messages: ChatMsg[], opts: GenOpts = {}): Promise<T | null> {
    const contents: Content[] = messages.map(m => ({ role: m.role, parts: [{ text: m.text }] }));
    const txt = await callGemini(contents, { ...opts, json: true });
    return parseJson<T>(txt);
}

function parseJson<T>(txt: string): T | null {
    try { return JSON.parse(txt) as T; } catch { /* try extract */ }
    const m = txt.match(/\{[\s\S]*\}|\[[\s\S]*\]/);
    if (m) { try { return JSON.parse(m[0]) as T; } catch { /* noop */ } }
    return null;
}

export async function aiJSON<T>(prompt: string, opts: GenOpts = {}): Promise<T | null> {
    const txt = await generate([{ text: prompt }], { ...opts, json: true });
    return parseJson<T>(txt);
}

// Rasmni URL'dan olib, Gemini inline formatiga (base64) o'tkazadi
export async function fetchImageInline(url: string): Promise<{ mime_type: string; data: string } | null> {
    try {
        const r = await fetch(url);
        if (!r.ok) return null;
        const mime = r.headers.get("content-type") || "image/jpeg";
        if (!mime.startsWith("image/")) return null;
        const buf = Buffer.from(await r.arrayBuffer());
        if (buf.length > 4_000_000) return null; // juda katta rasmni o'tkazib yuboramiz
        return { mime_type: mime, data: buf.toString("base64") };
    } catch { return null; }
}

// Vision + JSON: rasm (ixtiyoriy) + matn → JSON
export async function aiVisionJSON<T>(prompt: string, imageUrl: string | null, opts: GenOpts = {}): Promise<T | null> {
    const parts: Part[] = [{ text: prompt }];
    if (imageUrl) {
        const img = await fetchImageInline(imageUrl);
        if (img) parts.push({ inline_data: img });
    }
    const txt = await generate(parts, { ...opts, json: true });
    return parseJson<T>(txt);
}
