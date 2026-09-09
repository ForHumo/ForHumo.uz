// Bozor Narxida (@bozornarxidabot) — webhook handler.
// Foydalanuvchi bot chat orqali BN'dan foydalanadi: /start, mahsulot izlash,
// rasm yuborish (kelasi Faza), buyurtma tafsilotlari (linked bo'lsa).

import { NextResponse, after } from "next/server";
import { sendMessage, sendChatAction, secretFor } from "@/lib/telegram-bots";
import { tryHandleLinkCommand, personalGreet, forHumoEcosystemBlock, pickLang, FOR_HUMO_FOLDER } from "@/lib/telegram-bot-common";
import { generateBotAiReply } from "@/lib/telegram-bot-chat";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 30;

const BOT = "bozor_narxida" as const;

interface TgFromLite { id: number; language_code?: string; is_bot?: boolean; first_name?: string; last_name?: string; username?: string }
interface TgMessageLite {
    message_id: number;
    from?: TgFromLite;
    chat: { id: number };
    text?: string;
    caption?: string;
    photo?: { file_id: string; width: number; height: number }[];
    voice?: { file_id: string; duration: number; mime_type?: string };
    reply_to_message?: {
        message_id: number;
        photo?: { file_id: string; width: number; height: number }[];
    };
}
interface TgUpdateLite {
    update_id: number;
    message?: TgMessageLite;
    edited_message?: TgMessageLite;
}

export async function POST(req: Request) {
    const secret = secretFor(BOT);
    if (secret) {
        const provided = req.headers.get("x-telegram-bot-api-secret-token");
        if (provided !== secret) {
            return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
        }
    }

    let update: TgUpdateLite;
    try {
        update = await req.json();
    } catch {
        return NextResponse.json({ ok: false, error: "invalid_json" }, { status: 400 });
    }

    if (update.message) {
        after(async () => {
            try { await handleMessage(update.message!); }
            catch (e) { console.error("[bn-bot] error", e); }
        });
    }
    return NextResponse.json({ ok: true });
}

