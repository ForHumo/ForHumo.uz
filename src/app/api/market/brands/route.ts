import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// GET — barcha brendlar
export async function GET() {
    const brands = await prisma.marketBrand.findMany({
        include: { _count: { select: { products: true } } },
        orderBy: [{ verified: "desc" }, { createdAt: "desc" }],
    });
    return NextResponse.json({ brands });
}

// POST — yangi brend yaratish
export async function POST(req: Request) {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const profile = await prisma.userProfile.findUnique({ where: { email: session.user.email } });
    if (!profile) return NextResponse.json({ error: "Profile not found" }, { status: 404 });

    const { name, slug, description } = await req.json();
    if (!name?.trim() || !slug?.trim())
        return NextResponse.json({ error: "Nom va slug kerak" }, { status: 400 });

    const cleanSlug = slug.trim().toLowerCase().replace(/[^a-z0-9-]/g, "-");

    const existing = await prisma.marketBrand.findUnique({ where: { slug: cleanSlug } });
    if (existing) return NextResponse.json({ error: "Bu slug band" }, { status: 409 });

    const brand = await prisma.marketBrand.create({
        data: { name: name.trim(), slug: cleanSlug, description: description?.trim() ?? null, ownerId: profile.id },
    });
    return NextResponse.json({ brand });
}
