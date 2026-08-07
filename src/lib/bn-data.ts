// BN — server-side ma'lumot yuklovchilari (Prisma). FAZA 4.
// Sahifalar (server component) shu funksiyalarni chaqiradi va client
// komponentlarga initialData sifatida uzatadi.
//
// MUHIM: bu fayl "use server" emas — shunchaki server-only Prisma wrapper.
// Client fayldan import qilinsa build xatosi bo'ladi (Prisma faqat serverda).

import { prisma } from "@/lib/prisma";

// ── Tiplar (client komponent ham import qiladi) ─────────────────────────────
// Bular MockShop/MockProduct'ga o'xshaydi lekin real DB ma'lumotidan.

export interface BnMarketDTO {
    id: string;
    slug: string;
    name: string;
    district: string;
    coverUrl: string;
    workHours: string;
    shopCount: number;
}

export interface BnShopDTO {
    id: string;
    slug: string;
    name: string;
    logoUrl: string | null;
    tier: "NEW" | "TRUSTED" | "VERIFIED" | "PREMIUM";
    locationType: "IN_MARKET" | "STANDALONE" | "ONLINE";
    marketSlug: string | null;
    marketName: string | null;
    marketSection: string | null;
    marketShopNo: string | null;
    address: string | null;
    city: string;
    district: string | null;
    branchName: string | null;
    rating: number;
    ratingCount: number;
    productCount: number;
}

export interface BnProductDTO {
    id: string;
    slug: string;
    title: string;
    price: number;
    oldPrice: number | null;
    marketAvgPrice: number | null;
    images: string[];
    categorySlug: string;
    shopSlug: string;
    shopName: string;
    shopVerified: boolean;
    marketName: string | null;
    city: string;
    district: string | null;
    branchName: string | null;
    stock: number;
    isNegotiable: boolean;
    allowPickup: boolean;
    allowDelivery: boolean;
    allowInspect: boolean;
    rating: number;
    ratingCount: number;
}

// ── Xaritalash: DB → DTO ────────────────────────────────────────────────────

type ShopWithMarket = Awaited<ReturnType<typeof prisma.bnShop.findMany>>[number]
    & { market: { slug: string; name: string } | null };

function toShopDTO(s: ShopWithMarket): BnShopDTO {
    return {
        id: s.id,
        slug: s.slug,
        name: s.name,
        logoUrl: s.logoUrl,
        tier: s.tier,
        locationType: s.locationType,
        marketSlug: s.market?.slug ?? null,
        marketName: s.market?.name ?? null,
        marketSection: s.marketSection,
        marketShopNo: s.marketShopNo,
        address: s.address,
        city: s.city,
        district: null,
        branchName: null,
        rating: s.rating,
        ratingCount: s.ratingCount,
        productCount: s.productCount,
    };
}

type ProductWithRels = Awaited<ReturnType<typeof prisma.bnProduct.findMany>>[number]
    & {
        shop: { slug: string; name: string; tier: string; market: { name: string } | null; city: string } | null;
        category: { slug: string } | null;
    };

function toProductDTO(p: ProductWithRels): BnProductDTO {
    return {
        id: p.id,
        slug: p.slug,
        title: p.title,
        price: p.price,
        oldPrice: p.oldPrice,
        marketAvgPrice: p.marketAvgPrice,
        images: p.images,
        categorySlug: p.category?.slug ?? "",
        shopSlug: p.shop?.slug ?? "",
        shopName: p.shop?.name ?? "",
        shopVerified: p.shop?.tier === "VERIFIED" || p.shop?.tier === "PREMIUM",
        marketName: p.shop?.market?.name ?? null,
        city: p.shop?.city ?? "Toshkent",
        district: null,
        branchName: null,
        stock: p.stock,
        isNegotiable: p.isNegotiable,
        allowPickup: p.allowPickup,
        allowDelivery: p.allowDelivery,
        allowInspect: p.allowInspect,
        rating: p.rating,
        ratingCount: p.ratingCount,
    };
}

// ── Yuklovchilar ────────────────────────────────────────────────────────────

const PRODUCT_INCLUDE = {
    shop: { select: { slug: true, name: true, tier: true, city: true, market: { select: { name: true } } } },
    category: { select: { slug: true } },
} as const;

export async function getMarkets(limit = 12): Promise<BnMarketDTO[]> {
    const rows = await prisma.bnMarket.findMany({
        where: { isActive: true },
        orderBy: [{ order: "asc" }, { name: "asc" }],
        take: limit,
        select: {
            id: true, slug: true, name: true, district: true,
            coverUrl: true, workHours: true, shopCount: true,
        },
    });
    return rows.map(m => ({
        id: m.id,
        slug: m.slug,
        name: m.name,
        district: m.district ?? "Toshkent",
        coverUrl: m.coverUrl ?? "",
        workHours: m.workHours ?? "",
        shopCount: m.shopCount,
    }));
}

export async function getTopShops(limit = 10): Promise<BnShopDTO[]> {
    // Reyting × log(reyting soni) — mock'dagi bilan bir xil formula
    const shops = await prisma.bnShop.findMany({
        where: { status: "APPROVED" },
        orderBy: [{ rating: "desc" }, { ratingCount: "desc" }],
        take: limit * 3,   // ko'proq olib, kodda saralaymiz
        include: { market: { select: { slug: true, name: true } } },
    });
    const sorted = shops
        .sort((a, b) => (b.rating * Math.log10(b.ratingCount + 10)) - (a.rating * Math.log10(a.ratingCount + 10)))
        .slice(0, limit);
    return sorted.map(toShopDTO);
}