async function handleMessage(msg: TgMessageLite) {
    if (msg.from?.is_bot) return;
    const lang = pickLang(msg.from?.language_code);
    const chatId = msg.chat.id;
    const tgId = String(msg.from?.id ?? "");
    if (!tgId) return;

    const text = (msg.text ?? msg.caption ?? "").trim();

    // 1) /link va /start link_CODE
    if (text) {
        const handled = await tryHandleLinkCommand({
            bot: BOT,
            text,
            telegramUserId: tgId,
            telegramUsername: msg.from?.username ?? null,
            chatId,
            lang,
        });
        if (handled) return;
    }

    // 2) /start (oddiy)
    if (text === "/start" || text.startsWith("/start")) {
        const greet = await personalGreet(tgId, lang);
        await sendMessage(BOT, {
            chatId,
            text: startText(lang, greet),
            parseMode: "HTML",
            disableWebPreview: true,
        });
        return;
    }

    // 3) /help
    if (text === "/help") {
        await sendMessage(BOT, {
            chatId,
            text: helpText(lang),
            parseMode: "HTML",
            disableWebPreview: true,
        });
        return;
    }

    // 4) /link (raqam'siz — kod so'rash ko'rsatmasi)
    if (text === "/link") {
        await sendMessage(BOT, {
            chatId,
            text: linkInstructionText(lang),
            parseMode: "HTML",
            disableWebPreview: true,
        });
        return;
    }

    // 4b) /sot NARX (rasm caption yoki reply-to-photo) — do'kon egasi mahsulot yaratadi
    if (text.startsWith("/sot")) {
        await handleSellCommand({
            text,
            msg,
            tgId,
            chatId,
            lang,
        });
        return;
    }

    // 5) /me (bog'langan bo'lsa profil'ni ko'rsatish)
    if (text === "/me") {
        const greet = await personalGreet(tgId, lang);
        await sendMessage(BOT, {
            chatId,
            text: greet ? `${greet}\n\n${lang === "ru" ? "Профиль:" : lang === "en" ? "Profile:" : "Profilingiz:"} https://forhumo.uz/id`
                : linkInstructionText(lang),
            parseMode: "HTML",
            disableWebPreview: true,
        });
        return;
    }

    // 6) Voice — Gemini transkribatsiya → matn sifatida davom
    if (msg.voice) {
        void sendChatAction(BOT, chatId, "typing");
        try {
            const { tgGetFileBytes } = await import("@/lib/telegram-bots");
            const { aiTranscribeAudio } = await import("@/lib/ai");
            const buf = await tgGetFileBytes(BOT, msg.voice.file_id);
            if (buf) {
                const transcript = await aiTranscribeAudio(buf, msg.voice.mime_type ?? "audio/ogg", { language: "auto" });
                if (transcript) {
                    // Transkribatsiya natijasini foydalanuvchiga ko'rsatib qidiruvga o'tamiz
                    const heard = lang === "ru" ? `Услышал: <i>«${escapeHtml(transcript)}»</i>` : lang === "en" ? `Heard: <i>"${escapeHtml(transcript)}"</i>` : `Eshitdim: <i>«${escapeHtml(transcript)}»</i>`;
                    await sendMessage(BOT, { chatId, text: heard, parseMode: "HTML" });
                    const productSearch = await tryBnProductSearch(transcript, lang);
                    if (productSearch) {
                        await sendMessage(BOT, { chatId, text: productSearch, parseMode: "HTML", disableWebPreview: false });
                        return;
                    }
                    const reply = await generateBotAiReply({
                        bot: BOT, userText: transcript,
                        telegramUserId: tgId, chatId: String(chatId), language: lang,
                    });
                    if (reply) {
                        await sendMessage(BOT, { chatId, text: reply.text, disableWebPreview: true });
                        return;
                    }
                }
            }
            await sendMessage(BOT, {
                chatId,
                text: lang === "ru" ? "Не разобрал голос. Напишите текстом."
                    : lang === "en" ? "Couldn't understand the voice. Please write text."
                    : "Ovozni tushunmadim. Matnda yozing.",
            });
        } catch (e) {
            console.error("[bn-bot voice]", e);
        }
        return;
    }

    // 7) Rasm → Gemini vision → nomni ajratib BN qidiruv
    if (msg.photo && msg.photo.length > 0) {
        void sendChatAction(BOT, chatId, "typing");
        try {
            const { tgGetFileBytes } = await import("@/lib/telegram-bots");
            const { aiDescribeProductImage } = await import("@/lib/ai");
            // Eng katta hajmli photo (oxirgi element)
            const largest = msg.photo[msg.photo.length - 1];
            const buf = await tgGetFileBytes(BOT, largest.file_id);
            if (!buf) {
                await sendMessage(BOT, {
                    chatId,
                    text: lang === "ru" ? "Не смог загрузить фото." : lang === "en" ? "Couldn't fetch the photo." : "Rasmni ola olmadim.",
                });
                return;
            }
            const desc = await aiDescribeProductImage(buf, "image/jpeg");
            if (!desc || !desc.name) {
                await sendMessage(BOT, {
                    chatId,
                    text: lang === "ru" ? "На фото мне не видно товара. Опишите текстом." : lang === "en" ? "I don't see a product in the photo. Describe in text." : "Rasmda mahsulot ko'rmadim. Matn bilan tavsiflab bering.",
                });
                return;
            }
            const heard = lang === "ru"
                ? `Вижу: <i>«${escapeHtml(desc.name)}»</i>. Ищу...`
                : lang === "en"
                ? `I see: <i>"${escapeHtml(desc.name)}"</i>. Searching...`
                : `Ko'rdim: <i>«${escapeHtml(desc.name)}»</i>. Qidiryapman...`;
            await sendMessage(BOT, { chatId, text: heard, parseMode: "HTML" });

            // Qidiruv: birinchi keyword yoki name bo'yicha
            const queries = [desc.name, ...(desc.keywords ?? [])].filter(Boolean).slice(0, 3);
            for (const q of queries) {
                const res = await tryBnProductSearch(q, lang);
                if (res) {
                    await sendMessage(BOT, { chatId, text: res, parseMode: "HTML", disableWebPreview: false });
                    return;
                }
            }
            const noMatch = lang === "ru"
                ? `Похоже, такого товара пока нет в базе. Попробуйте: https://bozornarxida.uz/qidiruv?q=${encodeURIComponent(desc.name)}`
                : lang === "en"
                ? `Couldn't find this product yet. Try: https://bozornarxida.uz/qidiruv?q=${encodeURIComponent(desc.name)}`
                : `Bunday mahsulot bazamizda hozircha topilmadi. Sinang: https://bozornarxida.uz/qidiruv?q=${encodeURIComponent(desc.name)}`;
            await sendMessage(BOT, { chatId, text: noMatch });
        } catch (e) {
            console.error("[bn-bot photo]", e);
        }
        return;
    }

    // 8) Umumiy matn → BN mahsulot qidirish + AI (Humo AI mirror)
    if (text.length > 0) {
        void sendChatAction(BOT, chatId, "typing");

        // Mahsulot izlash ishorasi: qisqa matn (< 60 chars) va so'rovga o'xshasa
        const productSearch = await tryBnProductSearch(text, lang);
        if (productSearch) {
            await sendMessage(BOT, {
                chatId,
                text: productSearch,
                parseMode: "HTML",
                disableWebPreview: false,
            });
            return;
        }

        // Aks holda AI mirror
        const reply = await generateBotAiReply({
            bot: BOT,
            userText: text,
            telegramUserId: tgId,
            chatId: String(chatId),
            language: lang,
        });
        if (reply) {
            await sendMessage(BOT, {
                chatId,
                text: reply.text,
                disableWebPreview: true,
            });
        } else {
            await sendMessage(BOT, {
                chatId,
                text: lang === "ru"
                    ? "Не понял запрос. Попробуйте: <b>олма 5 кг</b> или <b>мясо цена</b>."
                    : lang === "en"
                    ? "Didn't understand. Try: <b>apples 5 kg</b> or <b>meat price</b>."
                    : "Tushunmadim. Sinab ko'ring: <b>olma 5 kg</b> yoki <b>go'sht narxi</b>.",
                parseMode: "HTML",
            });
        }
    }
}

