// BN admin — barcha (yoki segmentli) BN foydalanuvchilariga Web Push xabari.
// Faqat OWNER — bu kuchli marketing tools, MODERATOR ololmaydi.
// Rate limit: kuniga 3 broadcast — DB'dagi BnBroadcast count'idan hisoblanadi
// (serverless cold start bardosh). Har yuborilgan xabar audit uchun yozib qo'yiladi.
//
//   POST /api/bn/admin/push/broadcast
//   body: { title, body, url?, tag?, segment?: "all" | "sellers" | "buyers" }
//   GET  /api/bn/admin/push/broadcast  — segment ko'lami + rate limit holati.

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireBnAuth } from "@/lib/bn-auth";
import { isBnOwner } from "@/lib/bn-admin";
import { sendPushToProfile } from "@/lib/push";

export const dynamic = "force-dynamic";

const MAX_BROADCASTS_PER_DAY = 3;

async function usedTodayCount(): Promise<number> {
    const dayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    return prisma.bnBroadcast.count({ where: { createdAt: { gte: dayAgo } } }).catch(() => 0);
}

export async function POST(req: Request) {
    const auth = await requireBnAuth();
    if (auth instanceof NextResponse) return auth;
    if (!(await isBnOwner(auth.profileId))) {
        return NextResponse.json({ error: "forbidden" }, { status: 403 });
    }

    const used = await usedTodayCount();
    if (used >= MAX_BROADCASTS_PER_DAY) {
        return NextResponse.json({ error: "too_many_broadcasts" }, { status: 429 });
    }

    const b = await req.json().catch(() => ({}));
    const title = typeof b?.title === "string" ? b.title.trim().slice(0, 60) : "";
    const body = typeof b?.body === "string" ? b.body.trim().slice(0, 200) : "";
    const url = typeof b?.url === "string" ? b.url.trim().slice(0, 300) : undefined;
    const tag = typeof b?.tag === "string" ? b.tag.trim().slice(0, 40) : `bn-broadcast-${Date.now()}`;
    const segment = (["all", "sellers", "buyers"].includes(b?.segment) ? b.segment : "all") as
        "all" | "sellers" | "buyers";

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
    }

    if (profileIds.length === 0) {
        return NextResponse.json({ error: "no_recipients", segment }, { status: 400 });
    }

    // Avval audit yozuvi (broadcast id kerak — push payload'iga trackClickPath uchun)
    const startedAt = Date.now();
    const record = await prisma.bnBroadcast.create({
        data: {
            ownerId: auth.profileId,
            title, body, url: url ?? null, tag,
            segment, recipients: profileIds.length, tookMs: 0,
        },
        select: { id: true, createdAt: true },
    }).catch(() => null);

    const trackClickPath = record ? `/api/bn/track/broadcast-click/${record.id}` : undefined;

    // Push yuborish — parallel, per-user xato butun oqimni to'xtatmaydi
    await Promise.all(profileIds.map(id =>
        sendPushToProfile(id, { title, body, url, tag, trackClickPath })
    ));
    const took = Date.now() - startedAt;

    // tookMs'ni to'g'ri qiymat bilan yangilaymiz
    if (record) {
        await prisma.bnBroadcast.update({
            where: { id: record.id },
            data: { tookMs: took },
        }).catch(() => { /* jim */ });
    }

    console.log(`[bn-broadcast] owner=${auth.profileId} segment=${segment} recipients=${profileIds.length} took=${took}ms id=${record?.id ?? "n/a"}`);

    return NextResponse.json({
        ok: true,
        id: record?.id ?? null,
        recipients: profileIds.length,
        segment,
        tookMs: took,
        remainingToday: MAX_BROADCASTS_PER_DAY - (used + 1),
    });
}

export async function GET() {
    const auth = await requireBnAuth();
    if (auth instanceof NextResponse) return auth;
    if (!(await isBnOwner(auth.profileId))) {
        return NextResponse.json({ error: "forbidden" }, { status: 403 });
    }
    const [allSubs, sellers, buyers, used] = await Promise.all([
        prisma.nexusPushSub.findMany({ select: { profileId: true }, distinct: ["profileId"] }),
        prisma.bnShop.findMany({ where: { status: "APPROVED" }, select: { profileId: true }, distinct: ["profileId"] }),
        prisma.bnOrder.findMany({ where: { status: "COMPLETED" }, select: { buyerId: true }, distinct: ["buyerId"] }),
        usedTodayCount(),
    ]);
    return NextResponse.json({
        segments: {
            all: allSubs.length,
            sellers: sellers.length,
            buyers: buyers.length,
        },
        rateLimit: {
            max: MAX_BROADCASTS_PER_DAY,
            used,
            remaining: MAX_BROADCASTS_PER_DAY - used,
        },
    });
}
