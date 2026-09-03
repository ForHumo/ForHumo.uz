// Booking bekor qilish — mijoz (o'z bookingini) yoki admin.
// POST /api/belis/bookings/[code]/cancel  { reason?: string }
//
// Ruxsat: faqat REQUESTED yoki CONFIRMED statusda (PICKED_UP dan keyin admin bekor qiladi).

import { NextResponse, after } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireBelisAuth } from "@/lib/belis-auth";
import { belisPush, belisPushAdmins } from "@/lib/belis-notify";

export async function POST(req: Request, { params }: { params: Promise<{ code: string }> }) {
    const auth = await requireBelisAuth();
    if (auth instanceof NextResponse) return auth;
    const { code } = await params;

    const body = await req.json().catch(() => ({}));
    const reason = String(body?.reason ?? "").trim().slice(0, 300) || null;

    const b = await prisma.belisRentalBooking.findUnique({
        where: { code },
        select: { id: true, buyerId: true, status: true },
    });
    if (!b) return NextResponse.json({ error: "not_found" }, { status: 404 });

    const isOwner = b.buyerId === auth.profileId;
    if (!isOwner && !auth.isAdmin) return NextResponse.json({ error: "forbidden" }, { status: 403 });

    // Mijoz faqat REQUESTED/CONFIRMED bekor qila oladi
    // Admin PICKED_UP dan keyin ham (masalan mijoz kelmasa)
    if (!auth.isAdmin && !["REQUESTED", "CONFIRMED"].includes(b.status)) {
        return NextResponse.json({ error: "not_cancellable", status: b.status }, { status: 409 });
    }
    if (["CANCELLED", "RETURNED_OK", "RETURNED_DAMAGE"].includes(b.status)) {
        return NextResponse.json({ error: "already_terminal", status: b.status }, { status: 409 });
    }

    await prisma.belisRentalBooking.update({
        where: { id: b.id },
        data: {
            status: "CANCELLED",
            cancelledAt: new Date(),
            cancelReason: reason ?? (isOwner ? "Mijoz bekor qildi" : "Admin bekor qildi"),
        },
    });

    after(async () => {
        if (isOwner) {
            // Mijoz o'zi bekor qildi → adminga xabar
            await belisPushAdmins({
                title: "Belis: buyurtma bekor qilindi",
                body: `#${code} · Mijoz: ${reason ?? "sababsiz"}`,
                link: `/admin/bookings/${code}`,
                tag: `belis:cancel:${code}`,
            });
        } else {
            // Admin bekor qildi → mijozga xabar
            await belisPush(b.buyerId, {
                title: "Buyurtmangiz bekor qilindi",
                body: `#${code}${reason ? ` · Sabab: ${reason}` : ""}`,
                link: `/buyurtma/${code}`,
                tag: `belis:cancel:${code}`,
            });
        }
    });

    return NextResponse.json({ ok: true });
}
