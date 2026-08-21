// Smart reply — Gemini AI orqali oxirgi xabarlarga 3 ta qisqa javob taklif.
// GET /api/nexus/messages/[id]/smart-reply?ctx=<msgId>
// ?ctx opt — konteksni oxirgi msgId'gacha cheklaydi (cache key sifatida ham).

import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { aiAvailable, aiJSON } from "@/lib/ai";

interface Suggestions { replies: string[] }

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (!aiAvailable()) return NextResponse.json({ replies: [] });
    const { id } = await params;

    const me = await prisma.userProfile.findUnique({ where: { email: session.user.email }, select: { id: true } });
    if (!me) return NextResponse.json({ error: "Profil topilmadi" }, { status: 404 });
    const conv = await prisma.nexusConversation.findUnique({ where: { id } });
    if (!conv) return NextResponse.json({ error: "Suhbat topilmadi" }, { status: 404 });
    if (conv.user1Id !== me.id && conv.user2Id !== me.id) return NextResponse.json({ error: "Ruxsat yo'q" }, { status: 403 });

    // Oxirgi 12 xabar konteksi. E2E xabarlar'da text=""; ular avtomatik e'tibordan tashqarida qoladi.
    const recent = await prisma.nexusMessage.findMany({
        where: {
            conversationId: id,
            deletedForEveryoneAt: null,
        },
        orderBy: { createdAt: "desc" }, take: 12,
        select: { id: true, text: true, senderId: true, mediaType: true, createdAt: true, e2ePayload: true },
    });
    const messages = recent
        .filter(m => !m.e2ePayload)   // shifrlangan xabarlarni Gemini'ga bermaymiz
        .reverse();
    if (messages.length === 0) return NextResponse.json({ replies: [] });

    // Oxirgi xabar men'niki bo'lsa — smart reply kerak emas
    const last = messages[messages.length - 1];
    if (last.senderId === me.id) return NextResponse.json({ replies: [] });
    // Oxirgi xabar bo'sh matn (faqat media) — ham skip
    if (!last.text || !last.text.trim()) return NextResponse.json({ replies: [] });

    // Konteksni oddiy transkript sifatida beramiz
    const transcript = messages.map(m =>
        `${m.senderId === me.id ? "MEN" : "SUHBATDOSH"}: ${m.text || (m.mediaType ? `[${m.mediaType}]` : "")}`
    ).join("\n");

    const prompt = `Sen ForHumo.uz DM ilovasidagi "smart reply" yordamchisisan. Quyidagi suhbat transkriptini o'qib, foydalanuvchi (MEN) 3 ta juda qisqa tabiiy javob taklifini bergin.

Qoidalar:
- Til: SUHBATDOSH so'nggi xabari qaysi tilda bo'lsa, javoblar ham shu tilda (uzbek/rus/ingliz).
- Har javob 1-4 so'zdan iborat. Emoji yo'q.
- 3 javob turli intonatsiya: tasdiq/rozilik, savol/qiziqish, kechiktirish/rad.
- Faqat JSON qaytar: {"replies": ["...", "...", "..."]}
- Xushmuomala, do'stona ohang. Rasmiy emas.

Suhbat:
${transcript}`;

    try {
        const out = await aiJSON<Suggestions>(prompt, { temperature: 0.5 });
        const replies = Array.isArray(out?.replies) ? out.replies.slice(0, 3).map(s => String(s).trim()).filter(s => s.length > 0 && s.length <= 40) : [];
        return NextResponse.json({ replies, contextMsgId: last.id });
    } catch {
        return NextResponse.json({ replies: [] });
    }
}
