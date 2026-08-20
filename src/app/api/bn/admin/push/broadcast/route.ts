// BN admin — barcha (yoki segmentli) BN foydalanuvchilariga Web Push xabari.
// Faqat OWNER — bu kuchli marketing tools, MODERATOR ololmaydi.
// Rate limit: kuniga 3 broadcast (spam abuse'ni oldini olish).
//
//   POST /api/bn/admin/push/broadcast
//   body: { title, body, url?, tag?, segment?: "all" | "sellers" | "buyers" | "waitlist" }
//
// Audit: har broadcast BnAdminAction sifatida yozilishi kerak edi, lekin bunday
// model yo'q — hozircha console.log yetadi (Vercel loglariga tushadi).

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireBnAuth } from "@/lib/bn-auth";
import { isBnOwner } from "@/lib/bn-admin";
import { sendPushToProfile } from "@/lib/push";

export const dynamic = "force-dynamic";

const MAX_BROADCASTS_PER_DAY = 3;
// Broadcast counter — modul-scope memory (Vercel serverless: har instance alohida,
// lekin OWNER kam sonli — kelajakda Redis kerak bo'lsa moslashtiramiz)
const recentBroadcasts: number[] = [];   // timestamp[]

function purgeOld() {
    const dayAgo = Date.now() - 24 * 60 * 60 * 1000;
    while (recentBroadcasts.length && recentBroadcasts[0] < dayAgo) recentBroadcasts.shift();
}

export async function POST(req: Request) {
    const auth = await requireBnAuth();
    if (auth instanceof NextResponse) return auth;
    if (!(await isBnOwner(auth.profileId))) {
        return NextResponse.json({ error: "forbidden" }, { status: 403 });
    }

    purgeOld();
    if (recentBroadcasts.length >= MAX_BROADCASTS_PER_DAY) {
        return NextResponse.json({ error: "too_many_broadcasts" }, { status: 429 });
    }

    const b = await req.json().catch(() => ({}));
    const title = typeof b?.title === "string" ? b.title.trim().slice(0, 60) : "";
    const body = typeof b?.body === "string" ? b.body.trim().slice(0, 200) : "";
    const url = typeof b?.url === "string" ? b.url.trim().slice(0, 300) : undefined;
    const tag = typeof b?.tag === "string" ? b.tag.trim().slice(0, 40) : `bn-broadcast-${Date.now()}`;
    const segment = (["all", "sellers", "buyers", "waitlist"].includes(b?.segment) ? b.segment : "all") as
        "all" | "sellers" | "buyers" | "waitlist";

    if (title.length < 3 || body.length < 5) {
        return NextResponse.json({ error: "invalid_content" }, { status: 400 });
    }

    // Segmentga qarab profileId'larni yig'amiz
    let profileIds: string[] = [];
    if (segment === "all") {
        const subs = await prisma.nexusPushSub.findMany({
            select: { profileId: true }, distinct: ["profileId"],
        });
        profileIds = subs.map(s => s.profileId);
    } else if (segment === "sellers") {
        const shops = await prisma.bnShop.findMany({
            where: { status: "APPROVED" }, select: { profileId: true }, distinct: ["profileId"],
        });
        profileIds = shops.map(s => s.profileId);
    } else if (segment === "buyers") {
        const orders = await prisma.bnOrder.findMany({
            where: { status: "COMPLETED" }, select: { buyerId: true }, distinct: ["buyerId"],
        });
        profileIds = orders.map(o => o.buyerId);
    } else if (segment === "waitlist") {
        // Waitlist telefon bilan yozilgan — profileId'ni topish uchun email/username
        // orqali qidirish qiyin. Hozircha waitlist ichidan chiquvchilar
        // yozilgan tomonda profil yo'q — bo'sh qaytadi.
        profileIds = [];
    }

    if (profileIds.length === 0) {
        return NextResponse.json({ error: "no_recipients", segment }, { status: 400 });
    }

    // Rate limit ro'yxatga qo'shamiz
    recentBroadcasts.push(Date.now());

    // Push yuborish parallel — Promise.all ichida har biriga sendPushToProfile
    // (u ichida fail-safe, xato bo'lsa jim o'tadi)
    const startedAt = Date.now();
    await Promise.all(profileIds.map(id => sendPushToProfile(id, { title, body, url, tag })));
    const took = Date.now() - startedAt;

    console.log(`[bn-broadcast] owner=${auth.profileId} segment=${segment} recipients=${profileIds.length} took=${took}ms`);

    return NextResponse.json({
        ok: true,
        recipients: profileIds.length,
        segment,
        tookMs: took,
        remainingToday: MAX_BROADCASTS_PER_DAY - recentBroadcasts.length,
    });
}

export async function GET() {
    const auth = await requireBnAuth();
    if (auth instanceof NextResponse) return auth;
    if (!(await isBnOwner(auth.profileId))) {
        return NextResponse.json({ error: "forbidden" }, { status: 403 });
    }
    purgeOld();
    // Segment ko'lami — UI'da preview uchun
    const [allSubs, sellers, buyers] = await Promise.all([
        prisma.nexusPushSub.findMany({ select: { profileId: true }, distinct: ["profileId"] }),
        prisma.bnShop.findMany({ where: { status: "APPROVED" }, select: { profileId: true }, distinct: ["profileId"] }),
        prisma.bnOrder.findMany({ where: { status: "COMPLETED" }, select: { buyerId: true }, distinct: ["buyerId"] }),
    ]);
    return NextResponse.json({
        segments: {
            all: allSubs.length,
            sellers: sellers.length,
            buyers: buyers.length,
        },
        rateLimit: {
            max: MAX_BROADCASTS_PER_DAY,
            used: recentBroadcasts.length,
            remaining: MAX_BROADCASTS_PER_DAY - recentBroadcasts.length,
        },
    });
}
