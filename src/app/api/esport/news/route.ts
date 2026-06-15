import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getEsportAdmin } from "@/lib/esport";

// POST /api/esport/news — yangilik qo'shish (admin)
export async function POST(req: NextRequest) {
    const admin = await getEsportAdmin();
    if (!admin) return NextResponse.json({ error: "Ruxsat yo'q" }, { status: 403 });
    const b = await req.json().catch(() => ({}));
    const title = (b.title || "").toString().trim();
    if (!title) return NextResponse.json({ error: "Sarlavha kiriting" }, { status: 400 });
    const news = await prisma.esNews.create({
        data: {
            title: title.slice(0, 160),
            body: b.body?.toString().trim().slice(0, 1000) || null,
            image: b.image?.toString().trim() || null,
            pinned: !!b.pinned,
            createdBy: admin.humoId || admin.id,
        },
    });
    return NextResponse.json({ ok: true, news });
}
