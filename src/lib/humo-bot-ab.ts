// A/B testing — har chatga "A" yoki "B" persona tayinlash.
// Chat davomida saqlanadi (HumoBotChatState.variant).

import crypto from "node:crypto";

export function pickVariantForChat(profileId: string, chatId: string): "A" | "B" {
    // Deterministik: bir xil chat har doim bir xil variantga tushadi
    const hash = crypto.createHash("sha256").update(`${profileId}:${chatId}`).digest();
    return hash[0] % 2 === 0 ? "A" : "B";
}
