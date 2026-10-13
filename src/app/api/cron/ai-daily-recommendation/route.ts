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
import { buildSuggestion, upsertSuggestion, ummiTipsEnabled } from "@/lib/ummi-suggestions";

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
        select: { id: true, name: true, username: true, country: true, notifPrefs: true },
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

            // Ummi takliflari o'chirilganmi?
            if (!ummiTipsEnabled(u.notifPrefs)) { skipped++; continue; }

            // Push obunasi?
            const hasSub = await prisma.nexusPushSub.count({ where: { profileId: u.id } });
            if (hasSub === 0) { skipped++; continue; }

            // Tavsiya generatsiya (KB + signals asosida) + saqlash (in-app yuza ham ko'radi)
            const draft = await buildSuggestion(u.id, u.name || u.username || "");
            if (!draft) { skipped++; continue; }
            const rec = await upsertSuggestion(u.id, draft);

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