// ── BN mahsulot qidirish ────────────────────────────────────────────────────

async function tryBnProductSearch(query: string, lang: "uz" | "ru" | "en"): Promise<string | null> {
    if (query.length < 2 || query.length > 60) return null;
    // Faqat mahsulotga o'xshash qisqa so'rov
    if (query.startsWith("/")) return null;

    try {
        const { prisma } = await import("@/lib/prisma");
        const products = await prisma.bnProduct.findMany({
            where: {
                isActive: true, hidden: false,
                title: { contains: query, mode: "insensitive" },
            },
            take: 5,
            orderBy: { updatedAt: "desc" },
            select: {
                slug: true, title: true, price: true,
                shop: { select: { slug: true, name: true, market: { select: { name: true } } } },
            },
        });
        if (products.length === 0) return null;

        const header = lang === "ru"
            ? `<b>Найдено ${products.length}:</b>\n\n`
            : lang === "en"
            ? `<b>Found ${products.length}:</b>\n\n`
            : `<b>${products.length} ta topildi:</b>\n\n`;

        const lines = products.map(p => {
            const price = new Intl.NumberFormat("uz-UZ").format(Number(p.price ?? 0));
            const currency = lang === "ru" ? " сум" : lang === "en" ? " UZS" : " so'm";
            const shopName = p.shop?.name ?? "";
            const marketName = p.shop?.market?.name ?? "";
            const shopLine = marketName ? `${shopName} · ${marketName}` : shopName;
            const url = `https://bozornarxida.uz/p/${p.slug}?utm_source=tg_bot&utm_medium=chat`;
            return `• <a href="${url}"><b>${escapeHtml(p.title)}</b></a> — ${price}${currency}\n  ${escapeHtml(shopLine)}`;
        });

        const footer = lang === "ru"
            ? `\n\n<a href="https://bozornarxida.uz/qidiruv?q=${encodeURIComponent(query)}">Все результаты →</a>`
            : lang === "en"
            ? `\n\n<a href="https://bozornarxida.uz/qidiruv?q=${encodeURIComponent(query)}">All results →</a>`
            : `\n\n<a href="https://bozornarxida.uz/qidiruv?q=${encodeURIComponent(query)}">Barcha natijalar →</a>`;

        return header + lines.join("\n\n") + footer;
    } catch { return null; }
}

