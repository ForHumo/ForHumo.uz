// Humo Universal AI Assistant.
// Foydalanuvchi tabiiy tilda savol beradi:
//   "Belis rezervim qanday?" | "Bu oy qancha sarfladim?" | "Nexus'da nima yangi?"
// Gemini intent aniqlaydi -> tegishli modulni so'raymiz -> AI natijani insongacha to'ldiradi.
//
//   POST /api/user/humo-assistant  { text }
//
// Rate-limited (30/kun/user).

import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { aiAvailable, aiJSON, aiText } from "@/lib/ai";
import { belisRate } from "@/lib/belis-rate";
import { fetchIntentContext, type IntentType } from "@/lib/humo-assistant-intents";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

const MAX_TEXT = 500;
const ALL_INTENTS: IntentType[] = [
    "balance", "bn_orders", "belis_bookings", "market_orders", "spending",
    "nexus_summary", "support_status", "seller_stats", "favorites", "activity",
    "help", "unknown",
];

interface Classify {
    intents: IntentType[];   // 1-3 ta mos intent
    reply?: string;          // agar 'help' bo'lsa AI'dan darhol javob
}

export async function POST(req: Request) {
    if (!aiAvailable()) {
        return NextResponse.json({ error: "ai_unavailable" }, { status: 503 });
    }

    const session = await getServerSession(authOptions);
    if (!session?.user?.email) return NextResponse.json({ error: "auth_required" }, { status: 401 });

    const profile = await prisma.userProfile.findUnique({
        where: { email: session.user.email },
        select: { id: true, name: true },
    });
    if (!profile) return NextResponse.json({ error: "profile_not_found" }, { status: 404 });

    // Rate limit
    try {
        const rate = await belisRate(profile.id, "aiChat");
        if (rate.limited) {
            return NextResponse.json({
                error: "rate_limited",
                message: `Kuniga ${rate.max} AI so'rov chegarasi. Ertaga qaytadan urinib ko'ring.`,
            }, { status: 429 });
        }
    } catch { /* fail-open */ }

    const body = await req.json().catch(() => ({}));
    const text = String(body?.text ?? "").trim().slice(0, MAX_TEXT);
    if (!text) return NextResponse.json({ error: "text_required" }, { status: 400 });

    // Bosqich 1: Intent aniqlash
    const classify = await aiJSON<Classify>(
`Sen For Humo super-app AI yordamchisisan (o'zbek tilida). Foydalanuvchi savolini oxiratdan olib intent(lar)ni aniqlaysan.

Foydalanuvchi savolini o'qib, mos intent(lar)ni JSON'da qaytar. Mumkin bo'lgan intentlar:
- balance: hamyon balansi (Pay)
- bn_orders: Bozor Narxida buyurtmalarim holati
- belis_bookings: Belis sarpo rezerv holati
- market_orders: Humo Market buyurtmalarim
- spending: shu oy qancha sarfladim (cross-modul)
- nexus_summary: Nexus'da yangi xabar/notification bormi
- support_status: mening support tiketlarim holati
- seller_stats: BN sotuvchi bo'lsam - do'kon statistika
- favorites: sevimli mahsulotlar (chegirmadagilar)
- activity: oxirgi 7 kun aktivligim
- help: umumiy yordam - reply bo'sh qoldirma, aniq javob yoz
- unknown: hech biri mos kelmasa

Foydalanuvchi savoli: "${text}"

JSON qaytar:
{
  "intents": ["intent1", "intent2"],   // 1-3 ta mos intent
  "reply": "faqat 'help' yoki 'unknown' bo'lganda: aniq javob (uz), aks holda bo'sh"
}`,
        { temperature: 0.2 },
    );

    if (!classify) {
        return NextResponse.json({
            ok: true, type: "unknown",
            reply: "Tushunmadim. Boshqacha yozib ko'ring — masalan: 'Balansim qancha?' yoki 'BN buyurtmalarim qanday?'",
        });
    }

    // Help/unknown - AI darhol javob berdi
    if (classify.intents.includes("help") || classify.intents.includes("unknown") || classify.intents.length === 0) {
        return NextResponse.json({
            ok: true, type: "help",
            reply: classify.reply || "Men For Humo bo'yicha savollarga javob beraman: balans, buyurtmalar, rezervlar, support, sotuvchi statistika.",
            intents: classify.intents,
        });
    }

    // Bosqich 2: Intent kontekstlarini yig'amiz
    const validIntents = classify.intents.filter(i => ALL_INTENTS.includes(i) && i !== "help" && i !== "unknown").slice(0, 3);
    const contexts = await Promise.all(
        validIntents.map(intent => fetchIntentContext({ profileId: profile.id, intent })),
    );
    const contextBlock = contexts.filter(c => c.length > 0).join("\n");

    if (!contextBlock) {
        return NextResponse.json({
            ok: true, type: "empty",
            reply: "Ma'lumot topilmadi. Yana savol berishga urinib ko'ring.",
            intents: validIntents,
        });
    }

    // Bosqich 3: AI kontekstdan natural language javob
    const finalReply = await aiText(
`Sen For Humo super-app yordamchisisan. Foydalanuvchi savoliga uning shaxsiy ma'lumotlari asosida javob berasan.

Foydalanuvchi: ${profile.name || "foydalanuvchi"}
Savol: "${text}"

Uning ma'lumoti (faqat shundan foydalan):
${contextBlock}

Qoidalar:
- O'zbek tilida javob ber
- 1-3 gap, aniq va foydali
- Raqamlarni yaxshi ko'rsat (so'm formatida)
- Agar javob bermaslik kerak bo'lsa: "Bu ma'lumotni topa olmadim."
- Xayrlashuv qo'shma`,
        { temperature: 0.5 },
    );

    const cleanReply = (finalReply || "").trim().slice(0, 1500);

    // aiUsage log + achievement
    try {
        await prisma.aiUsage.create({
            data: { profileId: profile.id, kind: "humo-assistant" },
        });
        const { grantAchievement } = await import("@/lib/achievements");
        void grantAchievement(profile.id, "humo.ai_first_use");
    } catch { /* fail-safe */ }

    return NextResponse.json({
        ok: true, type: "answer",
        reply: cleanReply || "Ma'lumot yig'ildi lekin javob tayyorlab bo'lmadi.",
        intents: validIntents,
    });
}
