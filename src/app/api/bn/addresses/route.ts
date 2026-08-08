// Xaridor manzillar kitobchasi. Checkout uchun.
//   GET  /api/bn/addresses
//   POST /api/bn/addresses  { label, address, phone, city?, district?, landmark?, isDefault? }

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireBnAuth } from "@/lib/bn-auth";

export async function GET() {
    const auth = await requireBnAuth();
    if (auth instanceof NextResponse) return auth;
    const items = await prisma.bnAddress.findMany({
        where: { profileId: auth.profileId },
        orderBy: [{ isDefault: "desc" }, { createdAt: "desc" }],
    });
    return NextResponse.json({ items });
}

export async function POST(req: Request) {
    const auth = await requireBnAuth();
    if (auth instanceof NextResponse) return auth;
    const b = await req.json().catch(() => ({}));

    const label   = String(b?.label ?? "Manzil").trim().slice(0, 40) || "Manzil";
    const address = String(b?.address ?? "").trim().slice(0, 200);
    const phone   = String(b?.phone ?? "").trim();
    const city    = String(b?.city ?? "Toshkent").trim() || "Toshkent";
    const district = String(b?.district ?? "").trim() || null;
    const landmark = String(b?.landmark ?? "").trim().slice(0, 120) || null;
    const isDefault = !!b?.isDefault;
    // Xarita koordinatalari (ixtiyoriy, lekin kuryer uchun juda muhim)
    const latitude  = typeof b?.latitude === "number" ? b.latitude : null;
    const longitude = typeof b?.longitude === "number" ? b.longitude : null;

    if (address.length < 5) return NextResponse.json({ error: "address_short" }, { status: 400 });
    if (phone.replace(/\D/g, "").length < 9) return NextResponse.json({ error: "phone_invalid" }, { status: 400 });

    if (isDefault) {
        await prisma.bnAddress.updateMany({
            where: { profileId: auth.profileId },
            data:  { isDefault: false },
        });
    }

    const created = await prisma.bnAddress.create({
        data: { profileId: auth.profileId, label, address, phone, city, district, landmark, isDefault, latitude, longitude },
    });
    return NextResponse.json({ ok: true, address: created });
}
