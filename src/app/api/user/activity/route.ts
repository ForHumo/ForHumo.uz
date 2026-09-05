// Cross-modul aktivlik feed — so'nggi 30 kunlik aralash harakatlar.
//
//   GET /api/user/activity?limit=20
//
// BN buyurtma, Belis booking, Pay tx, Support ticket, Nexus notification —
// hammasi bir chronological ro'yxatda.

import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

interface Item {
    id: string;
    kind: "bn_order" | "belis_booking" | "pay_tx" | "support_ticket" | "nexus_notif" | "market_order";
    title: string;
    subtitle?: string;
    amount?: number;
    currency?: string;
    status?: string;
    href?: string;
    at: string;
}

export async function GET(req: Request) {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) return NextResponse.json({ error: "auth_required" }, { status: 401 });

    const profile = await prisma.userProfile.findUnique({
        where: { email: session.user.email }, select: { id: true },
    });
    if (!profile) return NextResponse.json({ error: "profile_not_found" }, { status: 404 });

    const { searchParams } = new URL(req.url);
    const limit = Math.min(50, Math.max(5, Number(searchParams.get("limit")) || 20));

    const [bnOrders, belisBookings, payTx, supportTix, nexusNotifs] = await Promise.all([
        prisma.bnOrder.findMany({
            where: { buyerId: profile.id },
            select: { id: true, code: true, status: true, total: true, placedAt: true, shop: { select: { name: true } } },
            orderBy: { placedAt: "desc" },
            take: limit,
        }),
        prisma.belisRentalBooking.findMany({
            where: { buyerId: profile.id },
            select: { id: true, code: true, status: true, eventDate: true, createdAt: true, komplekt: { select: { nameUz: true } } },
            orderBy: { createdAt: "desc" },
            take: limit,
        }).catch(() => []),
        prisma.walletTransaction.findMany({
            where: { wallet: { profileId: profile.id } },
            select: { id: true, type: true, amount: true, currency: true, description: true, createdAt: true },
            orderBy: { createdAt: "desc" },
            take: limit,
        }).catch(() => []),
        prisma.supportTicket.findMany({
            where: { profileId: profile.id },
            select: { id: true, subject: true, status: true, updatedAt: true },
            orderBy: { updatedAt: "desc" },
            take: 5,
        }),
        prisma.nexusNotification.findMany({
            where: { recipientId: profile.id },
            select: { id: true, type: true, postId: true, videoId: true, createdAt: true },
            orderBy: { createdAt: "desc" },
            take: 10,
        }).catch(() => []),
    ]);

    const items: Item[] = [];

    for (const o of bnOrders) {
        items.push({
            id: `bn-${o.id}`,
            kind: "bn_order",
            title: `Buyurtma ${o.code}`,
            subtitle: o.shop?.name || "Bozor Narxida",
            amount: o.total,
            currency: "UZS",
            status: o.status,
            href: `/kabinet/buyurtma`,
            at: o.placedAt.toISOString(),
        });
    }
    for (const b of belisBookings) {
        items.push({
            id: `bel-${b.id}`,
            kind: "belis_booking",
            title: `Belis: ${b.code}`,
            subtitle: b.komplekt?.nameUz || "Ijara",
            status: b.status,
            href: `/belis/booking/${b.code}`,
            at: b.createdAt.toISOString(),
        });
    }
    for (const t of payTx) {
        items.push({
            id: `pay-${t.id}`,
            kind: "pay_tx",
            title: t.description || t.type,
            subtitle: `To'lov`,
            amount: Number(t.amount),
            currency: t.currency,
            href: `/pay`,
            at: t.createdAt.toISOString(),
        });
    }
    for (const s of supportTix) {
        items.push({
            id: `sup-${s.id}`,
            kind: "support_ticket",
            title: s.subject,
            subtitle: "Support",
            status: s.status,
            href: `/support`,
            at: s.updatedAt.toISOString(),
        });
    }
    const NOTIF_LABEL: Record<string, string> = {
        LIKE: "Postingizga like", COMMENT: "Yangi izoh", REPLY: "Izohga javob", FOLLOW: "Yangi obunachi",
        VIDEO_LIKE: "Videoga like", VIDEO_COMMENT: "Videoga izoh", TRACK_LIKE: "Trekka like",
        PURCHASE: "Xarid qilindi", LIVE: "Jonli efir", SUPPORT: "Support javob", CALL_MISSED: "O'tkazib yuborilgan chaqiruv",
    };
    for (const n of nexusNotifs) {
        items.push({
            id: `nx-${n.id}`,
            kind: "nexus_notif",
            title: NOTIF_LABEL[n.type] || String(n.type),
            subtitle: "Nexus",
            href: n.postId ? `/nexus/p/${n.postId}` : n.videoId ? `/nexus/v/${n.videoId}` : `/nexus`,
            at: n.createdAt.toISOString(),
        });
    }

    // Sort by time desc, take limit
    items.sort((a, b) => (a.at < b.at ? 1 : -1));
    const trimmed = items.slice(0, limit);

    return NextResponse.json({ items: trimmed });
}
