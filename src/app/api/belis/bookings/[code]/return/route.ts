// Admin — mijoz qaytardi (return belgilash + damage report).
// POST /api/belis/bookings/[code]/return
//   body: {
//     ok: boolean,             // true = butun qaytdi (RETURNED_OK), false = zarar (RETURNED_DAMAGE)
//     damageReport?: string,
//     damageImages?: string[],
//     fineUzs?: number,        // shtraf (kechikish + zarar)
//     refundedUzs?: number,    // zaklatdan qaytarilgan (agar bo'lsa)
//   }
// Faqat PICKED_UP/LATE → RETURNED_OK/RETURNED_DAMAGE.

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireBelisAdmin } from "@/lib/belis-auth";
import { calcLateFine } from "@/lib/belis-booking";

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
            returnDate: true, paidDeposit: true,
        },
    });
    if (!b) return NextResponse.json({ error: "not_found" }, { status: 404 });
    if (!["PICKED_UP", "LATE"].includes(b.status)) {
        return NextResponse.json({ error: "invalid_transition", from: b.status }, { status: 409 });
    }

    const now = new Date();
    // Kechikish shtraf avto-hisoblanadi
    const lateFine = calcLateFine(b.returnDate, now, b.rentDailyUzs);
    const totalFine = ok ? lateFine : (lateFine + manualFine);

    // Zaklat qaytarish: to'langan zaklatdan shtraf ayirilgan qism
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

    return NextResponse.json({
        ok: true,
        lateFine,
        manualFine,
        totalFine,
        refunded,
    });
}
