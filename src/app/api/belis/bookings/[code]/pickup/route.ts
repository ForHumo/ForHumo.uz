// Admin — mijoz olib ketdi (pickup belgilash).
// POST /api/belis/bookings/[code]/pickup  { paidRent?: number, paidDeposit?: number }
// Faqat CONFIRMED → PICKED_UP.

import { NextResponse, after } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireBelisAdmin } from "@/lib/belis-auth";
import { belisPush } from "@/lib/belis-notify";

export async function POST(req: Request, { params }: { params: Promise<{ code: string }> }) {
    const auth = await requireBelisAdmin();
    if (auth instanceof NextResponse) return auth;
    const { code } = await params;

    const body = await req.json().catch(() => ({}));
    const paidRent = Math.max(0, Math.floor(Number(body?.paidRent) || 0));
    const paidDeposit = Math.max(0, Math.floor(Number(body?.paidDeposit) || 0));

    const b = await prisma.belisRentalBooking.findUnique({
        where: { code },
        select: { id: true, status: true, rentTotalUzs: true, depositUzs: true, buyerId: true, returnDate: true },
    });
    if (!b) return NextResponse.json({ error: "not_found" }, { status: 404 });
    if (b.status !== "CONFIRMED") {
        return NextResponse.json({ error: "invalid_transition", from: b.status, to: "PICKED_UP" }, { status: 409 });
    }

    await prisma.belisRentalBooking.update({
        where: { id: b.id },
        data: {
            status: "PICKED_UP",
            paidRent: paidRent > 0 ? paidRent : b.rentTotalUzs,          // default: to'liq to'landi
            paidDeposit: paidDeposit > 0 ? paidDeposit : b.depositUzs,   // default: to'liq zaklat
        },
    });

    after(async () => {
        await belisPush(b.buyerId, {
            title: "Buyurtma qabul qilindi",
            body: `#${code} · Qaytish sanasi: ${b.returnDate.toLocaleDateString("uz-UZ")}`,
            link: `/buyurtma/${code}`,
            tag: `belis:pickup:${code}`,
        });
    });

    return NextResponse.json({ ok: true });
}
