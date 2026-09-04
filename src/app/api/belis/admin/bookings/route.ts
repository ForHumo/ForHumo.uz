// Admin — barcha bookinglar ro'yxati (filter va pagination bilan).
// GET /api/belis/admin/bookings?status=REQUESTED&skip=0&limit=20

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireBelisAdmin } from "@/lib/belis-auth";
import type { BelisBookingStatus } from "@prisma/client";

export const dynamic = "force-dynamic";

const ALLOWED_STATUS: BelisBookingStatus[] = [
    "REQUESTED", "CONFIRMED", "PICKED_UP",
    "RETURNED_OK", "RETURNED_DAMAGE", "LATE", "CANCELLED",
];

export async function GET(req: Request) {
    const auth = await requireBelisAdmin();
    if (auth instanceof NextResponse) return auth;

    const url = new URL(req.url);
    const statusParam = (url.searchParams.get("status") ?? "").toUpperCase();
    const skip = Math.max(0, Number(url.searchParams.get("skip") ?? "0") || 0);
    const limit = Math.min(100, Math.max(1, Number(url.searchParams.get("limit") ?? "30") || 30));

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const where: any = {};
    if (statusParam && ALLOWED_STATUS.includes(statusParam as BelisBookingStatus)) {
        where.status = statusParam;
    }

    // Kechikkan bookinglarni LATE ga o'tkazish (lazy migration — GET paytida)
    const now = new Date();
    const overdueLimit = new Date();
    overdueLimit.setDate(overdueLimit.getDate() - 1);
    await prisma.belisRentalBooking.updateMany({
        where: {
            status: "PICKED_UP",
            returnDate: { lt: overdueLimit },
        },
        data: { status: "LATE" },
    });
    void now;

    const bookings = await prisma.belisRentalBooking.findMany({
        where,
        orderBy: [
            { status: "asc" },     // REQUESTED birinchi
            { eventDate: "asc" },
        ],
        skip,
        take: limit,
        include: {
            komplekt: { select: { slug: true, nameUz: true, images: true } },
        },
    });

    // Xaridor Humo ID + username + verified ma'lumotini olib boyitamiz
    const buyerIds = [...new Set(bookings.map(b => b.buyerId))];
    const buyers = buyerIds.length ? await prisma.userProfile.findMany({
        where: { id: { in: buyerIds } },
        select: { id: true, username: true, humoId: true, image: true, emailVerified: true },
    }) : [];
    const buyerMap = new Map(buyers.map(b => [b.id, b]));

    return NextResponse.json({
        bookings: bookings.map(b => {
            const bp = buyerMap.get(b.buyerId) ?? null;
            return {
                id: b.id,
                code: b.code,
                status: b.status,
                buyerName: b.buyerName,
                buyerPhone: b.buyerPhone,
                buyer: bp ? {
                    username: bp.username,
                    humoId: bp.humoId,
                    image: bp.image,
                    verified: !!bp.emailVerified,
                } : null,
                eventDate: b.eventDate.toISOString(),
                pickupDate: b.pickupDate.toISOString(),
                returnDate: b.returnDate.toISOString(),
                rentTotalUzs: b.rentTotalUzs,
                depositUzs: b.depositUzs,
                paidRent: b.paidRent,
                paidDeposit: b.paidDeposit,
                fulfillType: b.fulfillType,
                address: b.address,
                komplekt: b.komplekt,
                fineUzs: b.fineUzs,
                refundedUzs: b.refundedUzs,
                // For Pay
                paymentMethod: b.paymentMethod,
                walletCurrency: b.walletCurrency,
                holdTxRef: b.holdTxRef,
                settleTxRef: b.settleTxRef,
                refundTxRef: b.refundTxRef,
                fineTxRef: b.fineTxRef,
                createdAt: b.createdAt.toISOString(),
            };
        }),
        hasMore: bookings.length === limit,
    });
}
