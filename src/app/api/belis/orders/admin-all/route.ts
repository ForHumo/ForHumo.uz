// Admin — barcha buyurtmalarni ko'rish
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { requireBelisAdmin } from "@/lib/belis";

export async function GET() {
    const session = await getServerSession(authOptions);
    const gate = await requireBelisAdmin(session?.user?.email);
    if (!gate.ok) return NextResponse.json({ error: gate.error }, { status: gate.status });

    const items = await prisma.belisOrder.findMany({
        orderBy: [{ status: "asc" }, { createdAt: "desc" }],
        take: 200,
        include: { items: { select: { productName: true, quantity: true } } },
    });
    return NextResponse.json({ items });
}
