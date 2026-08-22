import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { requireBelisAdmin, belisSlug } from "@/lib/belis";

// GET /api/belis/categories — ochiq
export async function GET() {
    const items = await prisma.belisCategory.findMany({
        where: { hidden: false },
        orderBy: { sort: "asc" },
    });
    return NextResponse.json({ items });
}

// POST /api/belis/categories (admin) — kategoriya yaratish
export async function POST(req: Request) {
    const session = await getServerSession(authOptions);
    const gate = await requireBelisAdmin(session?.user?.email);
    if (!gate.ok) return NextResponse.json({ error: gate.error }, { status: gate.status });

    const body = await req.json().catch(() => ({}));
    const nameUz = String(body?.nameUz ?? "").trim();
    if (!nameUz) return NextResponse.json({ error: "nameUz kerak" }, { status: 400 });
    const slug = body?.slug ? belisSlug(String(body.slug)) : belisSlug(nameUz);
    if (!slug) return NextResponse.json({ error: "Slug yaratib bo'lmadi" }, { status: 400 });

    const cat = await prisma.belisCategory.create({
        data: {
            slug, nameUz,
            nameRu: body?.nameRu ?? null,
            nameEn: body?.nameEn ?? null,
            icon: body?.icon ?? null,
            cover: body?.cover ?? null,
            sort: typeof body?.sort === "number" ? body.sort : 0,
        },
    });
    return NextResponse.json({ category: cat });
}
