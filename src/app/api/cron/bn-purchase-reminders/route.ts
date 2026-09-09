// Kunlik cron — muddati yaqinlashgan (2 kun ichida) xaridlarga push yuboradi.
// Har xarid uchun boshqa do'kondagi eng arzon o'xshash mahsulotni topib qo'shadi.
// Ikki cheklov: har xarid uchun max 2 reminder, va 2-si 1-sidan >= 2 kun keyin.
//
// Shu bilan bir vaqtda: bugungi tug'ilgan kunchilarga qiziqishga qarab tavsiya.

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { findCheapestMatch } from "@/lib/bn-purchase";
import { sendPushToProfile } from "@/lib/push";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 60;

const REMIND_WINDOW_DAYS = 2;
const MAX_REMINDERS = 2;

export async function GET(req: Request) {
    // Vercel cron secret bilan himoya
    const auth = req.headers.get("authorization");
    if (process.env.CRON_SECRET && auth !== `Bearer ${process.env.CRON_SECRET}`) {
        return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }

    const [expiryStats, birthdayStats] = await Promise.all([
        runExpiryReminders(),
        runBirthdayRecommendations(),
    ]);
    return NextResponse.json({ ok: true, expiryStats, birthdayStats });
}

// ── Muddati yaqin xaridlar ──────────────────────────────────────────────────

async function runExpiryReminders() {
    const now = new Date();
    const cutoff = new Date(now.getTime() + REMIND_WINDOW_DAYS * 24 * 60 * 60 * 1000);
    const soonestReSend = new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000);

    // Yashiringan bo'lmagan, expiresAt kelayotgan xaridlar
    const items = await prisma.bnPurchase.findMany({
        where: {
            hidden: false,
            expiresAt: { gte: now, lte: cutoff },
            reminderCount: { lt: MAX_REMINDERS },
            OR: [
                { reminderSentAt: null },
                { reminderSentAt: { lt: soonestReSend } },
            ],
        },
        take: 300,
        include: {
            shop: { select: { id: true, name: true, market: { select: { name: true } } } },
        },
    });

    let sent = 0;
    let failed = 0;

    for (const p of items) {
        try {
            const daysLeft = Math.max(0, Math.round((p.expiresAt!.getTime() - now.getTime()) / (24 * 60 * 60 * 1000)));
            const cheaper = await findCheapestMatch(p.title, p.shopId, p.priceUzs || 999_999);

            const title = daysLeft <= 0
                ? `${p.title} — muddati bugun tugaydi`
                : `${p.title} — ${daysLeft} kun qoldi`;

            let body: string;
            let url: string;
            if (cheaper) {
                body = `Yangisi kerakmi? ${cheaper.shopName}${cheaper.marketName ? " · " + cheaper.marketName : ""} — ${formatSum(cheaper.price)} so'm (${cheaper.percentOff}% arzon).`;
                url = cheaper.url;
            } else {
                body = `Bozor Narxida'dan yangi variantni tekshiring.`;
                url = `https://bozornarxida.uz/qidiruv?q=${encodeURIComponent(p.title)}&utm_source=push&utm_medium=expiry`;
            }

            await sendPushToProfile(p.profileId, {
                title,
                body,
                url,
                tag: `bn-expiry:${p.id}`,
            });

            await prisma.bnPurchase.update({
                where: { id: p.id },
                data: {
                    reminderSentAt: now,
                    reminderCount: { increment: 1 },
                },
            });
            sent++;
        } catch (e) {
            console.error("[bn-expiry] fail", p.id, e);
            failed++;
        }
    }

    return { candidates: items.length, sent, failed };
}

// ── Tug'ilgan kun tavsiyalari ────────────────────────────────────────────────

async function runBirthdayRecommendations() {
    const today = new Date();
    const mm = today.getUTCMonth() + 1;
    const dd = today.getUTCDate();
    const year = today.getUTCFullYear();

    // Bugungi tug'ilgan kunchilar — DB'da birthday DATE (year field ham bor)
    const users = await prisma.$queryRaw<Array<{ id: string; name: string | null; profileId: string }>>`
        SELECT id, name, id as "profileId"
        FROM "UserProfile"
        WHERE EXTRACT(MONTH FROM birthday) = ${mm}
          AND EXTRACT(DAY FROM birthday) = ${dd}
        LIMIT 500
    `.catch(() => []);

    if (users.length === 0) return { candidates: 0, sent: 0, failed: 0 };

    // Yuborilgan foydalanuvchilarni chetlab o'tish
    const already = await prisma.bnBirthdayReminded.findMany({
        where: { year, profileId: { in: users.map(u => u.id) } },
        select: { profileId: true },
    });
    const alreadySet = new Set(already.map(a => a.profileId));

    let sent = 0;
    let failed = 0;

    for (const u of users) {
        if (alreadySet.has(u.id)) continue;
        try {
            // Xaridor qiziqishi (BnInterest) bo'yicha top-3 kategoriya
            const interest = await prisma.bnInterest.findUnique({
                where: { profileId: u.id },
                select: { categoryScores: true },
            }).catch(() => null);

            const catScores = (interest?.categoryScores ?? {}) as Record<string, number>;
            const catSlugs = Object.entries(catScores)
                .sort((a, b) => b[1] - a[1])
                .slice(0, 3)
                .map(([slug]) => slug);

            // Bugungi eng oldi mahsulotlarni ko'rish (yangi + qiziqishga mos)
            const products = await prisma.bnProduct.findMany({
                where: {
                    isActive: true, hidden: false,
                    ...(catSlugs.length ? { category: { slug: { in: catSlugs } } } : {}),
                },
                take: 3,
                orderBy: { updatedAt: "desc" },
                select: { slug: true, title: true, price: true },
            });

            const title = `Tug'ilgan kuningiz muborak, ${u.name ?? "aziz do'st"}!`;
            const body = products.length > 0
                ? `Sizga tavsiya: ${products.map(p => p.title).slice(0, 2).join(" · ")}`
                : `Bozor Narxida'dan bugungi eng arzon takliflarni ko'ring.`;

            const url = products[0]
                ? `https://bozornarxida.uz/p/${products[0].slug}?utm_source=push&utm_medium=birthday`
                : `https://bozornarxida.uz?utm_source=push&utm_medium=birthday`;

            await sendPushToProfile(u.id, {
                title,
                body,
                url,
                tag: `bn-birthday:${year}`,
            });

            await prisma.bnBirthdayReminded.create({
                data: { profileId: u.id, year },
            });
            sent++;
        } catch (e) {
            console.error("[bn-birthday] fail", u.id, e);
            failed++;
        }
    }

    return { candidates: users.length, sent, failed };
}

function formatSum(n: number): string {
    return new Intl.NumberFormat("uz-UZ").format(n);
}
