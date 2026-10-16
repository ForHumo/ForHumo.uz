// BN — server-side ma'lumot yuklovchilari (Prisma). FAZA 4.
// Sahifalar (server component) shu funksiyalarni chaqiradi va client
// komponentlarga initialData sifatida uzatadi.
//
// MUHIM: bu fayl "use server" emas — shunchaki server-only Prisma wrapper.
// Client fayldan import qilinsa build xatosi bo'ladi (Prisma faqat serverda).

import { prisma } from "@/lib/prisma";
import { unstable_cache } from "next/cache";

// ── Tiplar (client komponent ham import qiladi) ─────────────────────────────
// Bular MockShop/MockProduct'ga o'xshaydi lekin real DB ma'lumotidan.

export interface BnMarketDTO {
    id: string;
    slug: string;
    name: string;
    /** Rus tilidagi nom (bo'lsa) — ru sahifalarda ko'rsatiladi */
    nameRu?: string | null;
    district: string;
    coverUrl: string;
    workHours: string;
    shopCount: number;
    sections: string[];
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
    /** Xarita koordinatlari (STANDALONE do'kon uchun kritik) */
    lat: number | null;
    lng: number | null;
    /** Nexus profil (bor bo'lsa) — @username, follower/onlayn chip uchun */
    ownerUsername?: string | null;
    /** Tasdiqlanganlik (galochka) — cron avtomatik hisoblab qo'yadi */
    verifiedTier?: "NONE" | "RETAIL" | "WHOLESALE";
    /** Do'kon telefoni (WhatsApp aloqasi uchun; verified bo'lgan taqdirdagina) */
    phone?: string | null;
    phoneVerified?: boolean;
    /** Ish vaqti ("Dush–Yak 08:00–18:00") — FTC qo'ng'iroq gate + ochiq/yopiq badge */
    workHours?: string | null;
    /** Sotuvchi UserProfile.id — jonli qo'ng'iroq peerId sifatida (faqat to'liq do'kon yozuvida) */
    sellerId?: string | null;
    /** Bozor koordinatlari — bozordagi do'konning o'z koordinatasi bo'lmasa "Yo'nalish" uchun (faqat to'liq do'kon yozuvida) */
    marketLat?: number | null;
    marketLng?: number | null;
}

export interface BnProductDTO {
    id: string;
    slug: string;
    title: string;
    description: string | null;
    price: number;
    oldPrice: number | null;
    marketAvgPrice: number | null;
    images: string[];
    /** Mahsulot videolari (maks 2, Vercel Blob MP4) — vitrina fonida ishlatiladi */
    videos?: string[];
    categorySlug: string;
    /** Kategoriya nomi (uz) va ruscha nomi — breadcrumb uchun (ixtiyoriy) */
    categoryName?: string | null;
    categoryNameRu?: string | null;
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
    attributes: Record<string, string | number | boolean>;
    /** 18+ tovar (ichki kiyim, kondom, sog'liq buyumi). UI'da xiralashadi. */
    isMature?: boolean;
    /** Ulgurji (B2B) — faqat BN do'kon egalari sotib oladi */
    isWholesale?: boolean;
    minWholesaleQty?: number | null;
    wholesaleTiers?: { minQty: number; price: number }[];
    /** Sotuvchi galochkasi — cron avtomatik hisoblab qo'yadi */
    shopVerifiedTier?: "NONE" | "RETAIL" | "WHOLESALE";
    /** Do'kon koordinatalari — nearby masofa chip uchun (ixtiyoriy) */
    shopLat?: number | null;
    shopLng?: number | null;
    /** Avto moslik — bu qism mos keladigan mashina model id'lari (garaj filtri) */
    fitModelIds?: string[];
    /** Universal — barcha mashinaga to'g'ri keladi (moy, umumiy aksessuar) */
    universalFit?: boolean;
}

// ── Xaritalash: DB → DTO ────────────────────────────────────────────────────

