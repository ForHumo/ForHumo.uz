// Rieltor bot — Telegram webhook. Faqat oq ro'yxatdagi 2-3 kishi.
// CSV yuklash (sotuv/xaridor snapshot) + /report + /stats + erkin savol (AI).
// Setup: setWebhook(url=.../api/realtor/bot, secret_token=REALTOR_BOT_WEBHOOK_SECRET).

import { NextResponse, after } from "next/server";
import { prisma } from "@/lib/prisma";
import { isAllowed, sendMessage, downloadFile, importCsv, buildDailyReport, sendDailyReport } from "@/lib/realtor-bot";
import { aiText, aiAvailable } from "@/lib/ai";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const SECRET = process.env.REALTOR_BOT_WEBHOOK_SECRET;

interface TgDoc { file_id: string; file_name?: string; mime_type?: string }
interface TgMsg { message_id: number; text?: string; document?: TgDoc; chat: { id: number }; from?: { id: number } }
interface TgUpdate { message?: TgMsg }

export async function POST(req: Request) {
    if (!SECRET) return NextResponse.json({ error: "not_configured" }, { status: 503 });
    if (req.headers.get("x-telegram-bot-api-secret-token") !== SECRET) {
        return NextResponse.json({ error: "forbidden" }, { status: 401 });
    }
    const update = await req.json().catch(() => null) as TgUpdate | null;
    const msg = update?.message;
    if (!msg?.from) return NextResponse.json({ ok: true });

    const fromId = msg.from.id;
    const chatId = msg.chat.id;

    // Oq ro'yxat — faqat 2-3 kishi. Boshqalar faqat o'z ID'sini ko'radi (setup uchun qulaylik).
    if (!isAllowed(fromId)) {
        after(() => sendMessage(chatId, `Ruxsat yo'q. Sizning Telegram ID: <code>${fromId}</code>`));
        return NextResponse.json({ ok: true });
    }

    after(() => handle(msg, chatId).catch((e) => console.error("[realtor-bot]", e)));
    return NextResponse.json({ ok: true });
}

const WELCOME =
    "🏘 <b>Rieltor bot</b>\n\n" +
    "📋 Buyruqlar:\n" +
    "/report — hozirgi mos juftliklar hisoboti\n" +
    "/stats — snapshotdagi sotuv/xaridor soni\n\n" +
    "📄 CSV yuklash: sotuv yoki xaridor CSV faylini shu chatga yuboring (eski snapshot almashtiriladi).\n" +
    "💬 Savol: masalan \"qaysi tumanda eng arzon kvartira\" — AI joriy data ustida javob beradi.\n\n" +
    "🕘 Har kuni 09:00da mos juftliklar hisoboti avtomatik keladi.";

async function handle(msg: TgMsg, chatId: number) {
    // CSV hujjat
    if (msg.document) {
        const name = (msg.document.file_name || "").toLowerCase();
        if (!name.endsWith(".csv") && msg.document.mime_type !== "text/csv") {
            await sendMessage(chatId, "Faqat CSV fayl qabul qilinadi (sotuv yoki xaridor).");
            return;
        }
        const text = await downloadFile(msg.document.file_id);
        if (!text) { await sendMessage(chatId, "Faylni yuklab bo'lmadi, qayta urining."); return; }
        const res = await importCsv(text);
        if (res.kind === "unknown") {
            await sendMessage(chatId, "CSV turini aniqlab bo'lmadi. Sarlavhada 'narx' (sotuv) yoki 'byudjet_min' (xaridor) bo'lishi kerak.");
        } else {
            const label = res.kind === "sale" ? "sotuv e'loni" : "xaridor so'rovi";
            await sendMessage(chatId, `✅ Import tayyor: <b>${res.count}</b> ta ${label} yangilandi (eski snapshot almashtirildi).`);
        }
        return;
    }

    const text = (msg.text || "").trim();

    if (text === "/start" || text === "/help") { await sendMessage(chatId, WELCOME); return; }
    if (text === "/report") { await sendDailyReport(chatId, await buildDailyReport()); return; }
    if (text === "/stats") {
        const [s, b] = await Promise.all([prisma.realtorListing.count(), prisma.realtorBuyer.count()]);
        await sendMessage(chatId, `📊 Hozirgi snapshot — Sotuv: <b>${s}</b> · Xaridor: <b>${b}</b>`);
        return;
    }

    // Erkin matn → AI (joriy sotuv+xaridor data ustida)
    if (text.length >= 3) { await aiAnswer(chatId, text); return; }
}

async function aiAnswer(chatId: number, question: string) {
    if (!aiAvailable()) { await sendMessage(chatId, "AI hozir mavjud emas. /report yoki /stats dan foydalaning."); return; }
    const [listings, buyers] = await Promise.all([
        prisma.realtorListing.findMany({ take: 80, select: { propertyType: true, price: true, currency: true, rooms: true, district: true, phone: true } }),
        prisma.realtorBuyer.findMany({ take: 80, select: { propertyType: true, budgetMin: true, budgetMax: true, currency: true, rooms: true, district: true, phone: true } }),
    ]);
    const ctx = JSON.stringify({ sotuv: listings, xaridor: buyers });
    const prompt =
        "Sen ko'chmas mulk rieltori uchun yordamchisan. Quyida joriy sotuv e'lonlari va xaridor so'rovlari (JSON). " +
        "Faqat shu ma'lumotga asoslanib rieltorga foydali, qisqa javob ber (o'zbekcha). Emoji ishlatma.\n\n" +
        `MA'LUMOT:\n${ctx}\n\nSAVOL: ${question}`;
    const ans = await aiText(prompt).catch(() => "");
    await sendMessage(chatId, ans || "Javob topilmadi.");
}
