// Belis AI chatbot — mijoz uchun.
// Mijoz marosim/sana/byudjet haqida yozadi, AI mos komplektni tavsiya qiladi.
//
// POST /api/belis/ai/chat  body: { messages: [{ role, text }], userContext? }
// Javob: { reply: string, recommendedSlug?: string }

import { NextResponse } from "next/server";
import { aiJSON, aiAvailable } from "@/lib/ai";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

interface ChatIn { role: "user" | "assistant"; text: string }
interface Reply { reply: string; recommendedSlug: string | null }

export async function POST(req: Request) {
    if (!aiAvailable()) {
        return NextResponse.json({ error: "ai_unavailable" }, { status: 503 });
    }

    const body = await req.json().catch(() => ({}));
    const messages: ChatIn[] = Array.isArray(body?.messages) ? body.messages.slice(-10) : [];
    if (messages.length === 0) return NextResponse.json({ error: "no_messages" }, { status: 400 });

    // Mavjud komplektlarni AI ga taqdim etamiz
    const komplektlar = await prisma.belisKomplekt.findMany({
        where: { isActive: true, hidden: false },
        select: {
            slug: true, kind: true, nameUz: true,
            dailyRentUzs: true, deposit: true,
            itemsCount: true, copyCount: true,
        },
    });

    const catalogText = komplektlar.map(k =>
        `- ${k.slug}: "${k.nameUz}" (${k.kind}, ${k.itemsCount} quti, ${k.copyCount} nusxa, ${k.dailyRentUzs.toLocaleString()} so'm/kun, zaklat ${k.deposit.toLocaleString()} so'm)`
    ).join("\n");

    const conversation = messages.map(m => `${m.role === "user" ? "Mijoz" : "AI"}: ${m.text}`).join("\n");

    const prompt = `Sen "Belis" studiyasi uchun mijozlarga yordam beruvchi AI konsultantsan.
Belis — Fotiha va Beshik to'y marosimlariga sarpo qutilarini IJARAGA beruvchi studiya (Toshkent).
Sotib olinmaydi — ijaraga olinadi. Marosim kunidan 1 kun oldin olib ketiladi, 3 kun ichida qaytariladi.
Zaklat qoldiriladi. Pasport nusxasi olinadi.

Hozir mavjud komplektlar:
${catalogText || "(hozircha katalogda yo'q)"}

Suhbat:
${conversation}

Vazifa:
1. Mijozning marosim turi va sanasini so'ra (agar bilmagansan)
2. Mos komplekt bo'lsa tavsiya qil (slug'ni qaytar)
3. Ijara qoidalari (1 kun oldin/3 kun ichida/zaklat/pasport) haqida qisqa eslat
4. Aniq muammo bo'lsa "keyingi qadam" ayt (masalan: "Katalogdan komplekt tanlang va sanani kiriting")
5. Uzbek tilida javob ber. Reklama emas, samimiy va oddiy uslub.
6. 2-3 gap yetadi (uzun paragraf yozma)

JSON qaytar: { "reply": "matn", "recommendedSlug": "fotiha-standart" yoki null }`;

    const result = await aiJSON<Reply>(prompt, { temperature: 0.7 });
    if (!result || !result.reply) {
        return NextResponse.json({ error: "ai_failed" }, { status: 502 });
    }

    return NextResponse.json({
        reply: result.reply.trim().slice(0, 1000),
        recommendedSlug: result.recommendedSlug ?? null,
    });
}
