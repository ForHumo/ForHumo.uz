// Inline mode — composer'da "@botname query" yozganda avtomatik natijalar.
// Foydalanuvchi tanlagan natija oddiy DM xabar sifatida yuboriladi (client tomon).
//
//   GET /api/nexus/agents/inline?bot=<username>&q=<query>&convId=<optional>
//   → { results: [{ id, title, description?, thumbnailUrl?, message: {...} }] }
//
// Xatti-harakat:
//   1. Bot username → NexusAgent topamiz (webhookUrl + apiKey majburiy).
//   2. Foydalanuvchi bot bilan bir DM'ga a'zomi? Ixtiyoriy (convId berilsa tekshiramiz).
//   3. Blok tekshiruv (foydalanuvchi bot'ni bloklaganmi yoki aksincha).
//   4. Rate-limit — 60 so'rov / 10 daqiqa (composer polling ehtiyoji).
//   5. Bot webhook'iga imzolangan POST event="inline.query" — javob natijalari.

import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { isBlockedBetween } from "@/lib/nexus-block";
import { fetchAgentInlineResults } from "@/lib/agent-webhook";

// Sodda in-flight rate limit — foydalanuvchi id + bot id bo'yicha.
// Har foydalanuvchi bir botga bir sekundda ko'pi bilan 1 marta so'rov.
const lastCall = new Map<string, number>();
const RATE_PER_BOT_MS = 800;

export async function GET(req: Request) {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const me = await prisma.userProfile.findUnique({
        where: { email: session.user.email },
        select: { id: true, name: true, username: true },
    });
    if (!me) return NextResponse.json({ error: "Profil topilmadi" }, { status: 404 });

    const url = new URL(req.url);
    const botHandle = (url.searchParams.get("bot") || "").trim().replace(/^@/, "");
    const q = (url.searchParams.get("q") || "").trim().slice(0, 200);
    const convId = url.searchParams.get("convId");
    if (!botHandle) return NextResponse.json({ error: "bot majburiy" }, { status: 400 });

    // Bot profilini topamiz (username orqali)
    const botProfile = await prisma.userProfile.findUnique({
        where: { username: botHandle },
        select: { id: true },
    });
    if (!botProfile) return NextResponse.json({ results: [] });

    // Agent tekshiruv — profil agentmi va webhook sozlanganmi
    const agent = await prisma.nexusAgent.findUnique({
        where: { profileId: botProfile.id },
        select: { webhookUrl: true, apiKey: true },
    });
    if (!agent?.webhookUrl || !agent?.apiKey) return NextResponse.json({ results: [] });

    if (await isBlockedBetween(me.id, botProfile.id)) return NextResponse.json({ results: [] });

    // In-flight rate limit
    const key = `${me.id}:${botProfile.id}`;
    const now = Date.now();
    const prev = lastCall.get(key) ?? 0;
    if (now - prev < RATE_PER_BOT_MS) {
        return NextResponse.json({ results: [], throttled: true });
    }
    lastCall.set(key, now);
    // Xotira o'sishini oldini olish (500 eng eski yozuvni tashlab yuborish)
    if (lastCall.size > 1000) {
        const oldest = [...lastCall.entries()].sort((a, b) => a[1] - b[1]).slice(0, 500);
        for (const [k] of oldest) lastCall.delete(k);
    }

    const results = await fetchAgentInlineResults(agent, {
        event:      "inline.query",
        chatId:     convId ?? "",
        messageId:  "",              // inline.query'da xabar hali yaratilmagan
        from:       { profileId: me.id, username: me.username, name: me.name },
        text:       "",
        mediaUrl:   null,
        mediaType:  null,
        query:      q,
        timestamp:  Math.floor(now / 1000),
    });

    return NextResponse.json({ results });
}
