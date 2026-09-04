// Belis booking detail — mijoz o'z bookingini ko'radi (admin barchasini).
// GET /api/belis/bookings/[code]

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireBelisAuth } from "@/lib/belis-auth";

export const dynamic = "force-dynamic";

export async function GET(_req: Request, { params }: { params: Promise<{ code: string }> }) {
    const auth = await requireBelisAuth();
    if (auth instanceof NextResponse) return auth;
    const { code } = await params;

    const b = await prisma.belisRentalBooking.findUnique({
        where: { code },
        include: {
            komplekt: {
                select: {
                    slug: true, kind: true,
                    nameUz: true, nameRu: true, nameEn: true,
                    images: true, itemsCount: true,
                    items: {
                        select: { slug: true, kind: true, nameUz: true, nameRu: true, nameEn: true, images: true },
                    },
                },
            },
            itemBookings: {
                include: {
                    item: { select: { slug: true, nameUz: true, nameRu: true, nameEn: true, images: true } },
                },
            },
        },
    });

    if (!b) return NextResponse.json({ error: "not_found" }, { status: 404 });

    // Faqat egasi yoki admin ko'ra oladi
    if (b.buyerId !== auth.profileId && !auth.isAdmin) {
        return NextResponse.json({ error: "forbidden" }, { status: 403 });
    }

    // Xaridor Humo ID chip uchun (admin ko'radi)
    const buyerProfile = auth.isAdmin || b.buyerId === auth.profileId
        ? await prisma.userProfile.findUnique({
            where: { id: b.buyerId },
            select: { username: true, humoId: true, image: true, emailVerified: true },
        })
        : null;

    return NextResponse.json({
        id: b.id,
        code: b.code,
        status: b.status,
        buyerName: b.buyerName,
        buyerPhone: b.buyerPhone,
        buyer: buyerProfile ? {
            username: buyerProfile.username,
            humoId: buyerProfile.humoId,
            image: buyerProfile.image,
            verified: !!buyerProfile.emailVerified,
        } : null,
        // Pasport rasm faqat egasi yoki adminga — proxy orqali (xom blob URL clientga tushmasin)
        passportUrl: (b.buyerId === auth.profileId || auth.isAdmin) && b.passportUrl
            ? `/api/belis/passport/${b.code}`
            : null,
        passportSeries: (b.buyerId === auth.profileId || auth.isAdmin) ? b.passportSeries : null,
        contractUrl: b.contractUrl,
        eventDate: b.eventDate.toISOString(),
        pickupDate: b.pickupDate.toISOString(),
        returnDate: b.returnDate.toISOString(),
        actualReturnedAt: b.actualReturnedAt?.toISOString() ?? null,
        komplekt: b.komplekt,
        itemBookings: b.itemBookings.map(ib => ({
            qty: ib.qty,
            item: ib.item,
        })),
        rentDailyUzs: b.rentDailyUzs,
        daysCount: b.daysCount,
        rentTotalUzs: b.rentTotalUzs,
        depositUzs: b.depositUzs,
        paidRent: b.paidRent,
        paidDeposit: b.paidDeposit,
        fulfillType: b.fulfillType,
        address: b.address,
        note: b.note,
        damageReport: b.damageReport,
        damageImages: b.damageImages,
        fineUzs: b.fineUzs,
        refundedUzs: b.refundedUzs,
        cancelReason: b.cancelReason,
        createdAt: b.createdAt.toISOString(),
        confirmedAt: b.confirmedAt?.toISOString() ?? null,
        cancelledAt: b.cancelledAt?.toISOString() ?? null,
    });
}