/** Bosh sahifa uchun 4 xil feed — bir marta DBga borib qaytadi. */
export async function getHomeData() {
    const [markets, topShops, allProducts] = await Promise.all([
        getMarkets(6),
        getTopShops(10),
        prisma.bnProduct.findMany({
            where: { isActive: true, hidden: false },
            include: PRODUCT_INCLUDE,
            take: 200,   // yetarli — 4 feed × ko'p qator
            orderBy: { createdAt: "desc" },
        }),
    ]);

    const productDTOs = allProducts.map(toProductDTO);

    const cheap = productDTOs
        .filter(p => p.marketAvgPrice && p.price < p.marketAvgPrice)
        .sort((a, b) => (a.price / (a.marketAvgPrice || 1)) - (b.price / (b.marketAvgPrice || 1)));
    const fresh = productDTOs;
    const top = [...productDTOs].sort((a, b) => b.rating - a.rating);
    const seasonal = productDTOs.filter(p =>
        ["kiyim", "sport", "uy"].some(k => p.categorySlug.startsWith(k))
    );

    return { markets, topShops, cheap, fresh, top, seasonal };
}

export async function getMarketBySlug(slug: string) {
    return prisma.bnMarket.findUnique({
        where: { slug },
        include: {
            shops: {
                where: { status: "APPROVED" },
                include: { market: { select: { slug: true, name: true } } },
                orderBy: [{ tier: "desc" }, { rating: "desc" }],
            },
        },
    });
}

export async function getShopBySlug(slug: string) {
    const shop = await prisma.bnShop.findUnique({
        where: { slug },
        include: {
            market: { select: { slug: true, name: true } },
            products: {
                where: { isActive: true, hidden: false },
                include: PRODUCT_INCLUDE,
                orderBy: { createdAt: "desc" },
                take: 60,
            },
        },
    });
    if (!shop) return null;
    return {
        shop: toShopDTO(shop),
        products: shop.products.map(toProductDTO),
    };
}

export async function getProductBySlug(slug: string) {
    const p = await prisma.bnProduct.findUnique({
        where: { slug },
        include: PRODUCT_INCLUDE,
    });
    if (!p) return null;

    // Boshqa do'konlar shu mahsulotni qanday narxda sotmoqda — narx solishtirish
    const others = await prisma.bnProduct.findMany({
        where: {
            categoryId: p.categoryId,
            isActive: true, hidden: false,
            NOT: { id: p.id },
            title: { contains: p.title.slice(0, 30), mode: "insensitive" },
        },
        include: PRODUCT_INCLUDE,
        take: 10,
        orderBy: { price: "asc" },
    });

    return {
        product: toProductDTO(p),
        others: others.map(toProductDTO),
    };
}

export async function getCategoriesTree() {
    return prisma.bnCategory.findMany({
        where: { isActive: true, parentId: null },
        orderBy: { order: "asc" },
        include: {
            children: {
                where: { isActive: true },
                orderBy: { order: "asc" },
                select: { id: true, slug: true, name: true, icon: true, productCount: true },
            },
        },
    });
}

export async function getCategoryBySlug(slug: string) {
    const cat = await prisma.bnCategory.findUnique({
        where: { slug },
        include: {
            parent: { select: { slug: true, name: true } },
            children: {
                where: { isActive: true },
                orderBy: { order: "asc" },
                select: { id: true, slug: true, name: true, icon: true, productCount: true },
            },
        },
    });
    if (!cat) return null;

    // Mahsulotlar: bu kategoriya + pastki kategoriyalari
    const childIds = cat.children.map(c => c.id);
    const products = await prisma.bnProduct.findMany({
        where: {
            isActive: true, hidden: false,
            categoryId: { in: [cat.id, ...childIds] },
        },
        include: PRODUCT_INCLUDE,
        orderBy: { createdAt: "desc" },
        take: 100,
    });

    return { category: cat, products: products.map(toProductDTO) };
}

export async function searchProducts(opts: {
    q?: string;
    categorySlug?: string;
    marketSlug?: string;
    sort?: "cheap" | "new" | "rating" | "seasonal";
    limit?: number;
}): Promise<BnProductDTO[]> {
    const { q, categorySlug, marketSlug, sort = "new", limit = 60 } = opts;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const where: any = { isActive: true, hidden: false };
    if (q?.trim()) {
        where.OR = [
            { title: { contains: q.trim(), mode: "insensitive" } },
            { description: { contains: q.trim(), mode: "insensitive" } },
        ];
    }
    if (categorySlug) {
        const cat = await prisma.bnCategory.findUnique({
            where: { slug: categorySlug },
            select: { id: true, children: { select: { id: true } } },
        });
        if (cat) {
            where.categoryId = { in: [cat.id, ...cat.children.map(c => c.id)] };
        }
    }
    if (marketSlug) {
        where.shop = { market: { slug: marketSlug } };
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const orderBy: any = sort === "cheap"  ? { price: "asc" }
                       : sort === "rating" ? { rating: "desc" }
                       : { createdAt: "desc" };

    const rows = await prisma.bnProduct.findMany({
        where,
        include: PRODUCT_INCLUDE,
        orderBy,
        take: limit,
    });
    const dtos = rows.map(toProductDTO);
    if (sort === "seasonal") {
        return dtos.filter(p => ["kiyim", "sport", "uy"].some(k => p.categorySlug.startsWith(k)));
    }
    return dtos;
}
