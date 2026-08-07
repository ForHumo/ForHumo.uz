// Xaridor holdni bekor qiladi. Stok qaytariladi.

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireBnAuth } from "@/lib/bn-auth";

export async function POST(
    _req: Request,
    { params }: { params: Promise<{ code: string }> },
) {
    const auth = await requireBnAuth();
    if (auth instanceof NextResponse) return auth;
    const { code } = await params;

    const hold = await prisma.bnInspectHold.findUnique({ where: { code } });
    if (!hold || hold.profileId !== auth.profileId) {
        return NextResponse.json({ error: "not_found" }, { status: 404 });
    }
    if (hold.usedAt || hold.cancelledAt) {
        return NextResponse.json({ error: "already_closed" }, { status: 409 });
    }

    await prisma.$transaction(async (tx) => {
        await tx.bnInspectHold.update({
            where: { id: hold.id },
            data:  { cancelledAt: new Date() },
        });
        await tx.bnProduct.update({
            where: { id: hold.productId },
            data:  { stock: { increment: hold.qty } },
        });
    });

    return NextResponse.json({ ok: true });
}
