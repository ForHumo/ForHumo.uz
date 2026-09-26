// OpenRouter streaming (OpenAI-mos /chat/completions SSE).
// Kalit: OPENROUTER_API_KEY. Bir integratsiya → OpenAI/Anthropic/DeepSeek/Llama/...
// Gemini bu yerdan EMAS (u lib/ai.ts'da bepul, to'g'ridan).

const OR_URL = "https://openrouter.ai/api/v1/chat/completions";

export interface OrMsg { role: string; body: string }  // "ai" → assistant, aks holda user

/**
 * OpenRouter'dan chat javobini stream qiladi. Har bo'lak `onChunk(text)` ga keladi.
 * To'liq javob qaytariladi. Kalit yo'q / xato → Error tashlaydi (chaqiruvchi ushlaydi).
 */
export async function streamOpenRouter(
    opts: { model: string; system: string; history: OrMsg[]; temperature?: number },
    onChunk: (text: string) => void,
): Promise<string> {
    const key = process.env.OPENROUTER_API_KEY;
    if (!key) throw new Error("OPENROUTER_NO_KEY");

    const messages = [
        { role: "system", content: opts.system },
        ...opts.history.map(m => ({ role: m.role === "ai" ? "assistant" : "user", content: m.body })),
    ];

    const res = await fetch(OR_URL, {
        method: "POST",
        headers: {
            "Authorization": `Bearer ${key}`,
            "Content-Type": "application/json",
            // OpenRouter tavsiya qiladi (reyting/attribution) — ixtiyoriy
            "HTTP-Referer": "https://www.forhumo.uz",
            "X-Title": "Humo AI",
        },
        body: JSON.stringify({
            model: opts.model,
            messages,
            stream: true,
            temperature: opts.temperature ?? 0.7,
        }),
    });

    if (!res.ok || !res.body) {
        const t = await res.text().catch(() => "");
        throw new Error(`OPENROUTER_ERR ${res.status}: ${t.slice(0, 200)}`);
    }

    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";
    let full = "";

    while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";
        for (const line of lines) {
            const trimmed = line.trim();
            if (!trimmed.startsWith("data:")) continue;
            const payload = trimmed.slice(5).trim();
            if (!payload || payload === "[DONE]") continue;
            try {
                const parsed = JSON.parse(payload);
                const delta: string = parsed?.choices?.[0]?.delta?.content ?? "";
                if (delta) { full += delta; onChunk(delta); }
            } catch { /* malformed chunk — skip */ }
        }
    }
    return full;
}
