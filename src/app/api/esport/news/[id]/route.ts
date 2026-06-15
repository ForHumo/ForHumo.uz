import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getEsportAdmin } from "@/lib/esport";

// DELETE /api/esport/news/[id] — yangilikni o'chirish (admin)
export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    const admin = await getEsportAdmin();
    if (!admin) return NextResponse.json({ error: "Ruxsat yo'q" }, { status: 403 });
    const { id } = await params;
    await prisma.esNews.delete({ where: { id } });
    return NextResponse.json({ ok: true });
}
