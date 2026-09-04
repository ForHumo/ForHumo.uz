// Kunlik AI profile reminder cron.
// KB kam bo'lgan yoki 30+ kun yangilanmagan foydalanuvchilarga push xabar:
//   "Humo AI sizni yaxshi bilishi uchun bir necha savol javob bering"
//
// Jim rejim: bir foydalanuvchi kuniga bir marta (idempotent tag orqali).
// Vercel Hobby — faqat kunlik cron.

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sendPushToProfile } from "@/lib/push";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

const MIN_KB_THRESHOLD = 5;           // undan kam bo'lsa taklif
const REMINDER_INTERVAL_DAYS = 30;    // 30 kunda 1 marta
const ACTIVE_DAYS = 14;               // faqat oxirgi 14 kun aktiv foydalanuvchilarga

export async function GET(req: Request) {
    const auth = req.headers.get("authorization");
    if (process.env.CRON_SECRET && auth !== `Bearer ${process.env.CRON_SECRET}`) {
        return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }

    const started = Date.now();
    const activeSince = new Date(Date.now() - ACTIVE_DAYS * 24 * 60 * 60 * 1000);
    const reminderSince = new Date(Date.now() - REMINDER_INTERVAL_DAYS * 24 * 60 * 60 * 1000);

    // Oxirgi 14 kun aktiv foydalanuvchilar
    const users = await prisma.userProfile.findMany({
        where: {
            OR: [
                { lastSeenAt: { gt: activeSince } },
                { lastLoginAt: { gt: activeSince } },
            ],
        },
        select: { id: true, name: true, username: true },
        take: 3000,
    });

    let sent = 0, skippedKb = 0, skippedRecent = 0, skippedNoPush = 0;

    for (const u of users) {
        try {
            // KB kattaligi
            const kbCount = await prisma.userKnowledge.count({ where: { profileId: u.id } });
            if (kbCount >= MIN_KB_THRESHOLD) { skippedKb++; continue; }

            // Oxirgi reminder — 30 kun ichida yuborilganmi?
            const recent = await prisma.aiUsage.findFirst({
                where: {
                    profileId: u.id,
                    kind: "profile-reminder",
                    createdAt: { gt: reminderSince },
                },
                select: { id: true },
            });
            if (recent) { skippedRecent++; continue; }

            // Push obunasi bormi?
            const hasSub = await prisma.nexusPushSub.count({ where: { profileId: u.id } });
            if (hasSub === 0) { skippedNoPush++; continue; }

            const name = u.name || (u.username ? `@${u.username}` : "");
            const nameCap = name ? `${name}, ` : "";
            const body = kbCount === 0
                ? "Humo AI sizni yaxshi bilishi uchun bir necha savol javob bering — tavsiyalar aniqroq bo'ladi."
                : `Hozir ${kbCount} ta ma'lumot bor. Yana bir necha savol javob bering — AI aniqroq javob beradi.`;

            await sendPushToProfile(u.id, {
                title: `${nameCap}sizni yaxshiroq tanish uchun 1 daqiqa`,
                body,
                url: "/id/discover",
                tag: "ai-profile-reminder",
            });

            // Log — takroriy yubormaslik uchun
            await prisma.aiUsage.create({
                data: { profileId: u.id, kind: "profile-reminder" },
            });

            sent++;
        } catch (e) {
            console.error("reminder failed for", u.id, e);
        }
    }

    return NextResponse.json({
        ok: true,
        totalActive: users.length,
        sent,
        skippedKb,
        skippedRecent,
        skippedNoPush,
        tookMs: Date.now() - started,
    });
}
