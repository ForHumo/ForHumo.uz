// Nexus Agent tizimi — Telegram Bot API ekvivalenti (@BotFather naqshi).
//
// - `_agent` suffiksi = foydalanuvchi yaratgan agentlar (Telegram'da `_bot` kabi)
// - Har qanday foydalanuvchi @create orqali o'z agentini yaratishi mumkin
// - Foydalanuvchi profil username uchun `_agent` bilan tugaydigan nom tanlolmaydi
//   — bu suffiks faqat agent-yaratish oqimida beriladi
// - Rasmiy tizim agentlari (`isSystem=true`) qisqa nom bilan (masalan @ID, @AI,
//   @Nexus, ...) — hech kim ularni ololmas, o'chirilmaydi, faqat mute qilinadi
// - Har foydalanuvchiga MAX_AGENTS_PER_USER cheklovi

export const AGENT_SUFFIX = "_agent";
export const AGENT_CREATOR_USERNAME = "create";
export const MAX_AGENTS_PER_USER = 10;

// Rasmiy modul agentlari (system=true). Har biri o'z modulida event trigger orqali xabar yuboradi.
// Qisqa usernamelar (Telegram uslub — @BotFather, @SpotifyBot kabi).
// @ForHumo — asosiy super-app agenti (barcha modullar haqida umumiy).
export const OFFICIAL_AGENTS = [
    { username: "forhumo",  module: "MAIN",    name: "For Humo",       image: "/logo.png" },
    { username: "id",       module: "ID",      name: "Humo ID",        image: "/logos/humo-id.png" },
    { username: "ai",       module: "AI",      name: "Humo AI",        image: "/logos/humo-ai.png" },
    { username: "nexus",    module: "NEXUS",   name: "Humo Nexus",     image: "/logos/humo-nexus.png" },
    { username: "esport",   module: "ESPORT",  name: "Humo eSport",    image: "/logos/humo-esport.png" },
    { username: "market",   module: "MARKET",  name: "Humo Market",    image: "/logos/humo-market.png" },
    { username: "pay",      module: "PAY",     name: "For Pay",        image: "/logos/for-pay.png" },
    { username: "bn",       module: "BN",      name: "Bozor Narxida",  image: "/bn/logo.png" },
    { username: "support",  module: "SUPPORT", name: "Humo Support",   image: "/logos/humo-support.png" },
];

// Rasmiy tizim agentlari usernamelari — hech kim ularni oddiy profil sifatida
// ololmas (yaratish/o'zgartirish paytida bloklanadi). Lowercase.
export const RESERVED_SYSTEM_AGENTS = new Set(OFFICIAL_AGENTS.map(a => a.username));

// Username `_agent` bilan tugaydimi (foydalanuvchiga taqiq)
export function isAgentUsername(u: string): boolean {
    return u.toLowerCase().endsWith(AGENT_SUFFIX);
}

// @create maxsus username — faqat agent yaratuvchisi
export function isCreatorUsername(u: string): boolean {
    return u.toLowerCase() === AGENT_CREATOR_USERNAME;
}

// Oddiy profil username tanlashda tekshiruv.
// Foydalanuvchi profil uchun `_agent` yoki `create` ololmaydi — bular
// alohida oqim (agent yaratish) orqali beriladi.
export function isReservedByAgentRule(username: string): {
    reserved: boolean; reason?: string;
} {
    if (isCreatorUsername(username)) {
        return { reserved: true, reason: "@create — agent yaratuvchisi (tizim hisobi)" };
    }
    if (isAgentUsername(username)) {
        return {
            reserved: true,
            reason: "*_agent bilan tugaydigan nom faqat @create orqali agent sifatida yaratiladi",
        };
    }
    return { reserved: false };
}

// Agent yaratishda ishlatiladigan qat'iyroq tekshiruv
export function validateAgentUsername(username: string): { ok: boolean; error?: string } {
    const u = username.toLowerCase();
    if (!/^[a-z0-9_]{4,32}$/.test(u)) return { ok: false, error: "4-32 belgi: a-z, 0-9, _" };
    if (!isAgentUsername(u)) return { ok: false, error: "Nom `_agent` bilan tugashi shart" };
    if (isCreatorUsername(u)) return { ok: false, error: "Bu nom band" };
    if (RESERVED_SYSTEM_AGENTS.has(u)) return { ok: false, error: "Bu nom tizim agenti uchun band" };
    // `create_agent` kabi maxsus prefikslar bloklanmaydi — foydalanuvchi tanlaydi
    return { ok: true };
}
