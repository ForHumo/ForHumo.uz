// Belis Telegram bot (@belisuz_bot) webhook.
// Sozlash: BotFather'da webhook URL: https://forhumo.uz/api/belis/tg/webhook
// setWebhook: https://api.telegram.org/bot<TOKEN>/setWebhook?url=...
//
// Voqealar: /start → xush kelibsiz + WebApp tugma. Telefon so'rovi opsional.
// Yangi foydalanuvchi BelisTelegramUser'ga upsert bo'ladi.

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { belisBotSend, belisWebAppButton } from "@/lib/belis-bot";

// Telegram Update payload (soddalashtirilgan)
interface TgUser { id: number; first_name?: string; last_name?: string; username?: string; language_code?: string }
interface TgChat { id: number; type: string }
interface TgMessage { message_id: number; from?: TgUser; chat: TgChat; text?: string; contact?: { phone_number: string; user_id?: number }; }
interface TgUpdate { update_id: number; message?: TgMessage }

export async function POST(req: Request) {
    try {
        const update = (await req.json()) as TgUpdate;
        const msg = update.message;
        if (!msg || !msg.from) return NextResponse.json({ ok: true });
        const from = msg.from;
        const chatId = String(msg.chat.id);

        // Foydalanuvchini upsert
        await prisma.belisTelegramUser.upsert({
            where: { tgId: String(from.id) },
            create: {
                tgId: String(from.id),
                chatId,
                firstName: from.first_name ?? null,
                lastName: from.last_name ?? null,
                username: from.username ?? null,
                languageCode: from.language_code ?? "uz",
            },
            update: {
                chatId,
                firstName: from.first_name ?? null,
                lastName: from.last_name ?? null,
                username: from.username ?? null,
                lastSeenAt: new Date(),
                ...(msg.contact?.phone_number ? { phone: msg.contact.phone_number } : {}),
            },
        });

        const text = msg.text?.trim() ?? "";

        if (text === "/start" || text.startsWith("/start ")) {
            const name = from.first_name || "Aziz mijoz";
            const html = [
                `<b>Assalomu alaykum, ${name}!</b>`,
                ``,
                `<i>Belis</i> — nafis sarpo va sovg'a to'plamlari.`,
                `Siz uchun, mehr bilan…`,
                ``,
                `Katalogni ko'rish uchun quyidagi tugmani bosing:`,
            ].join("\n");
            await belisBotSend(chatId, html, { reply_markup: belisWebAppButton() });
            return NextResponse.json({ ok: true });
        }

        if (text === "/help" || text === "/yordam") {
            const html = [
                `<b>Belis yordami</b>`,
                ``,
                `/start — Belis'ni ochish`,
                `/aloqa — Biz bilan bog'lanish`,
                ``,
                `Savol yoki takliflar uchun: @belisuz_admin (yaqin orada)`,
            ].join("\n");
            await belisBotSend(chatId, html);
            return NextResponse.json({ ok: true });
        }

        if (text === "/aloqa" || text === "/contacts") {
            const html = [
                `<b>Aloqa</b>`,
                ``,
                `📢 Kanal: @belisuz`,
                `📸 Instagram: belis.uz`,
                `📍 Manzil: Toshkent (41.196833, 69.155139)`,
                `🌐 Sayt: belis.uz (tez orada)`,
            ].join("\n");
            await belisBotSend(chatId, html);
            return NextResponse.json({ ok: true });
        }

        // Default javob — WebApp tugmasini eslatib turamiz
        await belisBotSend(chatId, `Katalogni ochish uchun tugmani bosing:`, { reply_markup: belisWebAppButton() });
        return NextResponse.json({ ok: true });
    } catch {
        // Telegram xato javob'iga jimlik bilan qaytamiz — retry qilmasin
        return NextResponse.json({ ok: true });
    }
}
