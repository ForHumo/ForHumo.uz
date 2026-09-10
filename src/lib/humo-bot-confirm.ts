// Mijozga avto-konfirmatsiya (lead WON bo'lganda).
// Kanal:
//   - "whatsapp": customerPhone bilan wa.me link (client-side ochish uchun)
//   - "telegram": customerTgId bilan Humo AI bot orqali xabar
//   - "auto": Telegram bo'lsa Telegram, aks holda WhatsApp
//   - "none": yubormaslik

import { prisma } from "@/lib/prisma";
import { sendMessage } from "@/lib/telegram-bots";

const DEFAULT_TEMPLATE_UZ = `Assalomu alaykum {name}!

Buyurtmangiz qabul qilindi:
{product}{priceLine}

Tez orada aloqaga chiqamiz.

Rahmat!`;

interface ConfirmInput {
    leadId: string;
    ownerName: string;                    // Ega nomi (imzo uchun)
    customerName: string | null;
    customerPhone: string | null;
    customerTgId: string | null;
    customerAddress: string | null;
    productMention: string | null;
    wonAmountUzs: number | null;
    channel: "auto" | "whatsapp" | "telegram" | "none";
    template: string | null;
}

export interface ConfirmResult {
    sent: boolean;
    channel: "whatsapp" | "telegram" | null;
    // Client-side ochish uchun URL (whatsapp uchun)
    openUrl?: string | null;
    error?: string;
}

/**
 * Konfirmatsiya xabarini yaratadi va imkoniyat bo'yicha yuboradi.
 * WhatsApp uchun URL qaytariladi (server jo'nata olmaydi, client tab'da ochadi).
 * Telegram uchun to'g'ridan-to'g'ri bot orqali yuboradi.
 */
export async function sendConfirmation(input: ConfirmInput): Promise<ConfirmResult> {
    if (input.channel === "none") {
        return { sent: false, channel: null };
    }

    const message = renderTemplate(input.template ?? DEFAULT_TEMPLATE_UZ, {
        name: input.customerName ?? "hurmatli mijoz",
        product: input.productMention ?? "so'rovingiz",
        price: input.wonAmountUzs && input.wonAmountUzs > 0
            ? new Intl.NumberFormat("uz-UZ").format(input.wonAmountUzs) + " so'm"
            : "",
        priceLine: input.wonAmountUzs && input.wonAmountUzs > 0
            ? `\nNarx: ${new Intl.NumberFormat("uz-UZ").format(input.wonAmountUzs)} so'm`
            : "",
        phone: input.customerPhone ?? "",
        address: input.customerAddress ?? "",
        owner: input.ownerName,
    });

    // Kanal tanlash
    let picked: "whatsapp" | "telegram" | null = null;
    if (input.channel === "whatsapp") picked = input.customerPhone ? "whatsapp" : null;
    else if (input.channel === "telegram") picked = input.customerTgId ? "telegram" : null;
    else {
        // auto: Telegram > WhatsApp
        if (input.customerTgId) picked = "telegram";
        else if (input.customerPhone) picked = "whatsapp";
    }

    if (!picked) return { sent: false, channel: null, error: "no_contact" };

    if (picked === "telegram") {
        try {
            // Bu bot bilan direct chat orqali yuboriladi.
            // Muhim: mijoz oldindan @ForHumo_AIBot ga /start bosgan bo'lishi kerak,
            // aks holda Telegram Bot API 403 qaytaradi (foydalanuvchi bot'ni bloklagan).
            const r = await sendMessage("humo_ai", {
                chatId: input.customerTgId!,
                text: escapeHtml(message).replace(/\n/g, "<br>"),
                parseMode: "HTML",
                disableWebPreview: true,
            });
            await markConfirmSent(input.leadId, "telegram");
            return { sent: r.ok, channel: "telegram", error: r.ok ? undefined : (r.description ?? "tg_error") };
        } catch (e) {
            return { sent: false, channel: "telegram", error: e instanceof Error ? e.message : "tg_error" };
        }
    }

    // WhatsApp — URL qaytaramiz, client ochadi
    const phone = (input.customerPhone ?? "").replace(/\D/g, "");
    const url = `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;
    await markConfirmSent(input.leadId, "whatsapp");
    return { sent: true, channel: "whatsapp", openUrl: url };
}

async function markConfirmSent(leadId: string, channel: "whatsapp" | "telegram") {
    await prisma.humoBotLead.update({
        where: { id: leadId },
        data: { confirmSentAt: new Date(), confirmChannel: channel },
    });
}

function renderTemplate(tpl: string, vars: Record<string, string>): string {
    return tpl.replace(/\{(\w+)\}/g, (_, k) => vars[k] ?? "");
}

function escapeHtml(s: string): string {
    return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

export { DEFAULT_TEMPLATE_UZ };
