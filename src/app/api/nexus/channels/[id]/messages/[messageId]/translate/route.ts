// POST /channels/[id]/messages/[messageId]/translate  { lang: "uz"|"ru"|"en" }
// Xabarni Gemini bilan tarjima qiladi (soft rate-limit: 60/daq).

import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { aiText, aiAvailable } from "@/lib/ai";

const LANG_LABELS: Record<string, string> = {
    uz: "o'zbek", ru: "rus", en: "ingliz",
};

export async function POST(req: Request, { params }: { params: Promise<{ id: string; messageId: string }> }) {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (!aiAvailable()) return NextResponse.json({ error: "AI hozir ishlamayapti" }, { status: 503 });
    const { id, messageId } = await params;
    const me = await prisma.userProfile.findUnique({ where: { email: session.user.email }, select: { id: true } });
    if (!me) return NextResponse.json({ error: "profile" }, { status: 404 });
    const member = await prisma.nexusChannelMember.findUnique({
        where: { channelId_profileId: { channelId: id, profileId: me.id } }, select: { id: true },
    });
    if (!member) return NextResponse.json({ error: "not_member" }, { status: 403 });

    const body = await req.json().catch(() => ({}));
    const lang = String(body?.lang ?? "uz");
    if (!(lang in LANG_LABELS)) return NextResponse.json({ error: "Til noto'g'ri" }, { status: 400 });

    const msg = await prisma.nexusChannelMessage.findUnique({
        where: { id: messageId }, select: { id: true, channelId: true, text: true, deletedForEveryoneAt: true },
    });
    if (!msg || msg.channelId !== id) return NextResponse.json({ error: "not_found" }, { status: 404 });
    if (msg.deletedForEveryoneAt || !msg.text) return NextResponse.json({ error: "Matn yo'q" }, { status: 400 });

    try {
        const translation = await aiText(
            `Quyidagi matnni ${LANG_LABELS[lang]} tiliga tarjima qiling. Faqat tarjima matnini bering, izohsiz, markdown'siz:\n\n${msg.text.slice(0, 4000)}`,
            { temperature: 0.2 }
        );
        return NextResponse.json({ translation: translation.trim(), lang });
    } catch {
        return NextResponse.json({ error: "AI xato" }, { status: 500 });
    }
}
