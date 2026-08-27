// POST /channels/[id]/summarize?count=50
// Guruh oxirgi N xabarni Gemini bilan xulosalab beradi.
// Rate-limit: har foydalanuvchi guruhda 1 daqiqada 3 marta.

import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { aiText, aiAvailable } from "@/lib/ai";

const MAX_COUNT = 200;

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (!aiAvailable()) return NextResponse.json({ error: "AI hozir ishlamayapti" }, { status: 503 });
    const { id } = await params;
    const me = await prisma.userProfile.findUnique({ where: { email: session.user.email }, select: { id: true, country: true } });
    if (!me) return NextResponse.json({ error: "profile" }, { status: 404 });
    const member = await prisma.nexusChannelMember.findUnique({
        where: { channelId_profileId: { channelId: id, profileId: me.id } }, select: { id: true },
    });
    if (!member) return NextResponse.json({ error: "not_member" }, { status: 403 });

    const url = new URL(req.url);
    const count = Math.min(MAX_COUNT, Math.max(10, Number(url.searchParams.get("count") ?? 50)));

    const msgs = await prisma.nexusChannelMessage.findMany({
        where: { channelId: id, hidden: false, deletedForEveryoneAt: null, text: { not: null } },
        orderBy: { createdAt: "desc" },
        take: count,
        select: { text: true, senderId: true, createdAt: true },
    });
    if (msgs.length < 3) return NextResponse.json({ error: "Xabar juda kam" }, { status: 400 });

    const senderIds = Array.from(new Set(msgs.map(m => m.senderId)));
    const profiles = await prisma.userProfile.findMany({
        where: { id: { in: senderIds } }, select: { id: true, name: true, username: true },
    });
    const pMap = new Map(profiles.map(p => [p.id, p]));

    const transcript = msgs.reverse().map(m => {
        const p = pMap.get(m.senderId);
        const name = p?.name ?? p?.username ?? "?";
        return `${name}: ${(m.text ?? "").slice(0, 400)}`;
    }).join("\n");

    // Foydalanuvchi tili — country dan taxmin (UZ→uz, RU→ru, aks holda en)
    const lang = me.country === "UZ" || !me.country ? "o'zbek"
        : me.country === "RU" ? "rus"
        : "ingliz";

    const prompt = `Quyidagi Nexus guruh suhbatining ${lang} tilida qisqa xulosasini bering (3-5 gap, asosiy mavzular + qarorlar).
Suhbat matni (${msgs.length} xabar):
---
${transcript}
---
Xulosa (faqat matn, sarlavha yoki markdown yo'q):`;

    try {
        const summary = await aiText(prompt, { temperature: 0.4 });
        return NextResponse.json({ summary: summary.trim(), messageCount: msgs.length });
    } catch {
        return NextResponse.json({ error: "AI xato" }, { status: 500 });
    }
}