type ShopWithMarket = Awaited<ReturnType<typeof prisma.bnShop.findMany>>[number]
    & { market: { slug: string; name: string } | null };

function toShopDTO(s: ShopWithMarket, ownerUsername?: string | null): BnShopDTO {
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
        lat: s.lat,
        lng: s.lng,
        ownerUsername: ownerUsername ?? null,
        verifiedTier: (s.verifiedTier as "NONE" | "RETAIL" | "WHOLESALE" | undefined) ?? "NONE",
        // Raqam faqat tasdiqlangan bo'lsa client'ga ketadi (tasdiqlanmagani RSC payload'ga ham chiqmasin)
        phone: (s as { phoneVerified?: boolean }).phoneVerified ? (s as { phone?: string | null }).phone ?? null : null,
        phoneVerified: (s as { phoneVerified?: boolean }).phoneVerified ?? false,
        workHours: (s as { workHours?: string | null }).workHours ?? null,
        sellerId: (s as { profileId?: string | null }).profileId ?? null,
    };
}

// Do'kon ko'rsatkichlari kesh maydonlardan (rating/ratingCount/productCount — seed'da
// to'qima qiymatlar qolgan) EMAS, haqiqiy qatorlardan olinadi: sahifadagi ro'yxat bilan
// bir xil filtr. Bitta groupBy — do'konlar soniga qarab qo'shimcha so'rov yo'q.
const ACTIVE_PRODUCTS_COUNT = {
    _count: { select: { products: { where: { isActive: true, hidden: false } } } },
} as const;

async function realShopRatings(shopIds: string[]): Promise<Map<string, { rating: number; count: number }>> {
    if (shopIds.length === 0) return new Map();
    const rows = await prisma.bnShopReview.groupBy({
        by: ["shopId"],
        where: { shopId: { in: shopIds }, hidden: false },
        _avg: { rating: true },
        _count: { _all: true },
    });
    return new Map(rows.map(r => [r.shopId, { rating: r._avg.rating ?? 0, count: r._count._all }]));
}

type ProductWithRels = Awaited<ReturnType<typeof prisma.bnProduct.findMany>>[number]
    & {
        shop: { slug: string; name: string; tier: string; verifiedTier?: string; market: { name: string } | null; city: string; lat?: number | null; lng?: number | null } | null;
        category: { slug: string; name?: string; nameRu?: string | null } | null;
        fits?: { modelId: string }[];
    };

function toProductDTO(p: ProductWithRels): BnProductDTO {
    return {
        id: p.id,
        slug: p.slug,
        title: p.title,
        description: p.description,
        price: p.price,
        oldPrice: p.oldPrice,
        marketAvgPrice: p.marketAvgPrice,
        images: p.images,
        videos: p.videos ?? [],
        categorySlug: p.category?.slug ?? "",
        categoryName: p.category?.name ?? null,
        categoryNameRu: p.category?.nameRu ?? null,
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
        attributes: (p.attributes as Record<string, string | number | boolean>) ?? {},
        isMature: p.isMature ?? false,
        isWholesale: p.isWholesale ?? false,
        minWholesaleQty: p.minWholesaleQty,
        wholesaleTiers: Array.isArray(p.wholesaleTiers) ? p.wholesaleTiers as { minQty: number; price: number }[] : [],
        shopVerifiedTier: (p.shop?.verifiedTier as "NONE" | "RETAIL" | "WHOLESALE" | undefined) ?? "NONE",
        shopLat: p.shop?.lat ?? null,
        shopLng: p.shop?.lng ?? null,
        fitModelIds: p.fits?.map(f => f.modelId) ?? [],
        universalFit: (p as { universalFit?: boolean }).universalFit ?? false,
    };
}

