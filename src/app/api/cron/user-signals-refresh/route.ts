// Kunlik user-signals refresh cron — barcha aktiv foydalanuvchilarning
// cross-modul harakat signallarini yangilaydi (Faza 2 AI konteksti uchun).
//
// Vercel Hobby: faqat kunlik cron.
// Har foydalanuvchi uchun aggregateUserSignals() chaqiriladi.
// Faqat SO'NGGI 30 KUNDA faol bo'lgan foydalanuvchilar (jim hisoblarni tashlab yuboramiz).

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { aggregateUserSignals } from "@/lib/user-signals";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

const ACTIVE_DAYS = 30;
const BATCH_SIZE = 50;      // bir vaqtda 50 profil
const PARALLEL = 5;         // 5 tasi parallel

export async function GET(req: Request) {
    // Vercel cron header
    const auth = req.headers.get("authorization");
    if (process.env.CRON_SECRET && auth !== `Bearer ${process.env.CRON_SECRET}`) {
        return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }

    const since = new Date(Date.now() - ACTIVE_DAYS * 24 * 60 * 60 * 1000);
    const started = Date.now();

    // Faol foydalanuvchilar
    const users = await prisma.userProfile.findMany({
        where: {
            OR: [
                { lastSeenAt: { gt: since } },
                { lastLoginAt: { gt: since } },
            ],
        },
        select: { id: true },
        take: 5000,     // katta hajm chegarasi
    });

    let ok = 0, fail = 0;
    // Batch bo'yicha parallel ishlash
    for (let i = 0; i < users.length; i += PARALLEL) {
        const batch = users.slice(i, i + PARALLEL);
        const results = await Promise.allSettled(
            batch.map(u => aggregateUserSignals(u.id)),
        );
        for (const r of results) {
            if (r.status === "fulfilled" && r.value) ok++;
            else fail++;
        }
        // 50 tadan keyin qisqa pauza — DB'ni pressiyaga tushirmaslik
        if (i > 0 && i % BATCH_SIZE === 0) {
            await new Promise(r => setTimeout(r, 200));
        }
    }

    return NextResponse.json({
        ok: true,
        totalUsers: users.length,
        aggregated: ok,
        failed: fail,
        tookMs: Date.now() - started,
    });
}
