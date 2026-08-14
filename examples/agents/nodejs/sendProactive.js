// Proaktiv xabar — agent tomondan foydalanuvchiga DM yuborish
// (foydalanuvchi avval yozmagan bo'lsa ham, agar u agentga yozgan bo'lsa)
//
// Ishlatish:
//   node sendProactive.js <recipientProfileId> "matn"

import crypto from "node:crypto";

const API_KEY  = process.env.FORHUMO_AGENT_API_KEY || "";
const BASE_URL = process.env.FORHUMO_BASE_URL || "https://forhumo.uz";

if (!API_KEY) { console.error("FORHUMO_AGENT_API_KEY o'rnatilmagan"); process.exit(1); }

const [, , recipientId, ...textParts] = process.argv;
if (!recipientId || textParts.length === 0) {
    console.error("Ishlatish: node sendProactive.js <profileId> \"matn\"");
    process.exit(1);
}
const text = textParts.join(" ");

const body = JSON.stringify({
    recipientProfileId: recipientId,
    text,
});
const timestamp = String(Math.floor(Date.now() / 1000));
const signature = "sha256=" + crypto.createHmac("sha256", API_KEY)
    .update(`${timestamp}.${body}`)
    .digest("hex");

const res = await fetch(`${BASE_URL}/api/nexus/agents/webhook-inbox`, {
    method: "POST",
    headers: {
        "Content-Type":           "application/json",
        "X-Forhumo-Timestamp":    timestamp,
        "X-Forhumo-Signature":    signature,
        "X-Forhumo-Api-Key":      API_KEY,
    },
    body,
});

console.log(res.status, await res.text());
