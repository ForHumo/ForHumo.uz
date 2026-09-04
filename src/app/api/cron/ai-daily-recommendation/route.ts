// Kunlik "sizga tavsiya" push cron.
// KB + signal'lar asosida har foydalanuvchiga proaktiv tavsiya.
// Tavsiyalar 3 tip:
//   1. Belis komplekt (agar KB'da "wedding" yoki oilaviy hodisa signal bo'lsa)
//   2. Nexus post / bloger (top followed authors + interests)
//   3. BN mahsulot (KB'dagi kategoriyalar asosida)
//
// Rate: 1 push / foydalanuvchi / kun (idempotent aiUsage bilan).

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sendPushToProfile } from "@/lib/push";
import { getOrRefreshSignals } from "@/lib/user-signals";
import { listKnowledge } from "@/lib/user-knowledge";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

const ACTIVE_DAYS = 7;
const MAX_PUSH_PER_DAY = 500;   // Gemini pullik — cost cheklovi

export async function GET(req: Request) {
    const auth = req.headers.get("authorization");
    if (process.env.CRON_SECRET && auth !== `Bearer ${process.env.CRON_SECRET}`) {
        return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }

    const started = Date.now();
    const activeSince = new Date(Date.now() - ACTIVE_DAYS * 24 * 60 * 60 * 1000);
    const todayStart = new Date(); todayStart.setHours(0, 0, 0, 0);

    // 1. Aktiv foydalanuvchilar (oxirgi 7 kun) + push obunachilari
    const users = await prisma.userProfile.findMany({
        where: {
            OR: [
                { lastSeenAt: { gt: activeSince } },
                { lastLoginAt: { gt: activeSince } },
            ],
        },
        select: { id: true, name: true, username: true, country: true },
        take: MAX_PUSH_PER_DAY,
    });

    let sent = 0, skipped = 0;
    for (const u of users) {
        try {
            // Bugun allaqachon tavsiya yuborilganmi?
            const already = await prisma.aiUsage.findFirst({
                where: {
                    profileId: u.id,
                    kind: "daily-recommendation",
                    createdAt: { gt: todayStart },
                },
                select: { id: true },
            });
            if (already) { skipped++; continue; }

            // Push obunasi?
            const hasSub = await prisma.nexusPushSub.count({ where: { profileId: u.id } });
            if (hasSub === 0) { skipped++; continue; }

            // Tavsiya generatsiya (KB + signals asosida)
            const rec = await generateRecommendation(u.id, u.name || u.username || "");
            if (!rec) { skipped++; continue; }

            await sendPushToProfile(u.id, {
                title: rec.title,
                body: rec.body,
                url: rec.url,
                tag: "ai-daily-rec",
            });

            await prisma.aiUsage.create({
                data: { profileId: u.id, kind: "daily-recommendation" },
            });
            sent++;
        } catch (e) {
            console.error("rec failed for", u.id, e);
            skipped++;
        }
    }

    return NextResponse.json({
        ok: true,
        totalActive: users.length,
        sent, skipped,
        tookMs: Date.now() - started,
    });
}

/** KB + signals'dan tavsiya matn generatsiya. */
async function generateRecommendation(profileId: string, name: string): Promise<{ title: string; body: string; url: string } | null> {
    const [signals, kb] = await Promise.all([
        getOrRefreshSignals(profileId),
        listKnowledge(profileId),
    ]);

    // Prioritet: Belis (agar oila/to'y signali), Nexus (top followed), BN (kategoriyalar)
    const kbMap = new Map(kb.map(k => [`${k.category}:${k.key}`, k.value.toLowerCase()]));

    // 1. Belis — agar KB'da "kids" yoki "family_event" yoki hobbies:sarpo bo'lsa
    if (
        kbMap.get("family:kids")?.match(/1|2|3/)?.length ||
        kbMap.get("family:marital_status") === "uylangan" ||
        kbMap.get("goals:current_goal")?.includes("to'y") ||
        kbMap.get("goals:current_goal")?.includes("marosim")
    ) {
        return {
            title: `${name ? name + ", " : ""}yaqin marosim uchun`,
            body: "Belisda Fotiha va Beshik to'y sarpo qutilari ijarada. Sifatli, hamyonbop, yetkazish bilan.",
            url: "https://belis.uz",
        };
    }

    // 2. Nexus — top followed author yangi post
    if (signals && signals.topFollowedAuthors.length > 0) {
        const author = signals.topFollowedAuthors[0];
        const authorProfile = await prisma.userProfile.findFirst({
            where: { username: author }, select: { id: true },
        });
        if (authorProfile) {
            const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000);
            const recentPost = await prisma.nexusPost.findFirst({
                where: { profileId: authorProfile.id, createdAt: { gt: yesterday } },
                select: { id: true },
            });
            if (recentPost) {
                return {
                    title: `@${author} yangi post joyladi`,
                    body: "Sizni qiziqtirishi mumkin — Nexus'da ko'ring.",
                    url: `/nexus/u/${author}`,
                };
            }
        }
    }

    // 3. BN — foydalanuvchi kategoriyalarga qarab yangi arzon mahsulot
    if (signals && signals.bnCategoryClicks.length > 0) {
        const cat = signals.bnCategoryClicks[0];
        return {
            title: `${cat} kategoriyasi — yangi tavsiya`,
            body: "Bozor Narxidada arzon topilmalar bor. Solishtirib ko'ring.",
            url: `https://bozornarxida.uz/qidiruv?category=${encodeURIComponent(cat)}`,
        };
    }

    // 4. Default — profil to'ldirish (agar KB kam bo'lsa)
    if (kb.length < 5) {
        return {
            title: `${name ? name + ", " : ""}sizni yaxshiroq tanish uchun`,
            body: "1 daqiqada bir necha savolga javob bering — tavsiyalar aniqroq bo'ladi.",
            url: "/id/discover",
        };
    }

    return null;
}