// Ulgurji gating — do'kon egalari (BN'da APPROVED shop) va admin/OWNER'lar ulgurji ko'radi.
// Boshqalar uchun listing'lardan yashiriladi.
export async function viewerCanSeeWholesale(profileId: string | null): Promise<boolean> {
    if (!profileId) return false;
    const shop = await prisma.bnShop.findFirst({
        where: { profileId, status: "APPROVED" },
        select: { id: true },
    });
    if (shop) return true;
    // Admin/OWNER ham hamma narsani ko'rishi mumkin
    const admin = await prisma.bnAdmin.findUnique({
        where: { profileId },
        select: { id: true },
    });
    return !!admin;
}

// ── Yuklovchilar ────────────────────────────────────────────────────────────

const PRODUCT_INCLUDE = {
    shop: { select: { slug: true, name: true, tier: true, verifiedTier: true, city: true, status: true, lat: true, lng: true, phone: true, phoneVerified: true, market: { select: { name: true } } } },
    category: { select: { slug: true, name: true, nameRu: true } },
    fits: { select: { modelId: true } },   // avto moslik — client filtr + karta belgisi
} as const;

export const getMarkets = unstable_cache(
    async (limit = 12): Promise<BnMarketDTO[]> => {
        const rows = await prisma.bnMarket.findMany({
            where: { isActive: true },
            orderBy: [{ order: "asc" }, { name: "asc" }],
            take: limit,
            select: {
                id: true, slug: true, name: true, nameRu: true, district: true,
                coverUrl: true, workHours: true, sections: true,
                // Do'konlar soni — kesh `shopCount` emas, bozor sahifasidagi ro'yxat bilan bir xil (APPROVED)
                _count: { select: { shops: { where: { status: "APPROVED" } } } },
            },
        });
        return rows.map(m => ({
            id: m.id,
            slug: m.slug,
            name: m.name,
            nameRu: m.nameRu,
            district: m.district ?? "Toshkent",
            coverUrl: m.coverUrl ?? "",
            workHours: m.workHours ?? "",
            shopCount: m._count.shops,
            sections: m.sections,
        }));
    },
    ["bn-markets"],
    { revalidate: 300, tags: ["bn-markets"] },
);

export const getTopShops = unstable_cache(
    async (limit = 10, includeEmpty = false): Promise<BnShopDTO[]> => {
        // Reyting × log(reyting soni) — mock'dagi bilan bir xil formula.
        // includeEmpty: /dokonlar katalogi yangi (mahsulotsiz, bahosiz) do'konlarni ham ko'rsatadi —
        // "TOP" ro'yxatlari (bosh sahifa) esa ularni chiqarmaydi.
        const shops = await prisma.bnShop.findMany({
            where: { status: "APPROVED" },
            orderBy: [{ rating: "desc" }, { ratingCount: "desc" }],
            take: limit * 3,   // ko'proq olib, kodda saralaymiz
            include: { market: { select: { slug: true, name: true } }, ...ACTIVE_PRODUCTS_COUNT },
        });
        const ratings = await realShopRatings(shops.map(s => s.id));
        const sorted = shops
            .map(({ _count, ...s }) => ({
                ...s,
                productCount: _count.products,
                rating: ratings.get(s.id)?.rating ?? 0,
                ratingCount: ratings.get(s.id)?.count ?? 0,
            }))
            // Na bahosi, na mahsuloti yo'q do'kon reyting ro'yxatida turmaydi
            .filter(s => includeEmpty || s.ratingCount > 0 || s.productCount > 0)
            .sort((a, b) => (b.rating * Math.log10(b.ratingCount + 10)) - (a.rating * Math.log10(a.ratingCount + 10)))
            .slice(0, limit);
        return sorted.map(s => toShopDTO(s));
    },
    ["bn-top-shops"],
    { revalidate: 180, tags: ["bn-top-shops"] },
);

