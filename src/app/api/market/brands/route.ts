import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) return NextResponse.json({ brands: [] });
    const profile = await prisma.userProfile.findUnique({ where: { email: session.user.email } });
    if (!profile) return NextResponse.json({ brands: [] });

    const brands = await prisma.marketBrand.findMany({
        where: { ownerId: profile.id },
        include: { _count: { select: { products: true } } },
        orderBy: { createdAt: "asc" },
    });
    return NextResponse.json({ brands });
}

export async function POST(req: Request) {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { name, slug, description, category } = await req.json();
    if (!name?.trim() || !slug?.trim())
        return NextResponse.json({ error: "Nom va slug kerak" }, { status: 400 });

    const profile = await prisma.userProfile.findUnique({ where: { email: session.user.email } });
    if (!profile) return NextResponse.json({ error: "Profil topilmadi" }, { status: 404 });

    const existingCount = await prisma.marketBrand.count({ where: { ownerId: profile.id } });
    const exists = await prisma.marketBrand.findUnique({ where: { slug } });
    if (exists) return NextResponse.json({ error: "Bu slug band, boshqa nom tanlang" }, { status: 409 });

    const brand = await prisma.marketBrand.create({
        data: {
            slug, name: name.trim(),
            description: description?.trim() ?? null,
            category: category ?? null,
            ownerId: profile.id,
            isPaid: existingCount > 0,
        },
    });
    return NextResponse.json({ brand });
}
