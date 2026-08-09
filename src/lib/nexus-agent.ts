// Nexus Agent tizimi — Telegram Bot API ekvivalenti.
//
// Rasmiy agent usernamelari `_agent` suffiksi bilan tugaydi (Telegram'da `_bot`
// kabi). Faqat @create egasi (hozircha @abduvoris) yangi agent yaratadi.
// Barcha `*_agent` usernamelar tizim uchun rezervlangan.
//
// Foydalanuvchi tomonidan bunday usernameni tanlash mumkin emas.

export const AGENT_SUFFIX = "_agent";
export const AGENT_CREATOR_USERNAME = "create";
export const AGENT_CREATOR_OWNER = "abduvoris";     // @create hisobga kim kirsa — Ownerdir

// Rasmiy modul agentlari (system=true). Har biri o'z modulida event trigger orqali xabar yuboradi.
export const OFFICIAL_AGENTS = [
    { username: "id_agent",       module: "ID",      name: "Humo ID",     image: "/logos/humo-id.png" },
    { username: "ai_agent",       module: "AI",      name: "Humo AI",     image: "/logos/humo-ai.png" },
    { username: "nexus_agent",    module: "NEXUS",   name: "Humo Nexus",  image: "/logos/humo-nexus.png" },
    { username: "esport_agent",   module: "ESPORT",  name: "Humo eSport", image: "/logos/humo-esport.png" },
    { username: "market_agent",   module: "MARKET",  name: "Humo Market", image: "/logos/humo-market.png" },
    { username: "pay_agent",      module: "PAY",     name: "For Pay",     image: "/logos/for-pay.png" },
    { username: "support_agent",  module: "SUPPORT", name: "Humo Support",image: "/logos/humo-support.png" },
    { username: "bn_agent",       module: "BN",      name: "Bozor Narxida", image: "/bn/logo.png" },
];

// Username `_agent` bilan tugaydimi (foydalanuvchiga taqiq)
export function isAgentUsername(u: string): boolean {
    return u.toLowerCase().endsWith(AGENT_SUFFIX);
}

// @create maxsus username — faqat agent yaratuvchisi
export function isCreatorUsername(u: string): boolean {
    return u.toLowerCase() === AGENT_CREATOR_USERNAME;
}

// Foydalanuvchi username tanlayotganda tekshiruv (reserved-username qatoridan tashqari
// qo'shimcha suffiks qoidasi). true qaytsa — foydalanuvchi bu usernameni ololmaydi.
export function isReservedByAgentRule(username: string, opts?: { isCreatorOwner?: boolean }): {
    reserved: boolean; reason?: string;
} {
    if (isCreatorUsername(username) && !opts?.isCreatorOwner) {
        return { reserved: true, reason: "Bu username agent yaratuvchisi uchun zaxiralangan" };
    }
    if (isAgentUsername(username) && !opts?.isCreatorOwner) {
        return { reserved: true, reason: "*_agent bilan tugaydigan username faqat rasmiy agentlar uchun" };
    }
    return { reserved: false };
}
