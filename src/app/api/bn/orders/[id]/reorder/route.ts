// Buyurtmani savatga qayta qo'shish — buyurtma tafsilotidagi "Yana buyurtma".
// Faqat egasi. Barcha itemlar savatga upsert bo'ladi (qty ortadi).

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireBnAuth } from "@/lib/bn-auth";

export async function POST(
    _req: Request,
    { params }: { params: Promise<{ id: string }> },
) {
    const auth = await requireBnAuth();
    if (auth instanceof NextResponse) return auth;
    const { id } = await params;

    const order = await prisma.bnOrder.findUnique({
        where: { id },
        include: { items: true },
    });
    if (!order || order.buyerId !== auth.profileId) {
        return NextResponse.json({ error: "not_found" }, { status: 404 });
    }

    let added = 0;
    let skipped = 0;
    for (const it of order.items) {
        const p = await prisma.bnProduct.findUnique({
            where: { id: it.productId },
            select: { id: true, stock: true, isActive: true, hidden: true },
        });
        if (!p || !p.isActive || p.hidden || p.stock < 1) { skipped++; continue; }

        try {
            await prisma.bnCartItem.upsert({
                where: { profileId_productId: { profileId: auth.profileId, productId: it.productId } },
                update: { qty: { increment: Math.min(it.qty, p.stock) } },
                create: { profileId: auth.profileId, productId: it.productId, qty: Math.min(it.qty, p.stock) },
            });
            added++;
        } catch { skipped++; }
    }

    return NextResponse.json({ ok: true, added, skipped });
}
