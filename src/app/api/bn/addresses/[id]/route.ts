// Manzil PATCH / DELETE — faqat egasi.

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireBnAuth } from "@/lib/bn-auth";

export async function PATCH(
    req: Request,
    { params }: { params: Promise<{ id: string }> },
) {
    const auth = await requireBnAuth();
    if (auth instanceof NextResponse) return auth;
    const { id } = await params;

    const existing = await prisma.bnAddress.findUnique({ where: { id } });
    if (!existing || existing.profileId !== auth.profileId) {
        return NextResponse.json({ error: "not_found" }, { status: 404 });
    }

    const b = await req.json().catch(() => ({}));
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const data: any = {};
    if (typeof b?.label === "string")   data.label = b.label.trim().slice(0, 40);
    if (typeof b?.address === "string") data.address = b.address.trim().slice(0, 200);
    if (typeof b?.phone === "string")   data.phone = b.phone.trim();
    if (typeof b?.city === "string")    data.city = b.city.trim() || "Toshkent";
    if (typeof b?.district === "string") data.district = b.district.trim() || null;
    if (typeof b?.landmark === "string") data.landmark = b.landmark.trim() || null;
    if (typeof b?.isDefault === "boolean") data.isDefault = b.isDefault;

    if (data.isDefault) {
        await prisma.bnAddress.updateMany({
            where: { profileId: auth.profileId, NOT: { id } },
            data:  { isDefault: false },
        });
    }

    const updated = await prisma.bnAddress.update({ where: { id }, data });
    return NextResponse.json({ ok: true, address: updated });
}

export async function DELETE(
    _req: Request,
    { params }: { params: Promise<{ id: string }> },
) {
    const auth = await requireBnAuth();
    if (auth instanceof NextResponse) return auth;
    const { id } = await params;

    const existing = await prisma.bnAddress.findUnique({ where: { id } });
    if (!existing || existing.profileId !== auth.profileId) {
        return NextResponse.json({ error: "not_found" }, { status: 404 });
    }
    await prisma.bnAddress.delete({ where: { id } });
    return NextResponse.json({ ok: true });
}
