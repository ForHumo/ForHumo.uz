import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

function makeSlug(name: string): string {
    return name.toLowerCase().replace(/[^a-z0-9-]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 80) || `product-${Date.now()}`;
}

// GET /api/bn/products — kataloglar (filter: kategoriya, marka, model, hidden)
export async function GET(req: Request) {
    const { searchParams } = new URL(req.url);
    const cat = searchParams.get("cat");
    const brand = searchParams.get("brand");
    const model = searchParams.get("model");
    const q = searchParams.get("q")?.trim();
    const sellerId = searchParams.get("sellerId");
    const limit = Math.min(50, Math.max(1, Number(searchParams.get("limit") || "24")));
    const skip = Math.max(0, Number(searchParams.get("skip") || "0"));

    const products = await prisma.bnProduct.findMany({
        where: {
            isActive: true,
            hidden: false,
            ...(cat ? { category: { slug: cat } } : {}),
            ...(brand ? { carBrand: { equals: brand, mode: "insensitive" as const } } : {}),
            ...(model ? { carModel: { equals: model, mode: "insensitive" as const } } : {}),
            ...(sellerId ? { sellerId } : {}),
            ...(q ? { OR: [
                { title: { contains: q, mode: "insensitive" as const } },
                { description: { contains: q, mode: "insensitive" as const } },
                { carBrand: { contains: q, mode: "insensitive" as const } },
                { carModel: { contains: q, mode: "insensitive" as const } },
            ] } : {}),
        },
        orderBy: { createdAt: "desc" },
        take: limit, skip,
        include: {
            seller: { select: { id: true, shopName: true, shopSlug: true, city: true } },
            category: { select: { id: true, slug: true, name: true } },
        },
    });

    return NextResponse.json({ products });
}

// POST /api/bn/products — sotuvchi mahsulot qo'shadi
export async function POST(req: Request) {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const me = await prisma.userProfile.findUnique({ where: { email: session.user.email }, select: { id: true } });
    if (!me) return NextResponse.json({ error: "Profil topilmadi" }, { status: 404 });

    const seller = await prisma.bnSeller.findUnique({ where: { profileId: me.id }, select: { id: true, status: true } });
    if (!seller) return NextResponse.json({ error: "Avval sotuvchi bo'lib ro'yxatdan o'ting" }, { status: 403 });
    if (seller.status !== "APPROVED") return NextResponse.json({ error: `Sizning arizangiz hali ${seller.status === "PENDING" ? "ko'rib chiqilmoqda" : "rad etilgan"}` }, { status: 403 });

    const body = (await req.json()) as {
        title?: string; description?: string; price?: number; oldPrice?: number;
        images?: string[]; videos?: string[]; stock?: number;
        categoryId?: string; carBrand?: string; carModel?: string;
        carYearFrom?: number; carYearTo?: number; partCondition?: string;
        hasDelivery?: boolean; pickupOnly?: boolean;
    };

    if (!body.title?.trim()) return NextResponse.json({ error: "Sarlavha kerak" }, { status: 400 });
    if (typeof body.price !== "number" || body.price <= 0) return NextResponse.json({ error: "Narx kerak" }, { status: 400 });

    // Slug — takrorlanmasin
    let slug = makeSlug(body.title);
    let i = 0;
    while (await prisma.bnProduct.findUnique({ where: { slug }, select: { id: true } })) {
        i++;
        slug = `${makeSlug(body.title)}-${i}`;
        if (i > 30) { slug = `product-${Date.now()}`; break; }
    }

    const product = await prisma.bnProduct.create({
        data: {
            sellerId: seller.id,
            title: body.title.trim().slice(0, 200),
            slug,
            description: body.description?.trim().slice(0, 5000) || null,
            price: Math.max(1, Math.floor(body.price)),
            oldPrice: typeof body.oldPrice === "number" && body.oldPrice > 0 ? Math.floor(body.oldPrice) : null,
            images: Array.isArray(body.images) ? body.images.filter(u => typeof u === "string" && u.length > 5).slice(0, 8) : [],
            videos: Array.isArray(body.videos) ? body.videos.filter(u => typeof u === "string" && u.length > 5).slice(0, 2) : [],
            stock: typeof body.stock === "number" ? Math.max(0, Math.floor(body.stock)) : 1,
            categoryId: body.categoryId || null,
            carBrand: body.carBrand?.trim().slice(0, 60) || null,
            carModel: body.carModel?.trim().slice(0, 60) || null,
            carYearFrom: typeof body.carYearFrom === "number" ? body.carYearFrom : null,
            carYearTo: typeof body.carYearTo === "number" ? body.carYearTo : null,
            partCondition: body.partCondition === "used" || body.partCondition === "restored" ? body.partCondition : "new",
            hasDelivery: !!body.hasDelivery,
            pickupOnly: !!body.pickupOnly,
        },
    });

    return NextResponse.json({ ok: true, product });
}
