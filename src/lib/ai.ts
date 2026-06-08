// Gemini (Google Generative AI) — REST orqali (SDK shart emas, serverless'da ishlaydi)
// Kalit: GEMINI_API_KEY (Google AI Studio'dan bepul). Model: GEMINI_MODEL (default gemini-2.0-flash)

const GEMINI_KEY = process.env.GEMINI_API_KEY;
const GEMINI_MODEL = process.env.GEMINI_MODEL || "gemini-2.0-flash";

export function aiAvailable() { return !!GEMINI_KEY; }

type Part = { text: string } | { inline_data: { mime_type: string; data: string } };

interface GenOpts { system?: string; json?: boolean; temperature?: number }

async function generate(parts: Part[], opts: GenOpts = {}): Promise<string> {
    if (!GEMINI_KEY) throw new Error("AI_NO_KEY");
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${GEMINI_KEY}`;
    const body: Record<string, unknown> = {
        contents: [{ parts }],
        generationConfig: {
            temperature: opts.temperature ?? 0.7,
            ...(opts.json ? { responseMimeType: "application/json" } : {}),
        },
    };
    if (opts.system) body.systemInstruction = { parts: [{ text: opts.system }] };

    const res = await fetch(url, {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body),
    });
    if (!res.ok) {
        const t = await res.text().catch(() => "");
        throw new Error(`AI_ERR ${res.status}: ${t.slice(0, 300)}`);
    }
    const data = await res.json();
    return data?.candidates?.[0]?.content?.parts?.[0]?.text ?? "";
}

export async function aiText(prompt: string, opts: GenOpts = {}): Promise<string> {
    return generate([{ text: prompt }], opts);
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
