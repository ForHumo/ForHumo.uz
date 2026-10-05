// For Humo — Telegram "generic" botlarini sozlash: setWebhook + setMyCommands + setChatMenuButton.
// Faqat 8 generic bot (forhumo, humo_id, nexus, esport, market, pay, ummi, support).
// humo_ai va bozor_narxida tegilmaydi (ularning o'z boy sozlamasi bor).
//
// Ishlatish (loyiha ildizidan):
//   node scripts/tg-setup-bots.mjs                      # BASE = https://forhumo.uz
//   node scripts/tg-setup-bots.mjs https://forhumo.uz   # BASE ni qo'lda berish
//
// Tokenlar .env.local dan o'qiladi (<KEY>_BOT_TOKEN, ixtiyoriy <KEY>_BOT_WEBHOOK_SECRET).
// Tokeni yo'q bot jim o'tkaziladi.

import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const BASE = (process.argv[2] || "https://forhumo.uz").replace(/\/+$/, "");
const TG = "https://api.telegram.org";

// .env.local ni oddiy parse qilish
function loadEnv() {
    const env = {};
    try {
        const raw = readFileSync(resolve(process.cwd(), ".env.local"), "utf8");
        for (const line of raw.split(/\r?\n/)) {
            const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
            if (!m) continue;
            let v = m[2].trim();
            if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) v = v.slice(1, -1);
            env[m[1]] = v;
        }
    } catch {
        console.error("OGOHLANTIRISH: .env.local o'qilmadi — process.env ishlatiladi.");
    }
    return { ...env, ...process.env };
}

// Generic botlar (registr telegram-bots.ts bilan mos bo'lishi SHART)
const BOTS = [
    { key: "forhumo",  token: "FORHUMO_BOT_TOKEN",  secret: "FORHUMO_BOT_WEBHOOK_SECRET",  path: "/api/telegram/forhumo/webhook",  mini: "https://forhumo.uz",         label: "For Humo" },
    { key: "humo_id",  token: "HUMO_ID_BOT_TOKEN",  secret: "HUMO_ID_BOT_WEBHOOK_SECRET",  path: "/api/telegram/humo_id/webhook",  mini: "https://forhumo.uz/id",      label: "Humo ID" },
    { key: "nexus",    token: "NEXUS_BOT_TOKEN",    secret: "NEXUS_BOT_WEBHOOK_SECRET",    path: "/api/telegram/nexus/webhook",    mini: "https://forhumo.uz/nexus",   label: "Humo Nexus" },
    { key: "esport",   token: "ESPORT_BOT_TOKEN",   secret: "ESPORT_BOT_WEBHOOK_SECRET",   path: "/api/telegram/esport/webhook",   mini: "https://forhumo.uz/esport",  label: "Humo eSport" },
    { key: "market",   token: "MARKET_BOT_TOKEN",   secret: "MARKET_BOT_WEBHOOK_SECRET",   path: "/api/telegram/market/webhook",   mini: "https://forhumo.uz/market",  label: "Humo Market" },
    { key: "pay",      token: "PAY_BOT_TOKEN",      secret: "PAY_BOT_WEBHOOK_SECRET",      path: "/api/telegram/pay/webhook",      mini: "https://forhumo.uz/pay",     label: "For Pay" },
    { key: "ummi",     token: "UMMI_BOT_TOKEN",     secret: "UMMI_BOT_WEBHOOK_SECRET",     path: "/api/telegram/ummi/webhook",     mini: "https://forhumo.uz",         label: "Ummi" },
    { key: "support",  token: "SUPPORT_BOT_TOKEN",  secret: "SUPPORT_BOT_WEBHOOK_SECRET",  path: "/api/telegram/support/webhook",  mini: "https://forhumo.uz/support", label: "Humo Support" },
];

const CMDS = {
    uz: [{ command: "start", description: "Ilovani ochish" }, { command: "link", description: "Humo ID bog'lash" }, { command: "help", description: "Yordam" }],
    ru: [{ command: "start", description: "Открыть приложение" }, { command: "link", description: "Привязать Humo ID" }, { command: "help", description: "Помощь" }],
    en: [{ command: "start", description: "Open the app" }, { command: "link", description: "Link Humo ID" }, { command: "help", description: "Help" }],
};

async function api(token, method, body) {
    try {
        const r = await fetch(`${TG}/bot${token}/${method}`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(body),
        });
        return await r.json();
    } catch (e) {
        return { ok: false, description: String(e?.message || e) };
    }
}

async function main() {
    const env = loadEnv();
    console.log(`BASE = ${BASE}\n`);
    for (const b of BOTS) {
        const token = env[b.token];
        if (!token) { console.log(`SKIP  ${b.key}  (${b.token} yo'q)`); continue; }
        const secret = env[b.secret] || undefined;
        const url = BASE + b.path;

        const wh = await api(token, "setWebhook", {
            url,
            allowed_updates: ["message", "callback_query"],
            secret_token: secret,
            drop_pending_updates: true,
        });
        const c1 = await api(token, "setMyCommands", { commands: CMDS.uz });
        await api(token, "setMyCommands", { commands: CMDS.ru, language_code: "ru" });
        await api(token, "setMyCommands", { commands: CMDS.en, language_code: "en" });
        const mb = await api(token, "setChatMenuButton", {
            menu_button: { type: "web_app", text: b.label.slice(0, 15), web_app: { url: b.mini } },
        });

        const ok = wh.ok && c1.ok && mb.ok;
        console.log(`${ok ? "OK  " : "XATO"}  ${b.key.padEnd(9)} webhook=${wh.ok ? "✓" : wh.description} menu=${mb.ok ? "✓" : mb.description}${secret ? "" : "  (secret yo'q!)"}`);
    }
    console.log("\nTugadi. getWebhookInfo bilan tekshirsangiz bo'ladi.");
}

main();
