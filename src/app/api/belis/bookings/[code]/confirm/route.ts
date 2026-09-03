// Admin (@sevinch) yangi arizani tasdiqlash.
// POST /api/belis/bookings/[code]/confirm
// Faqat REQUESTED → CONFIRMED.

import { NextResponse, after } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireBelisAdmin } from "@/lib/belis-auth";
import { belisPush } from "@/lib/belis-notify";

export async function POST(_req: Request, { params }: { params: Promise<{ code: string }> }) {
    const auth = await requireBelisAdmin();
    if (auth instanceof NextResponse) return auth;
    const { code } = await params;

    const b = await prisma.belisRentalBooking.findUnique({
        where: { code },
        select: { id: true, status: true, buyerId: true, pickupDate: true },
    });
    if (!b) return NextResponse.json({ error: "not_found" }, { status: 404 });
    if (b.status !== "REQUESTED") {
        return NextResponse.json({ error: "invalid_transition", from: b.status, to: "CONFIRMED" }, { status: 409 });
    }

    await prisma.belisRentalBooking.update({
        where: { id: b.id },
        data: {
            status: "CONFIRMED",
            confirmedAt: new Date(),
            confirmedById: auth.profileId,
        },
    });

    after(async () => {
        await belisPush(b.buyerId, {
            title: "Arizangiz tasdiqlandi",
            body: `#${code} · Olib ketish: ${b.pickupDate.toLocaleDateString("uz-UZ")}`,
            link: `/buyurtma/${code}`,
            tag: `belis:confirm:${code}`,
        });
    });

    return NextResponse.json({ ok: true });
}
