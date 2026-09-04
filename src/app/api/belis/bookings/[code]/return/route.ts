// Admin — mijoz qaytardi (return belgilash + damage report).
// POST /api/belis/bookings/[code]/return
//   body: {
//     ok: boolean,             // true = butun qaytdi (RETURNED_OK), false = zarar (RETURNED_DAMAGE)
//     damageReport?: string,
//     damageImages?: string[],
//     fineUzs?: number,        // jarima (kechikish + zarar)
//     refundedUzs?: number,    // zaklatdan qaytarilgan (agar bo'lsa)
//   }
// Faqat PICKED_UP/LATE → RETURNED_OK/RETURNED_DAMAGE.

import { NextResponse, after } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireBelisAdmin } from "@/lib/belis-auth";
import { calcLateFine } from "@/lib/belis-booking";
import { belisPush } from "@/lib/belis-notify";

export async function POST(req: Request, { params }: { params: Promise<{ code: string }> }) {
    const auth = await requireBelisAdmin();
    if (auth instanceof NextResponse) return auth;
    const { code } = await params;

    const body = await req.json().catch(() => ({}));
    const ok = !!body?.ok;
    const damageReport = typeof body?.damageReport === "string" ? body.damageReport.trim().slice(0, 2000) : null;
    const damageImages = Array.isArray(body?.damageImages)
        ? body.damageImages.slice(0, 10).map((s: unknown) => String(s))
        : [];
    const manualFine = Math.max(0, Math.floor(Number(body?.fineUzs) || 0));

    const b = await prisma.belisRentalBooking.findUnique({
        where: { code },
        select: {
            id: true, status: true, rentDailyUzs: true, depositUzs: true,
            returnDate: true, paidDeposit: true, buyerId: true,
            paymentMethod: true, refundTxRef: true, fineTxRef: true,
        },
    });
    if (!b) return NextResponse.json({ error: "not_found" }, { status: 404 });
    if (!["PICKED_UP", "LATE"].includes(b.status)) {
        return NextResponse.json({ error: "invalid_transition", from: b.status }, { status: 409 });
    }

    const now = new Date();
    // Kechikish jarima avto-hisoblanadi
    const lateFine = calcLateFine(b.returnDate, now, b.rentDailyUzs);
    const totalFine = ok ? lateFine : (lateFine + manualFine);

    // Zaklat qaytarish: to'langan zaklatdan jarima ayirilgan qism
    const refunded = Math.max(0, b.paidDeposit - totalFine);

    await prisma.belisRentalBooking.update({
        where: { id: b.id },
        data: {
            status: ok ? "RETURNED_OK" : "RETURNED_DAMAGE",
            actualReturnedAt: now,
            damageReport,
            damageImages,
            fineUzs: totalFine,
            refundedUzs: refunded,
            returnedById: auth.profileId,
        },
    });

    // For Pay: WALLET bo'lsa zaklatni qaytarish + jarima @sevinch ga
    if (b.paymentMethod === "WALLET" && !b.refundTxRef && !b.fineTxRef) {
        const { refundBookingDeposit } = await import("@/lib/belis-payments");
        await refundBookingDeposit({
            bookingId: b.id,
            bookingCode: code,
            buyerProfileId: b.buyerId,
            depositAmount: b.paidDeposit,
            fineAmount: totalFine,
        });
    }

    after(async () => {
        const title = ok ? "Zaklat qaytariladi" : "Qaytish qabul qilindi (zarar)";
        const body = ok
            ? (totalFine > 0
                ? `#${code} · Kechikish jarima: ${totalFine.toLocaleString()} so'm · Qaytariladi: ${refunded.toLocaleString()} so'm`
                : `#${code} · Rahmat! Zaklat to'liq qaytariladi: ${refunded.toLocaleString()} so'm`)
            : `#${code} · Jarima: ${totalFine.toLocaleString()} so'm · Qaytariladi: ${refunded.toLocaleString()} so'm`;
        await belisPush(b.buyerId, {
            title,
            body,
            link: `/buyurtma/${code}`,
            tag: `belis:return:${code}`,
        });
    });

    return NextResponse.json({
        ok: true,
        lateFine,
        manualFine,
        totalFine,
        refunded,
    });
}
