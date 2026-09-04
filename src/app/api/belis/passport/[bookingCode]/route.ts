// Passport rasmni proxy — client hech qachon xom blob URL'ni ko'rmaydi.
// Faqat booking egasi (buyerId) yoki admin/founder ko'ra oladi.
//
// GET /api/belis/passport/BEL-2026-00001
//   → 200 image bytes (Content-Type original)
//   → 401 auth yo'q
//   → 403 boshqa mijoz ko'rmoqchi
//   → 404 booking yoki rasm topilmadi

import { NextResponse } from "next/server";
import { getBelisAuth } from "@/lib/belis-auth";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
    _req: Request,
    { params }: { params: Promise<{ bookingCode: string }> },
) {
    const auth = await getBelisAuth();
    if (!auth) return NextResponse.json({ error: "auth_required" }, { status: 401 });

    const { bookingCode } = await params;
    const code = String(bookingCode ?? "").toUpperCase().slice(0, 40);
    if (!code) return NextResponse.json({ error: "code_required" }, { status: 400 });

    const booking = await prisma.belisRentalBooking.findUnique({
        where: { code },
        select: { buyerId: true, passportUrl: true },
    });
    if (!booking) return NextResponse.json({ error: "not_found" }, { status: 404 });
    if (!booking.passportUrl) return NextResponse.json({ error: "no_passport" }, { status: 404 });

    // Ega yoki admin
    if (booking.buyerId !== auth.profileId && !auth.isAdmin) {
        return NextResponse.json({ error: "forbidden" }, { status: 403 });
    }

    // Blob'dan olib streamlaymiz. Kesh saqlanmasin (private data).
    const upstream = await fetch(booking.passportUrl, { cache: "no-store" });
    if (!upstream.ok || !upstream.body) {
        return NextResponse.json({ error: "upstream_failed" }, { status: 502 });
    }

    return new Response(upstream.body, {
        status: 200,
        headers: {
            "Content-Type": upstream.headers.get("Content-Type") ?? "image/jpeg",
            "Cache-Control": "private, no-store, max-age=0",
            "X-Content-Type-Options": "nosniff",
            // Rasm faqat ilova ichida ko'rinsin — tashqi joyga embed qilinmasin
            "Content-Security-Policy": "default-src 'none'; img-src 'self'",
        },
    });
}
