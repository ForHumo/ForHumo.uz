// Sotuvchi o'z do'koni sozlamalarini tahrir qiladi.
//
//   PATCH /api/bn/seller/shop  { name?, description?, logoUrl?, coverUrl?, phone?, workHours?, address? }

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireBnAuth } from "@/lib/bn-auth";

export async function PATCH(req: Request) {
    const auth = await requireBnAuth();
    if (auth instanceof NextResponse) return auth;

    const shop = await prisma.bnShop.findUnique({
        where: { profileId: auth.profileId }, select: { id: true, status: true },
    });
    if (!shop) return NextResponse.json({ error: "no_shop" }, { status: 404 });

    const b = await req.json().catch(() => ({}));
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const data: any = {};
    if (typeof b?.name === "string" && b.name.trim().length >= 2) data.name = b.name.trim().slice(0, 80);
    if (typeof b?.description === "string") data.description = b.description.trim().slice(0, 500) || null;
    if (typeof b?.logoUrl === "string")  data.logoUrl = b.logoUrl || null;
    if (typeof b?.coverUrl === "string") data.coverUrl = b.coverUrl || null;
    if (typeof b?.phone === "string" && b.phone.replace(/\D/g, "").length >= 9) data.phone = b.phone.trim();
    if (typeof b?.workHours === "string") data.workHours = b.workHours.trim().slice(0, 120) || null;
    if (typeof b?.address === "string") data.address = b.address.trim().slice(0, 200) || null;

    const updated = await prisma.bnShop.update({ where: { id: shop.id }, data });
    return NextResponse.json({ ok: true, shop: updated });
}