/** Bosh sahifa uchun 5 xil feed — bir marta DBga borib qaytadi.
 *  profileId berilsa "Siz uchun" (rekomendatsiya) ham qo'shiladi.
 *  Ulgurji mahsulotlar: faqat BN do'kon egalari va admin'lar ko'radi. */
// 200 ta so'nggi mahsulot (ulgurjisiz) — bosh sahifadagi 4 feed uchun asos.
// Foydalanuvchining 99%ida seeWholesale=false — shuning uchun default variant cache'lanadi.
const getHomeProductsPublic = unstable_cache(
    async () => {
        return prisma.bnProduct.findMany({
            where: { isActive: true, hidden: false, isWholesale: false },
            include: PRODUCT_INCLUDE,
            take: 200,
            orderBy: { createdAt: "desc" },
        });
    },
    ["bn-home-products-public"],
    { revalidate: 120, tags: ["bn-products"] },
);

// Faol bozorlar umumiy soni — bosh sahifa "N ta bozor" uchun (getMarkets(6) faqat
// ko'rsatish uchun 6 tasini oladi, uzunligi umumiy son emas).
const getMarketCount = unstable_cache(
    async () => prisma.bnMarket.count({ where: { isActive: true } }),
    ["bn-market-count"],
    { revalidate: 300, tags: ["bn-markets"] },
);

