import type { Metadata } from "next";
import { BnCatalog } from "@/components/bn/bn-catalog";
import { BnVoiceSearchClient } from "@/components/bn/bn-voice-search-client";
import { BnSearchShops } from "@/components/bn/bn-search-shops";
import { getMarkets, searchProducts } from "@/lib/bn-data";
import { getBnAuth } from "@/lib/bn-auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "Qidiruv" };

export default async function Page({
    searchParams,
}: { searchParams: Promise<{ q?: string; sort?: string; mode?: string }> }) {
    const sp = await searchParams;

    // AI voice/NL rejimi — alohida komponent
    if (sp.mode === "voice" || sp.mode === "ai") {
        return <BnVoiceSearchClient initialQuery={sp.q ?? ""} />;
    }

    const auth = await getBnAuth();
    const sort = sp.sort === "cheap" ? "cheap" : "new";
    const q = (sp.q ?? "").trim();

    const [products, markets, shopHits, marketHits] = await Promise.all([
        searchProducts({ q, sort, profileId: auth?.profileId ?? null }),
        getMarkets(20),
        q ? prisma.bnShop.findMany({
            where: {
                name: { contains: q, mode: "insensitive" },
                status: { notIn: ["REJECTED", "SUSPENDED"] as never[] },
            },
            take: 6,
            orderBy: { updatedAt: "desc" },
            select: {
                slug: true, name: true, logoUrl: true, city: true,
                market: { select: { name: true } },
                _count: { select: { products: true } },
            },
        }).catch(() => []) : Promise.resolve([]),
        q ? prisma.bnMarket.findMany({
            where: { name: { contains: q, mode: "insensitive" } },
            take: 4,
            orderBy: { updatedAt: "desc" },
            select: { slug: true, name: true, city: true, coverUrl: true },
        }).catch(() => []) : Promise.resolve([]),
    ]);

    const shops = shopHits.map(s => ({
        slug: s.slug, name: s.name, logoUrl: s.logoUrl,
        city: s.city, marketName: s.market?.name ?? null,
        productCount: s._count?.products ?? 0,
    }));
    const marketList = marketHits.map(m => ({
        slug: m.slug, name: m.name, city: m.city, coverUrl: m.coverUrl,
    }));

    return (
        <>
            {(shops.length > 0 || marketList.length > 0) && (
                <BnSearchShops shops={shops} markets={marketList} />
            )}
            <BnCatalog
                initialProducts={products}
                markets={markets}
                query={q}
                initialSort={sort}
            />
        </>
    );
}
