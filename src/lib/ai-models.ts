// Humo AI — ko'p-model katalogi. Gemini BEPUL (to'g'ridan, mavjud GEMINI_API_KEY),
// qolganlari OpenRouter orqali (OPENROUTER_API_KEY kerak). Model qo'shish = shu ro'yxatga qator.
//
// provider "gemini" → lib/ai.ts (to'g'ridan Google, bepul tier)
// provider "openrouter" → https://openrouter.ai/api/v1 (OpenAI-mos), OPENROUTER_API_KEY
//   OpenRouter model id'lari o'zgarishi mumkin — openrouter.ai/models da tekshiring.

export type AiProvider = "gemini" | "openrouter";

export interface AiModel {
    id: string;          // API model id (Gemini nomi yoki OpenRouter "provider/model")
    label: string;       // UI nomi
    provider: AiProvider;
    free: boolean;       // bepul tier (Gemini) yoki OpenRouter :free variant
    note?: string;       // qisqa tavsif
}

export const AI_MODELS: AiModel[] = [
    // BEPUL — default (Google to'g'ridan)
    { id: "gemini-2.5-flash-lite", label: "Gemini Flash Lite", provider: "gemini", free: true, note: "Tez, bepul — default" },
    { id: "gemini-2.0-flash",      label: "Gemini 2.0 Flash",  provider: "gemini", free: true, note: "Bepul, kuchliroq" },
    // OpenRouter — OPENROUTER_API_KEY kerak
    { id: "deepseek/deepseek-chat",              label: "DeepSeek V3",       provider: "openrouter", free: false, note: "Kod+chat, juda arzon" },
    { id: "deepseek/deepseek-r1",                label: "DeepSeek R1",       provider: "openrouter", free: false, note: "Reasoning" },
    { id: "openai/gpt-4o-mini",                  label: "GPT-4o mini",       provider: "openrouter", free: false, note: "OpenAI" },
    { id: "openai/gpt-4o",                       label: "GPT-4o",            provider: "openrouter", free: false, note: "OpenAI (qimmat)" },
    { id: "anthropic/claude-3.5-haiku",          label: "Claude 3.5 Haiku",  provider: "openrouter", free: false, note: "Anthropic, tez" },
    { id: "anthropic/claude-3.7-sonnet",         label: "Claude 3.7 Sonnet", provider: "openrouter", free: false, note: "Anthropic (kuchli)" },
    { id: "meta-llama/llama-3.3-70b-instruct",   label: "Llama 3.3 70B",     provider: "openrouter", free: false, note: "Meta (ochiq)" },
];

export const DEFAULT_MODEL = "gemini-2.5-flash-lite";

export function findModel(id: string | null | undefined): AiModel {
    return AI_MODELS.find(m => m.id === id) ?? AI_MODELS[0];
}

export function openRouterAvailable(): boolean {
    return !!process.env.OPENROUTER_API_KEY;
}