function escapeHtml(s: string): string {
    return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

// ── Matnlar ──────────────────────────────────────────────────────────────────

function startText(lang: "uz" | "ru" | "en", personalGreet: string | null): string {
    const greet = personalGreet ? `${personalGreet}\n\n` : "";
    if (lang === "ru") {
        return greet + `<b>Bozor Narxida</b> — маркетплейс базаров и магазинов Ташкента.\n\n` +
            `Напишите название товара — покажу лучшие цены:\n` +
            `• <i>яблоки 5 кг</i>\n` +
            `• <i>мясо говядина цена</i>\n` +
            `• <i>помидоры Чорсу</i>\n\n` +
            `<b>Команды:</b>\n` +
            `/help — помощь\n` +
            `/link — привязать Humo ID\n` +
            `/me — мой профиль\n\n` +
            `Сайт: https://bozornarxida.uz` +
            forHumoEcosystemBlock(lang);
    }
    if (lang === "en") {
        return greet + `<b>Bozor Narxida</b> — Tashkent bazaars & shops marketplace.\n\n` +
            `Type a product name — I'll show best prices:\n` +
            `• <i>apples 5 kg</i>\n` +
            `• <i>beef price</i>\n` +
            `• <i>tomatoes Chorsu</i>\n\n` +
            `<b>Commands:</b>\n` +
            `/help — help\n` +
            `/link — link your Humo ID\n` +
            `/me — my profile\n\n` +
            `Website: https://bozornarxida.uz` +
            forHumoEcosystemBlock(lang);
    }
    return greet + `<b>Bozor Narxida</b> — Toshkent bozor va do'konlar marketplace'i.\n\n` +
        `Mahsulot nomini yozing — eng arzon narxlarni ko'rsataman:\n` +
        `• <i>olma 5 kg</i>\n` +
        `• <i>mol go'shti narxi</i>\n` +
        `• <i>pomidor Chorsu</i>\n\n` +
        `<b>Buyruqlar:</b>\n` +
        `/help — yordam\n` +
        `/link — Humo ID'ga bog'lash\n` +
        `/me — profilim\n\n` +
        `Sayt: https://bozornarxida.uz` +
        forHumoEcosystemBlock(lang);
}

function helpText(lang: "uz" | "ru" | "en"): string {
    if (lang === "ru") {
        return `<b>Как пользоваться:</b>\n\n` +
            `<b>Поиск:</b> напишите название товара — покажу цены и магазины.\n\n` +
            `<b>Humo ID:</b> получите код на https://forhumo.uz/id и отправьте <code>/link КОД</code> — так я буду знать ваши заказы, кошелёк и т.д.\n\n` +
            `<b>Экосистема For Humo:</b>\n` +
            `<a href="${FOR_HUMO_FOLDER}">Все каналы одной папкой</a>\n\n` +
            `Мини-приложение (для входа в forhumo.uz одним кликом) — скоро.`;
    }
    if (lang === "en") {
        return `<b>How to use:</b>\n\n` +
            `<b>Search:</b> type a product name — I'll show prices and shops.\n\n` +
            `<b>Humo ID:</b> get a code at https://forhumo.uz/id and send <code>/link CODE</code> — then I'll know your orders, wallet, etc.\n\n` +
            `<b>For Humo ecosystem:</b>\n` +
            `<a href="${FOR_HUMO_FOLDER}">All channels in one folder</a>\n\n` +
            `Mini-app (one-click login to forhumo.uz) — coming soon.`;
    }
    return `<b>Qanday foydalanish:</b>\n\n` +
        `<b>Qidiruv:</b> mahsulot nomini yozing — narx va do'konlarni ko'rsataman.\n\n` +
        `<b>Humo ID:</b> https://forhumo.uz/id da kod oling va <code>/link KOD</code> yuboring — shunda buyurtmangiz, hamyoningiz haqida bilib javob beraman.\n\n` +
        `<b>For Humo ekotizimi:</b>\n` +
        `<a href="${FOR_HUMO_FOLDER}">Barcha kanallar bitta folder'da</a>\n\n` +
        `Mini-app (forhumo.uz'ga 1 bosishda kirish) — tez kunda.`;
}

function linkInstructionText(lang: "uz" | "ru" | "en"): string {
    if (lang === "ru") {
        return `<b>Привязка Humo ID к Telegram:</b>\n\n` +
            `1. Откройте <a href="https://forhumo.uz/id">forhumo.uz/id</a>\n` +
            `2. Нажмите <b>«Привязать Telegram»</b> — получите 6-символьный код\n` +
            `3. Отправьте: <code>/link ВАШКОД</code>\n\n` +
            `После этого оба бота (@ForHumo_AIBot и @bozornarxidabot) будут знать, что это вы.`;
    }
    if (lang === "en") {
        return `<b>Link Humo ID to Telegram:</b>\n\n` +
            `1. Open <a href="https://forhumo.uz/id">forhumo.uz/id</a>\n` +
            `2. Tap <b>"Link Telegram"</b> — you'll get a 6-char code\n` +
            `3. Send: <code>/link YOURCODE</code>\n\n` +
            `Both bots (@ForHumo_AIBot and @bozornarxidabot) will then recognize you.`;
    }
    return `<b>Humo ID'ni Telegram'ga bog'lash:</b>\n\n` +
        `1. <a href="https://forhumo.uz/id">forhumo.uz/id</a> ni oching\n` +
        `2. <b>«Telegram bog'lash»</b> tugmasini bosing — 6 belgi kod olasiz\n` +
        `3. Yuboring: <code>/link SIZNINGKOD</code>\n\n` +
        `Shundan keyin ikkala bot (@ForHumo_AIBot va @bozornarxidabot) sizni taniydi.`;
}

// ── /sot NARX — do'kon egasi mahsulot yaratadi ──────────────────────────────

async function handleSellCommand(opts: {
    text: string;
    msg: TgMessageLite;
    tgId: string;
    chatId: number;
    lang: "uz" | "ru" | "en";
}) {
    const { findLinkedProfile } = await import("@/lib/telegram-link");
    const linked = await findLinkedProfile(opts.tgId);

    if (!linked) {
        await sendMessage(BOT, {
            chatId: opts.chatId,
            text: opts.lang === "ru" ? "Сначала привяжите Humo ID: /link" :
                  opts.lang === "en" ? "First link your Humo ID: /link" :
                                       "Awval Humo ID'ni bog'lang: /link",
        });
        return;
    }

    const { prisma } = await import("@/lib/prisma");
    const shop = await prisma.bnShop.findFirst({
        where: { profileId: linked.profileId, status: { in: ["ACTIVE", "APPROVED", "VERIFIED"] as never[] } },
        select: { id: true, slug: true, name: true },
    }).catch(async () => {
        // status filter noto'g'ri bo'lsa filtersiz izlash
        return prisma.bnShop.findFirst({
            where: { profileId: linked.profileId },
            select: { id: true, slug: true, name: true },
        });
    });

    if (!shop) {
        await sendMessage(BOT, {
            chatId: opts.chatId,
            text: opts.lang === "ru"
                ? "У вас нет активного магазина в BN. Откройте: https://bozornarxida.uz/sotuvchi"
                : opts.lang === "en"
                ? "You have no active shop in BN. Open: https://bozornarxida.uz/sotuvchi"
                : "Sizda BN'da faol do'kon yo'q. Oching: https://bozornarxida.uz/sotuvchi",
            parseMode: "HTML",
        });
        return;
    }

    // Narxni ajratish
    const priceMatch = opts.text.match(/\/sot\s+(\d[\d\s]*)/);
    const priceUzs = priceMatch ? parseInt(priceMatch[1].replace(/\s/g, "")) : 0;
    if (!priceUzs || priceUzs < 1000) {
        await sendMessage(BOT, {
            chatId: opts.chatId,
            text: opts.lang === "ru"
                ? "Пример: <code>/sot 45000</code> (ответ на фото товара)"
                : opts.lang === "en"
                ? "Example: <code>/sot 45000</code> (reply to product photo)"
                : "Namuna: <code>/sot 45000</code> (mahsulot rasmiga javob)",
            parseMode: "HTML",
        });
        return;
    }

    // Rasmni topish: (a) bevosita xabarda + caption, (b) reply-to-photo
    const photos = opts.msg.photo?.length
        ? opts.msg.photo
        : opts.msg.reply_to_message?.photo?.length
            ? opts.msg.reply_to_message.photo
            : null;

    if (!photos) {
        await sendMessage(BOT, {
            chatId: opts.chatId,
            text: opts.lang === "ru"
                ? "Прикрепите фото товара с caption <code>/sot 45000</code>, или ответьте на фото командой <code>/sot 45000</code>"
                : opts.lang === "en"
                ? "Attach a product photo with caption <code>/sot 45000</code>, or reply to a photo with <code>/sot 45000</code>"
                : "Rasm caption'ida <code>/sot 45000</code> yozing, yoki rasmga javob berib <code>/sot 45000</code> yuboring",
            parseMode: "HTML",
        });
        return;
    }

    await sendChatAction(BOT, opts.chatId, "typing");

    try {
        const { tgGetFileBytes } = await import("@/lib/telegram-bots");
        const { aiDescribeProductImage } = await import("@/lib/ai");

        const largest = photos[photos.length - 1];
        const buf = await tgGetFileBytes(BOT, largest.file_id);
        if (!buf) {
            await sendMessage(BOT, {
                chatId: opts.chatId,
                text: opts.lang === "ru" ? "Не смог загрузить фото." : opts.lang === "en" ? "Couldn't fetch photo." : "Rasmni ola olmadim.",
            });
            return;
        }
        const desc = await aiDescribeProductImage(buf, "image/jpeg");
        const title = desc?.name?.trim() || (opts.lang === "ru" ? "Товар" : opts.lang === "en" ? "Product" : "Mahsulot");

        // Vercel Blob'ga rasm yuklab olamiz
        let imageUrl: string | null = null;
        try {
            const { put } = await import("@vercel/blob");
            const fileName = `bn-tg/${shop.slug}/${Date.now()}.jpg`;
            const blob = await put(fileName, buf, {
                access: "public",
                addRandomSuffix: false,
                contentType: "image/jpeg",
            });
            imageUrl = blob.url;
        } catch (e) {
            console.error("[bn-bot /sot upload]", e);
        }

        // Slug yaratish
        const slug = slugify(title) + "-" + Math.random().toString(36).slice(2, 7);

        const created = await prisma.bnProduct.create({
            data: {
                shopId: shop.id,
                title: title.slice(0, 120),
                slug,
                description: desc?.description ?? null,
                images: imageUrl ? [imageUrl] : [],
                price: priceUzs,
                stock: 1,
                isActive: true,
                hidden: false,
                allowPickup: true,
                allowInspect: true,
            },
            select: { id: true, slug: true, title: true, price: true },
        });

        const productUrl = `https://bozornarxida.uz/p/${created.slug}`;
        await sendMessage(BOT, {
            chatId: opts.chatId,
            text: opts.lang === "ru"
                ? `Готово! Товар опубликован:\n<b>${escapeHtml(created.title)}</b> — ${formatSum(created.price)} сум\n${productUrl}\n\nОткройте кабинет для правок: https://bozornarxida.uz/kabinet`
                : opts.lang === "en"
                ? `Done! Product published:\n<b>${escapeHtml(created.title)}</b> — ${formatSum(created.price)} UZS\n${productUrl}\n\nEdit in cabinet: https://bozornarxida.uz/kabinet`
                : `Tayyor! Mahsulot chop etildi:\n<b>${escapeHtml(created.title)}</b> — ${formatSum(created.price)} so'm\n${productUrl}\n\nTahrirlash uchun kabinet: https://bozornarxida.uz/kabinet`,
            parseMode: "HTML",
        });
    } catch (e) {
        console.error("[bn-bot /sot]", e);
        await sendMessage(BOT, {
            chatId: opts.chatId,
            text: opts.lang === "ru" ? "Не смог создать товар. Попробуйте через сайт." : opts.lang === "en" ? "Couldn't create product. Try the website." : "Mahsulot yaratib bo'lmadi. Saytdan urinib ko'ring.",
        });
    }
}

function slugify(s: string): string {
    return s.toLowerCase()
        .replace(/[^a-z0-9Ѐ-ӿ\s-]/g, "")
        .replace(/\s+/g, "-")
        .slice(0, 40) || "mahsulot";
}

function formatSum(n: number): string {
    return new Intl.NumberFormat("uz-UZ").format(n);
}
