// ForHumo Nexus — Agent webhook example (Node.js + Express)
// Barcha event turlari (message.*, callback.query, invoice.paid, inline.query)
// va javob turlari (text/media/buttons/invoice/inline results) namoyishi.

import express from "express";
import crypto from "node:crypto";

const API_KEY  = process.env.FORHUMO_AGENT_API_KEY || "";
const PORT     = Number(process.env.PORT || 8080);
const REPLAY_WINDOW_SEC = 300;   // ±5 daq

if (!API_KEY) {
    console.error("FORHUMO_AGENT_API_KEY .env ga qo'yilmagan");
    process.exit(1);
}

const app = express();

// MUHIM: HMAC hisoblash uchun raw body kerak, JSON parse'dan oldin.
app.use("/webhook", express.raw({ type: "application/json", limit: "1mb" }));

// HMAC-SHA256 tekshiruv (timing-safe)
function verifySignature(bodyBuf, timestamp, signature) {
    if (!timestamp || !signature) return false;
    const ts = Number(timestamp);
    if (!Number.isFinite(ts)) return false;
    const now = Math.floor(Date.now() / 1000);
    if (Math.abs(now - ts) > REPLAY_WINDOW_SEC) return false;

    const h = crypto.createHmac("sha256", API_KEY);
    h.update(`${timestamp}.${bodyBuf.toString("utf8")}`);
    const expected = "sha256=" + h.digest("hex");
    try {
        const a = Buffer.from(expected);
        const b = Buffer.from(signature);
        return a.length === b.length && crypto.timingSafeEqual(a, b);
    } catch {
        return false;
    }
}

app.post("/webhook", (req, res) => {
    const bodyBuf   = req.body;
    const timestamp = req.get("X-Forhumo-Timestamp");
    const signature = req.get("X-Forhumo-Signature");
    const event     = req.get("X-Forhumo-Event");

    if (!verifySignature(bodyBuf, timestamp, signature)) {
        return res.status(401).json({ error: "invalid signature" });
    }

    let payload;
    try { payload = JSON.parse(bodyBuf.toString("utf8")); }
    catch { return res.status(400).json({ error: "invalid json" }); }

    console.log(`[${event}] from @${payload.from?.username || payload.from?.profileId}: ${payload.text || payload.query || "(media)"}`);

    switch (event) {
        case "message.created":
            return res.json(handleMessage(payload));
        case "callback.query":
            return res.json(handleCallback(payload));
        case "invoice.paid":
            return res.json(handleInvoicePaid(payload));
        case "inline.query":
            return res.json(handleInline(payload));
        case "message.edited":
        case "message.deleted":
        case "message.pinned":
        case "message.unpinned":
            return res.json({});   // log qildik, javob bermaymiz
        default:
            return res.json({});
    }
});

// --- Event handlerlar ---

function handleMessage(p) {
    const text = (p.text || "").trim();

    // /help — inline tugmalar bilan javob
    if (text === "/help" || text.toLowerCase() === "help") {
        return {
            text: "Salom! Buyruqlar:\n/echo <matn> — matnni takrorlash\n/buy — namunaviy to'lov\n/media — rasm yuborish",
            buttons: [
                [{ text: "Sotib olish", callbackData: "buy" }, { text: "Media", callbackData: "media" }],
                [{ text: "Sayt", url: "https://forhumo.uz" }],
            ],
        };
    }

    // /echo
    if (text.startsWith("/echo ")) {
        return { text: text.slice(6) };
    }

    // /buy — invoice
    if (text === "/buy") {
        return {
            text: "To'lash uchun quyidagi tugmani bosing:",
            invoice: {
                amount: 10000,
                currency: "UZS",
                description: "Test mahsulot",
                payload: "order_12345",
            },
        };
    }

    // /media — rasm
    if (text === "/media") {
        return {
            text: "Namunaviy rasm:",
            mediaUrl: "https://picsum.photos/seed/forhumo/600/400",
            mediaType: "image",
            mediaMime: "image/jpeg",
        };
    }

    // Default — echo
    return { text: `Siz yozdingiz: ${text}` };
}

function handleCallback(p) {
    const data = p.callbackData;
    if (data === "buy") {
        return {
            text: "Siz sotib olish tugmasini bosdingiz.",
            invoice: { amount: 5000, currency: "UZS", description: "Callback buyurtmasi", payload: "cb_" + Date.now() },
        };
    }
    if (data === "media") {
        return {
            text: "Media namunasi:",
            mediaUrl: "https://picsum.photos/seed/callback/500/500",
            mediaType: "image",
        };
    }
    return { text: `Tugma bosildi: ${data}` };
}

function handleInvoicePaid(p) {
    const { amount, currency, payload } = p.invoice || {};
    return {
        text: `To'lov qabul qilindi ✓\nSumma: ${amount} ${currency}\nBuyurtma: ${payload || "—"}\n\nRahmat! Buyurtmangiz qayta ishlanmoqda.`,
    };
}

function handleInline(p) {
    const q = (p.query || "").trim();
    // Namunaviy 3 ta natija — foydalanuvchi tanlagani DM'da yuboriladi.
    return {
        results: [
            {
                id:          "res-1",
                title:       q ? `Qidiruv: "${q}"` : "Xush kelibsiz",
                description: "Birinchi natija namunasi",
                thumbnailUrl: "https://picsum.photos/seed/inline1/64",
                message:     { text: `Siz "${q}" ni qidirdingiz — bu 1-natija.` },
            },
            {
                id:          "res-2",
                title:       "Rasmli natija",
                description: "Ikkinchi variant",
                message:     { text: "Rasmli javob:", mediaUrl: "https://picsum.photos/seed/inline2/600/400", mediaType: "image" },
            },
            {
                id:          "res-3",
                title:       "Uchinchi natija",
                message:     { text: `Sizga "${q}" bo'yicha uchinchi variant.` },
            },
        ],
    };
}

app.get("/", (_req, res) => res.json({ ok: true, name: "forhumo-agent-nodejs" }));

app.listen(PORT, () => {
    console.log(`ForHumo agent webhook: http://localhost:${PORT}/webhook`);
});