export async function getHomeData(profileId: string | null = null) {
    const seeWholesale = await viewerCanSeeWholesale(profileId);

    const [markets, marketCount, topShops, allProducts, forYou] = await Promise.all([
        getMarkets(6),
        getMarketCount(),
        getTopShops(10),
        seeWholesale
            ? prisma.bnProduct.findMany({
                where: { isActive: true, hidden: false },
                include: PRODUCT_INCLUDE,
                take: 200,
                orderBy: { createdAt: "desc" },
            })
            : getHomeProductsPublic(),
        profileId ? getRecommendedProducts(profileId, 12) : Promise.resolve([] as BnProductDTO[]),
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

    return { markets, marketCount, topShops, cheap, fresh, top, seasonal, forYou };
}

export async function getMarketBySlug(slug: string) {
    const m = await prisma.bnMarket.findUnique({
        where: { slug },
        include: {
            shops: {
                where: { status: "APPROVED" },
                include: { market: { select: { slug: true, name: true } }, ...ACTIVE_PRODUCTS_COUNT },
                orderBy: [{ tier: "desc" }, { rating: "desc" }],
            },
        },
    });
    if (!m) return null;
    // Sonlar haqiqiy qatorlardan: do'konlar soni = shu ro'yxat (kesh `shopCount` emas),
    // har do'konning mahsulot/baho soni — faol mahsulot va ko'rinadigan sharhlardan
    const ratings = await realShopRatings(m.shops.map(s => s.id));
    const shops = m.shops.map(({ _count, ...s }) => ({
        ...s,
        productCount: _count.products,
        rating: ratings.get(s.id)?.rating ?? 0,
        ratingCount: ratings.get(s.id)?.count ?? 0,
    }));
    return { ...m, shopCount: shops.length, shops };
}

// Do'kon sahifasi — DTO qaytaradi (serializable), 60s cache. Do'konga trafik
// spike bo'lsa DB'ni har request urmaydi.
export const getShopBySlug = unstable_cache(
    async (slug: string) => {
        const shop = await prisma.bnShop.findUnique({
            where: { slug },
            include: {
                market: { select: { slug: true, name: true, lat: true, lng: true } },
                products: {
                    where: { isActive: true, hidden: false },
                    include: PRODUCT_INCLUDE,
                    orderBy: { createdAt: "desc" },
                    take: 60,
                },
                ...ACTIVE_PRODUCTS_COUNT,   // ro'yxat 60 ta bilan cheklangan — umumiy son alohida
            },
        });
        if (!shop) return null;
        // Nexus username — do'kon egasidan; baho — ko'rinadigan sharhlardan (sahifadagi bilan bir xil)
        const [owner, ratings] = await Promise.all([
            prisma.userProfile.findUnique({
                where: { id: shop.profileId },
                select: { username: true },
            }),
            realShopRatings([shop.id]),
        ]);
        const dto = toShopDTO({
            ...shop,
            productCount: shop._count.products,
            rating: ratings.get(shop.id)?.rating ?? 0,
            ratingCount: ratings.get(shop.id)?.count ?? 0,
        }, owner?.username);
        return {
            shop: { ...dto, marketLat: shop.market?.lat ?? null, marketLng: shop.market?.lng ?? null },
            products: shop.products.map(toProductDTO),
        };
    },
    ["bn-shop-page"],
    { revalidate: 60, tags: ["bn-shops"] },
);

// Mahsulot sahifasi ma'lumoti — barcha ko'ruvchi uchun BIR XIL qism (ulgurji
// gating'dan tashqari) 60s cache'lanadi. Viral mahsulotga spike bo'lsa har
// request DB'ni ~8 marta urmaydi — cache hit'dan qaytadi (yuklama chidamliligi).
const _productPageCached = unstable_cache(
    async (slug: string) => {
    const p = await prisma.bnProduct.findUnique({
        where: { slug },
        include: PRODUCT_INCLUDE,
    });
    if (!p) return null;
    // Ban/terminate qilingan do'kon mahsuloti — foydalanuvchilarga ko'rsatilmaydi
    if (!p.isActive || p.hidden) return null;
    if (p.shop && (p.shop as { status?: string }).status !== "APPROVED") return null;

    // Ijtimoiy proof — oxirgi 7 kunda:
    //   soldRecent   — nechta buyurtma qismi (order-item count)
    //   buyersRecent — nechta noyob xaridor (order.buyerId distinct)
    //   viewersRecent — nechta noyob foydalanuvchi ko'rgan (VIEW event)
    const weekAgo = new Date(Date.now() - 7 * 86400_000);
    const [soldRecent, buyerRows, viewerRows] = await Promise.all([
        prisma.bnOrderItem.count({
            where: {
                productId: p.id,
                order: {
                    status: { in: ["CONFIRMED", "READY", "COMPLETED"] },
                    placedAt: { gte: weekAgo },
                },
            },
        }),
        prisma.bnOrderItem.findMany({
            where: {
                productId: p.id,
                order: {
                    status: { in: ["CONFIRMED", "READY", "COMPLETED"] },
                    placedAt: { gte: weekAgo },
                },
            },
            select: { order: { select: { buyerId: true } } },
        }),
        prisma.bnUserEvent.findMany({
            where: { productId: p.id, type: "VIEW", createdAt: { gte: weekAgo } },
            select: { profileId: true },
            distinct: ["profileId"],
        }),
    ]);
    const buyersRecent = new Set(buyerRows.map(r => r.order?.buyerId)).size;
    const viewersRecent = viewerRows.length;

    // Boshqa do'konlar shu mahsulotni qanday narxda sotmoqda — narx solishtirish
    // (title'ning boshi bir xil bo'lsa, o'sha mahsulot deb hisoblaymiz)
    const titleHead = p.title.split(/[\s—\-–]/).slice(0, 3).join(" ").trim();
    const others = titleHead.length >= 4 ? await prisma.bnProduct.findMany({
        where: {
            categoryId: p.categoryId,
            isActive: true, hidden: false,
            NOT: { id: p.id },
            title: { contains: titleHead, mode: "insensitive" },
        },
        include: PRODUCT_INCLUDE,
        take: 10,
        orderBy: { price: "asc" },
    }) : [];

    // O'xshashlar — shu kategoriyaning boshqa mahsulotlari (others'dan tashqari)
    const otherIds = new Set(others.map(o => o.id));
    const similar = await prisma.bnProduct.findMany({
        where: {
            categoryId: p.categoryId,
            isActive: true, hidden: false,
            NOT: { id: { in: [p.id, ...otherIds] } },
        },
        include: PRODUCT_INCLUDE,
        take: 6,
        orderBy: { rating: "desc" },
    });

    // Xaridor sharh reels — NexusVideo hashtag "bn-review-<productId>"
    const reviewVideos = await prisma.nexusVideo.findMany({
        where: {
            hidden: false,
            tags: { has: `bn-review-${p.id}` },
        },
        take: 6,
        orderBy: { createdAt: "desc" },
        select: { id: true, title: true, thumbUrl: true, videoUrl: true, views: true, kind: true, orientation: true },
    });

    // Avto moslik — bu qism mos keladigan mashinalar (detal sahifasi ko'rsatadi)
    const fitRows = await prisma.bnProductFit.findMany({
        where: { productId: p.id },
        select: { model: { select: { name: true, slug: true, make: { select: { name: true, slug: true } } } } },
        orderBy: { createdAt: "asc" },
        take: 100,
    });
    const fits = fitRows.map(f => ({
        makeName: f.model.make.name, makeSlug: f.model.make.slug,
        modelName: f.model.name, modelSlug: f.model.slug,
    }));

    return {
        product: toProductDTO(p),
        others:  others.map(toProductDTO),
        buyersRecent,
        viewersRecent,
        similar: similar.map(toProductDTO),
        soldRecent,
        reviewVideos,
        fits,
        partNumber: (p as { partNumber?: string | null }).partNumber ?? null,
        oemNumbers: (p as { oemNumbers?: string[] }).oemNumbers ?? [],
        universalFit: (p as { universalFit?: boolean }).universalFit ?? false,
        _isWholesale: p.isWholesale,   // ulgurji gate uchun (cache'dan tashqarida tekshiriladi)
    };
    },
    ["bn-product-page"],
    { revalidate: 60, tags: ["bn-products"] },
);

export async function getProductBySlug(slug: string, profileId: string | null = null) {
    const data = await _productPageCached(slug);
    if (!data) return null;
    // Ulgurji — faqat BN do'kon egalari va admin'lar ko'radi (per-request, cache'siz)
    if (data._isWholesale) {
        const canSee = await viewerCanSeeWholesale(profileId);
        if (!canSee) return null;
    }
    const { _isWholesale, ...rest } = data;
    void _isWholesale;
    return rest;
}

export interface BnCategoryTreeDTO {
    id: string;
    slug: string;
    name: string;
    nameRu?: string | null;
    icon: string | null;
    productCount: number;
    children: { slug: string; name: string; nameRu?: string | null; icon: string | null; productCount: number }[];
}

/** Kategoriya daraxti nomlarini tilga moslash: ru'da nameRu (bo'lsa), aks holda asl nom.
 *  (BnCategory'da nameEn yo'q — en'da asl nom qoladi.) */
export function localizeCategoryTree(tree: BnCategoryTreeDTO[], locale: string): BnCategoryTreeDTO[] {
    if (locale !== "ru") return tree;
    return tree.map(c => ({
        ...c,
        name: c.nameRu || c.name,
        children: c.children.map(ch => ({ ...ch, name: ch.nameRu || ch.name })),
    }));
}

// Kategoriyalar deyarli hech qachon o'zgarmaydi — 10 daq. cache.
// productCount real-vaqt hisoblanadi (_count) chunki eski `productCount` fielda kesh eskirib qoladi.
export const getCategoriesTree = unstable_cache(
    async (): Promise<BnCategoryTreeDTO[]> => {
        const rows = await prisma.bnCategory.findMany({
            where: { isActive: true, parentId: null },
            orderBy: { order: "asc" },
            include: {
                _count: { select: { products: { where: { isActive: true, hidden: false } } } },
                children: {
                    where: { isActive: true },
                    orderBy: { order: "asc" },
                    select: {
                        slug: true, name: true, nameRu: true, icon: true,
                        _count: { select: { products: { where: { isActive: true, hidden: false } } } },
                    },
                },
            },
        });
        return rows.map(c => ({
            id: c.id,
            slug: c.slug,
            name: c.name,
            nameRu: c.nameRu,
            icon: c.icon,
            productCount: c._count.products + c.children.reduce((s, ch) => s + ch._count.products, 0),
            children: c.children.map(ch => ({
                slug: ch.slug, name: ch.name, nameRu: ch.nameRu, icon: ch.icon, productCount: ch._count.products,
            })),
        }));
    },
    ["bn-categories-tree"],
    { revalidate: 600, tags: ["bn-categories"] },
);

export async function getCategoryBySlug(slug: string, profileId: string | null = null) {
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

    const seeWholesale = await viewerCanSeeWholesale(profileId);
    // Mahsulotlar: bu kategoriya + pastki kategoriyalari
    const childIds = cat.children.map(c => c.id);
    const products = await prisma.bnProduct.findMany({
        where: {
            isActive: true, hidden: false,
            categoryId: { in: [cat.id, ...childIds] },
            ...(seeWholesale ? {} : { isWholesale: false }),
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
    skip?: number;   // pagination cursor
    profileId?: string | null;
    /** Faqat ulgurji mahsulotlar kerak (/bn/ulgurji sahifasi uchun) */
    wholesaleOnly?: boolean;
    /** Faqat narx kelishilishi mumkin bo'lgan mahsulotlar (Narx kelishuvi filtri) */
    negotiableOnly?: boolean;
    /** "Mening mashinam" filtri — shu modelga mos (yoki universal) qismlar */
    carModelId?: string | null;
}): Promise<BnProductDTO[]> {
    const { q, categorySlug, marketSlug, sort = "new", limit = 60, skip = 0, profileId = null, wholesaleOnly = false, negotiableOnly = false, carModelId = null } = opts;

    const seeWholesale = await viewerCanSeeWholesale(profileId);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const where: any = { isActive: true, hidden: false };
    if (wholesaleOnly) {
        if (!seeWholesale) return [];  // do'kon yo'q — bo'sh
        where.isWholesale = true;
    } else if (!seeWholesale) {
        where.isWholesale = false;
    }
    if (negotiableOnly) {
        where.isNegotiable = true;
    }
    if (q?.trim()) {
        // Ko'p tilli qidiruv: `searchIndex` maydonida barcha tarjimalar + transliteratsiya
        // + kalit so'zlar (masalan "kolbasa" ↔ "колбаса" ↔ "sausage") jamlangan.
        // Xaridor har uchta tilda ham topa oladi.
        const query = q.trim();
        // Transliteratsiya variantlari — eski mahsulotlar searchIndex'siz bo'lsa
        // ham topa olish uchun title/description bo'yicha ham qidiramiz.
        const { transliterate } = await import("@/lib/bn-i18n-product-lite");
        const variants = [query, ...transliterate(query)].filter((v, i, a) => v && a.indexOf(v) === i);
        where.OR = variants.flatMap(v => [
            { searchIndex: { contains: v.toLowerCase(), mode: "insensitive" } },
            { title:       { contains: v, mode: "insensitive" } },
            { description: { contains: v, mode: "insensitive" } },
            { titleUz:     { contains: v, mode: "insensitive" } },
            { titleRu:     { contains: v, mode: "insensitive" } },
            { titleEn:     { contains: v, mode: "insensitive" } },
            { partNumber:  { contains: v, mode: "insensitive" } },   // avto qism raqami
        ]);
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
    if (carModelId) {
        // Shu modelga aniq mos qismlar YOKI universal (barcha mashinaga) qismlar.
        // where.OR text qidiruv uchun band bo'lishi mumkin — shuning uchun AND ichida.
        where.AND = [
            ...(where.AND ?? []),
            { OR: [{ universalFit: true }, { fits: { some: { modelId: carModelId } } }] },
        ];
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const orderBy: any = sort === "cheap"  ? { price: "asc" }
                       : sort === "rating" ? { rating: "desc" }
                       : { createdAt: "desc" };

    const rows = await prisma.bnProduct.findMany({
        where,
        include: PRODUCT_INCLUDE,
        orderBy,
        skip,
        take: limit,
    });
    let dtos = rows.map(toProductDTO);

    // Boost — aktiv reklama mahsulotlar birinchi (faqat "new" sort'da, boshqasida narx tartibi buzilmasin)
    if (sort === "new" && dtos.length > 1) {
        try {
            const boosted = await prisma.bnAdBoost.findMany({
                where: {
                    status: "ACTIVE",
                    expiresAt: { gt: new Date() },
                    productId: { in: dtos.map(d => d.id) },
                },
                select: { productId: true, dailyCost: true },
            });
            if (boosted.length > 0) {
                const boostRank = new Map(boosted.map(b => [b.productId, b.dailyCost]));
                const boostedIds = new Set(boosted.map(b => b.productId));
                const promoted = dtos.filter(d => boostedIds.has(d.id))
                    .sort((a, b) => (boostRank.get(b.id) ?? 0) - (boostRank.get(a.id) ?? 0));
                const rest = dtos.filter(d => !boostedIds.has(d.id));
                dtos = [...promoted, ...rest];

                // Impression track (fail-safe, async)
                Promise.resolve().then(async () => {
                    try {
                        await prisma.bnAdBoost.updateMany({
                            where: { productId: { in: promoted.map(p => p.id) }, status: "ACTIVE" },
                            data: { impressions: { increment: 1 } },
                        });
                    } catch { /* noop */ }
                });
            }
        } catch { /* noop */ }
    }

    if (sort === "seasonal") {
        return dtos.filter(p => ["kiyim", "sport", "uy"].some(k => p.categorySlug.startsWith(k)));
    }
    return dtos;
}

// ── Rekomendatsiya: "Siz uchun" ──────────────────────────────────────────────
// Foydalanuvchi qiziqishi asosida top mahsulotlar. Cold start (interest yo'q)
// bo'lsa reyting+sold asosida trend qaytaradi.

import { getUserInterest, scoreProduct, type RankableProduct } from "@/lib/bn-rank";

export async function getRecommendedProducts(profileId: string | null, limit = 12): Promise<BnProductDTO[]> {
    // Ulgurji gating — do'konsiz odam ulgurji mahsulot tavsiya olmaydi
    const seeWholesale = await viewerCanSeeWholesale(profileId);
    // Nomzodlar: oxirgi 200 faol mahsulot (yaqin, sifatli)
    const candidates = await prisma.bnProduct.findMany({
        where: {
            isActive: true, hidden: false,
            shop: { status: "APPROVED" },
            ...(seeWholesale ? {} : { isWholesale: false }),
        },
        include: {
            category: { select: { slug: true, parentId: true, parent: { select: { slug: true } } } },
            shop: { select: { id: true, slug: true, name: true, tier: true, marketId: true, city: true, market: { select: { name: true } } } },
        },
        orderBy: { updatedAt: "desc" },
        take: 200,
    });

    const interest = await getUserInterest(profileId);
    // Har mahsulot uchun ball
    const scored = candidates.map(p => ({
        p,
        score: scoreProduct(p as unknown as RankableProduct, interest),
    }));
    // Ball bo'yicha saralab, top N
    scored.sort((a, b) => b.score - a.score);
    const top = scored.slice(0, limit).map(x => x.p);
    // DTO ga aylantiramiz — mavjud toProductDTO'ga mos qilib
    return top.map(p => {
        const shape = { ...p, shop: p.shop ? { ...p.shop, status: "APPROVED" as const } : null };
        return toProductDTO(shape as unknown as ProductWithRels);
    });
}
