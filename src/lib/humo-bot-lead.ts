// Humo AI Business Mode — buyurtma qabul qilish (lead) slot-fill.
//
// AI mijoz xabarlarida "olmoqchi/kerak/buyurtma" kabi niyatni aniqlasa
// slot-fill boshlanadi: ism → telefon → manzil → tasdiq → HumoBotLead saqlanadi.
// Ega push oladi (agar Web Push obuna bo'lsa).

import { prisma } from "@/lib/prisma";
import { aiText, aiAvailable } from "@/lib/ai";

const ORDER_INTENT_KEYWORDS = /\b(olmoqchi|olsam|olishmoqchi|kerak|buyurtma|zakaz|zakas|hoxlayman|xohlayman|olarmidim|olaman|olsam bo'ladi|отправ|заказ|нужен|нужна|надо|хочу|купить|можно|order|buy|want)\b/i;

/**
 * Xabar niyat aniqlanish darajasi (0-1). AI'siz ham oddiy regex bilan.
 */
export function detectOrderIntent(text: string): boolean {
    return ORDER_INTENT_KEYWORDS.test(text);
}

/**
 * O'zbek/rus/en telefonini ajratib olish.
 * "+998911234567", "998 90 123 45 67", "911234567" — hammasi qabul qilinadi.
 */
export function extractPhone(text: string): string | null {
    // Uzbekistan +998 va 9 raqamli mobil formati
    const m = text.match(/(\+?998[\s-]?\d{2}[\s-]?\d{3}[\s-]?\d{2}[\s-]?\d{2}|\+?\d{9,15})/);
    if (!m) return null;
    const cleaned = m[0].replace(/[\s-]/g, "");
    if (cleaned.length < 9) return null;
    // Uzbekistan formatiga normalize
    if (/^998/.test(cleaned)) return `+${cleaned}`;
    if (/^\d{9}$/.test(cleaned)) return `+998${cleaned}`;
    if (cleaned.startsWith("+")) return cleaned;
    return `+${cleaned}`;
}

/** State machine: keyingi qadamda so'raladigan slot. */
export type Slot = "name" | "phone" | "address" | "confirm" | "done";

export function nextSlot(state: {
    customerName: string | null;
    customerPhone: string | null;
    customerAddress: string | null;
}): Slot {
    if (!state.customerName) return "name";
    if (!state.customerPhone) return "phone";
    if (!state.customerAddress) return "address";
    return "confirm";
}

export function slotQuestion(slot: Slot, lang: "uz" | "ru" | "en"): string {
    if (slot === "name") {
        return lang === "ru" ? "Как к вам обращаться? (ваше имя)"
            : lang === "en" ? "May I have your name?"
            : "Ismingizni ayting.";
    }
    if (slot === "phone") {
        return lang === "ru" ? "Ваш номер телефона? (например +998 90 123 45 67)"
            : lang === "en" ? "Your phone number please (e.g. +998 90 123 45 67)"
            : "Telefon raqamingiz? (masalan +998 90 123 45 67)";
    }
    if (slot === "address") {
        return lang === "ru" ? "Адрес доставки или самовывоз? (напишите адрес или «самовывоз»)"
            : lang === "en" ? "Delivery address or pickup? (write address or 'pickup')"
            : "Yetkazish manzili yoki o'zim olaman? (manzil yozing yoki «o'zim olaman»)";
    }
    if (slot === "confirm") {
        return lang === "ru" ? "Спасибо! Передал заявку владельцу — он свяжется с вами скоро."
            : lang === "en" ? "Thanks! I've forwarded your request to the owner — they will contact you soon."
            : "Rahmat! So'rovingizni egaga uzatdim — u tez orada aloqaga chiqadi.";
    }
    return "";
}

/**
 * Slot bo'yicha mijoz javobini ajratib oladi.
 * name: 2-40 belgi (raqam yo'q); phone: extractPhone; address: 3-200 belgi.
 */
export function parseSlot(slot: Slot, text: string): { value: string | null; reject?: string } {
    const trimmed = text.trim();
    if (slot === "name") {
        if (trimmed.length < 2 || trimmed.length > 40) return { value: null };
        if (/^\d+$/.test(trimmed)) return { value: null };
        return { value: trimmed.slice(0, 40) };
    }
    if (slot === "phone") {
        const p = extractPhone(trimmed);
        return { value: p };
    }
    if (slot === "address") {
        if (trimmed.length < 3) return { value: null };
        return { value: trimmed.slice(0, 200) };
    }
    return { value: null };
}

// ── State + Lead operatsiyalari ─────────────────────────────────────────────

export async function getOrCreateChatState(profileId: string, connectionId: string, chatId: string) {
    return prisma.humoBotChatState.upsert({
        where: {
            profileId_connectionId_chatId: { profileId, connectionId, chatId },
        },
        create: { profileId, connectionId, chatId },
        update: {},
    });
}

export async function updateChatState(
    profileId: string, connectionId: string, chatId: string,
    patch: Partial<{
        collecting: boolean; slotStage: string | null;
        customerName: string | null; customerPhone: string | null;
        customerAddress: string | null; productMention: string | null; notes: string | null;
    }>,
) {
    return prisma.humoBotChatState.upsert({
        where: {
            profileId_connectionId_chatId: { profileId, connectionId, chatId },
        },
        create: { profileId, connectionId, chatId, ...patch },
        update: patch,
    });
}

export async function saveLead(input: {
    profileId: string;
    connectionId: string;
    chatId: string;
    customerTgId: string | null;
    customerTgUsername: string | null;
    customerName: string | null;
    customerPhone: string | null;
    customerAddress: string | null;
    productMention: string | null;
    notes: string | null;
}) {
    return prisma.humoBotLead.create({ data: input });
}

/** AI'dan mahsulot/xizmat mavzusini bir gapda chiqarish (ega'ga tushinarli). */
export async function inferProductMention(customerText: string, ownerContext: string | null): Promise<string | null> {
    if (!aiAvailable()) return null;
    try {
        const prompt = `Mijozning xabari: "${customerText.slice(0, 400)}"\n${ownerContext ? `Biznes: ${ownerContext.slice(0, 200)}` : ""}\n\nMijoz nima olishga qiziqyapti? 3-8 so'zdan iborat aniq javob (o'zbek), faqat mahsulot/xizmat nomi. Agar aniq bo'lmasa "So'rov" deb yoz.`;
        const raw = await aiText(prompt, { temperature: 0.2 });
        return (raw || "").trim().replace(/^["']|["']$/g, "").slice(0, 120) || null;
    } catch { return null; }
}
