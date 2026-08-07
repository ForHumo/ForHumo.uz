import type { Metadata } from "next";
import {
    BnCabinet,
    type CabinetShop, type CabinetStats, type CabinetOrder,
    type CabinetProduct, type CabinetCategory,
} from "@/components/bn/bn-cabinet";
import { getBnAuth } from "@/lib/bn-auth";
import { prisma } from "@/lib/prisma";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function parseSchema(raw: any): { key: string; label: string; labelRu?: string; type: "text" | "number" | "select" | "multiselect" | "boolean"; options?: string[]; required?: boolean; filterable?: boolean; unit?: string }[] {
    if (!Array.isArray(raw)) return [];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return raw.filter((x: any) => x && typeof x.key === "string" && typeof x.label === "string");
}

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
    title: "Kabinet",
    robots: { index: false, follow: false },
};

const EMPTY_STATS: CabinetStats = { ordersThisMonth: 0, revenueThisMonth: 0, productsActive: 0 };

export default async function Page() {
    const auth = await getBnAuth();

    if (!auth) {
        return (
            <BnCabinet
                shop={null}
                unauthenticated
                stats={EMPTY_STATS}
                orders={[]} products={[]} categories={[]}
                walletBalance={0} walletCurrency="UZS"
            />
        );
    }

    const shopRaw = await prisma.bnShop.findUnique({
        where: { profileId: auth.profileId },
        include: { market: { select: { name: true } } },
    });

    if (!shopRaw) {
        return (
            <BnCabinet
                shop={null}
                unauthenticated={false}
                stats={EMPTY_STATS}
                orders={[]} products={[]} categories={[]}
                walletBalance={0} walletCurrency="UZS"
            />
        );
    }

    const shop: CabinetShop = {
        id: shopRaw.id,
        slug: shopRaw.slug,
        name: shopRaw.name,
        logoUrl: shopRaw.logoUrl,
        status: shopRaw.status,
        tier: shopRaw.tier,
        productCount: shopRaw.productCount,
        orderCount: shopRaw.orderCount,
        rating: shopRaw.rating,
        ratingCount: shopRaw.ratingCount,
        locationType: shopRaw.locationType,
        marketName: shopRaw.market?.name ?? null,
        marketSection: shopRaw.marketSection,
        marketShopNo: shopRaw.marketShopNo,
        address: shopRaw.address,
        city: shopRaw.city,
        phone: shopRaw.phone,
        rejectReason: shopRaw.rejectReason,
        verified: shopRaw.phoneVerified,
    };

    // APPROVED emas — statistika/ro'yxatlar kerak emas
    if (shopRaw.status !== "APPROVED") {
        return (
            <BnCabinet
                shop={shop}
                unauthenticated={false}
                stats={EMPTY_STATS}
                orders={[]} products={[]} categories={[]}
                walletBalance={0} walletCurrency="UZS"
            />
        );
    }

    // Statistika: bu oy
    const monthStart = new Date();
    monthStart.setDate(1); monthStart.setHours(0, 0, 0, 0);

    const [ordersRaw, productsRaw, categoriesRaw, wallet, monthAgg, activeProductCount] = await Promise.all([
        prisma.bnOrder.findMany({
            where: { shopId: shopRaw.id },
            orderBy: { placedAt: "desc" },
            take: 20,
            include: {
                items: { take: 1, select: { imageUrl: true, title: true } },
                _count: { select: { items: true } },
            },
        }),
        prisma.bnProduct.findMany({
            where: { shopId: shopRaw.id },
            orderBy: { createdAt: "desc" },
            take: 50,
            include: { category: { select: { name: true } } },
        }),
        prisma.bnCategory.findMany({
            where: { isActive: true },
            orderBy: [{ order: "asc" }, { name: "asc" }],
            select: { slug: true, name: true, parentId: true, attributeSchema: true, parent: { select: { slug: true, attributeSchema: true } } },
        }),
        prisma.wallet.findUnique({ where: { profileId: auth.profileId } }),
        prisma.bnOrder.aggregate({
            where: {
                shopId: shopRaw.id,
                placedAt: { gte: monthStart },
                status: { in: ["COMPLETED", "READY", "CONFIRMED"] },
            },
            _count: { _all: true },
            _sum: { total: true },
        }),
        prisma.bnProduct.count({
            where: { shopId: shopRaw.id, isActive: true, hidden: false },
        }),
    ]);

    const stats: CabinetStats = {
        ordersThisMonth: monthAgg._count._all,
        revenueThisMonth: monthAgg._sum.total ?? 0,
        productsActive: activeProductCount,
    };

    const orders: CabinetOrder[] = ordersRaw.map(o => ({
        id: o.id,
        code: o.code,
        status: o.status,
        total: o.total,
        placedAt: o.placedAt.toISOString(),
        fulfillType: o.fulfillType,
        itemCount: o._count.items,
        firstImage: o.items[0]?.imageUrl ?? null,
        firstTitle: o.items[0]?.title ?? null,
        phone: o.phone,
        address: o.address,
    }));

    const products: CabinetProduct[] = productsRaw.map(p => ({
        id: p.id,
        slug: p.slug,
        title: p.title,
        price: p.price,
        stock: p.stock,
        sold: p.sold,
        images: p.images,
        isActive: p.isActive,
        hidden: p.hidden,
        categoryName: p.category?.name ?? null,
    }));

    // Kategoriya ro'yxati — top-level va sub aralashgan holatda (indent bilan).
    // Sub uchun ota-kategoriya sxemasi ham birga bo'ladi (avto → avto-ehtiyot bir xil brand/model).
    const categories: CabinetCategory[] = categoriesRaw.map(c => {
        const own = parseSchema(c.attributeSchema);
        const parent = parseSchema(c.parent?.attributeSchema);
        // Merge: ota + o'ziniki (o'ziniki ustun — key bo'yicha)
        const merged: Record<string, ReturnType<typeof parseSchema>[number]> = {};
        for (const a of parent) merged[a.key] = a;
        for (const a of own)    merged[a.key] = a;
        return {
            slug: c.slug,
            name: c.name,
            isSub: !!c.parentId,
            parentSlug: c.parent?.slug ?? null,
            attributeSchema: Object.values(merged),
        };
    });

    return (
        <BnCabinet
            shop={shop}
            unauthenticated={false}
            stats={stats}
            orders={orders}
            products={products}
            categories={categories}
            walletBalance={Number(wallet?.balance ?? 0)}
            walletCurrency={wallet?.currency ?? "UZS"}
        />
    );
}
