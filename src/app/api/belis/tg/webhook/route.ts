// Belis Telegram bot (@Belisuz_bot) webhook.
// FILOSOFIYA: Botda savdo yo'q — barcha savdo Mini App ichida.
// Bot faqat foydalanuvchini WebApp'ga yo'naltiradi.
//
// Commands:
//   /start  → xush kelibsiz + katta WebApp tugma
//   /myid   → chat ID (admin sozlash uchun)
//   /aloqa  → aloqa ma'lumotlari
//   Boshqa har qanday matn → yumshoq eslatma + WebApp tugma

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { belisBotSend, belisWebAppButton } from "@/lib/belis-bot";

interface TgUser { id: number; first_name?: string; last_name?: string; username?: string; language_code?: string }
interface TgChat { id: number; type: string }
interface TgMessage { message_id: number; from?: TgUser; chat: TgChat; text?: string; contact?: { phone_number: string; user_id?: number } }
interface TgUpdate { update_id: number; message?: TgMessage }

export async function POST(req: Request) {
    try {
        const update = (await req.json()) as TgUpdate;
        const msg = update.message;
        if (!msg || !msg.from) return NextResponse.json({ ok: true });
        const from = msg.from;
        const chatId = String(msg.chat.id);

        // Foydalanuvchini upsert (Mini App ichida identify qilish uchun)
        await prisma.belisTelegramUser.upsert({
            where: { tgId: String(from.id) },
            create: {
                tgId: String(from.id), chatId,
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

        // /myid — admin sozlash uchun chat ID beradi (yagona batafsil javob)
        if (text === "/myid" || text === "/id") {
            const html = [
                `<b>Sizning ma'lumotlaringiz:</b>`,
                ``,
                `👤 <code>${from.first_name ?? ""}${from.last_name ? " " + from.last_name : ""}</code>`,
                from.username ? `📛 @${from.username}` : "",
                `🆔 Chat ID: <code>${chatId}</code>`,
                `🔢 User ID: <code>${from.id}</code>`,
            ].filter(Boolean).join("\n");
            await belisBotSend(chatId, html);
            return NextResponse.json({ ok: true });
        }

        // /aloqa — faqat kontaktlar (savdo emas)
        if (text === "/aloqa" || text === "/contacts") {
            const html = [
                `<b>Belis — aloqa</b>`,
                ``,
                `📢 Kanal: @belisuz`,
                `📸 Instagram: belis.uz`,
                `📍 Manzil: Toshkent`,
            ].join("\n");
            await belisBotSend(chatId, html, { reply_markup: belisWebAppButton() });
            return NextResponse.json({ ok: true });
        }

        // /start — welcome + WebApp
        if (text === "/start" || text.startsWith("/start ")) {
            const name = from.first_name || "Aziz mijoz";
            const html = [
                `🌿 <b>Assalomu alaykum, ${name}!</b>`,
                ``,
                `<i>Belis</i>'ga xush kelibsiz — nafis sarpo qutilari va sovg'a to'plamlari.`,
                ``,
                `Katalog va buyurtma — <b>ilova ichida</b>. Ochish uchun pastdagi tugmani bosing:`,
            ].join("\n");
            await belisBotSend(chatId, html, { reply_markup: belisWebAppButton("🛍 Belis'ni ochish") });
            return NextResponse.json({ ok: true });
        }

        // Har qanday boshqa xabar → yumshoq eslatma + WebApp tugma
        // (Bot chat'da savdo yo'q — Mini App ichida hamma amal)
        await belisBotSend(
            chatId,
            "🌿 Katalogni ko'rish va buyurtma berish uchun ilovani oching:",
            { reply_markup: belisWebAppButton("🛍 Belis'ni ochish") },
        );
        return NextResponse.json({ ok: true });
    } catch {
        return NextResponse.json({ ok: true });
    }
}
