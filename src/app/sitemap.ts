// Dinamik sitemap. Host'ga qarab boshqa saytlar uchun boshqa jadval qaytariladi.
//   bozornarxida.uz → BN sahifalari (bosh, bozorlar, kategoriyalar, do'konlar, mahsulotlar)
//   forhumo.uz / boshqa → asosiy For Humo sahifalari + BN prefiksli link
import type { MetadataRoute } from "next";
import { headers } from "next/headers";
import { prisma } from "@/lib/prisma";

const BN_HOSTS = new Set(["bozornarxida.uz", "www.bozornarxida.uz"]);

export const revalidate = 3600;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
    const host = (await headers()).get("host")?.split(":")[0].toLowerCase() ?? "";
    const isBn = BN_HOSTS.has(host);
    const origin = isBn ? "https://bozornarxida.uz" : "https://forhumo.uz";
    const prefix = isBn ? "" : "/uz/bn";
    const now = new Date();

    const staticPaths: MetadataRoute.Sitemap = [
        { url: `${origin}${prefix || "/"}`, lastModified: now, changeFrequency: "daily", priority: 1 },
        { url: `${origin}${prefix}/bozorlar`, lastModified: now, changeFrequency: "weekly", priority: 0.9 },
        { url: `${origin}${prefix}/dokonlar`, lastModified: now, changeFrequency: "daily", priority: 0.9 },
        { url: `${origin}${prefix}/katalog`, lastModified: now, changeFrequency: "daily", priority: 0.9 },
        { url: `${origin}${prefix}/qidiruv`, lastModified: now, changeFrequency: "weekly", priority: 0.5 },
        { url: `${origin}${prefix}/yordam`, lastModified: now, changeFrequency: "monthly", priority: 0.6 },
        { url: `${origin}${prefix}/huquqiy/foydalanish`, lastModified: now, changeFrequency: "yearly", priority: 0.3 },
        { url: `${origin}${prefix}/huquqiy/maxfiylik`, lastModified: now, changeFrequency: "yearly", priority: 0.3 },
        { url: `${origin}${prefix}/huquqiy/oferta`, lastModified: now, changeFrequency: "yearly", priority: 0.3 },
    ];

    try {
        const [markets, cats, shops, prods] = await Promise.all([
            prisma.bnMarket.findMany({ where: { isActive: true }, select: { slug: true, updatedAt: true }, take: 500 }),
            prisma.bnCategory.findMany({ where: { isActive: true }, select: { slug: true }, take: 500 }),
            prisma.bnShop.findMany({ where: { status: "APPROVED" }, select: { slug: true, updatedAt: true }, take: 2000 }),
            prisma.bnProduct.findMany({ where: { isActive: true, hidden: false }, select: { slug: true, updatedAt: true }, take: 10000, orderBy: { updatedAt: "desc" } }),
        ]);

        const rows: MetadataRoute.Sitemap = [
            ...markets.map(m => ({ url: `${origin}${prefix}/m/${m.slug}`, lastModified: m.updatedAt, changeFrequency: "weekly" as const, priority: 0.8 })),
            ...cats.map(c => ({ url: `${origin}${prefix}/k/${c.slug}`, lastModified: now, changeFrequency: "daily" as const, priority: 0.7 })),
            ...shops.map(s => ({ url: `${origin}${prefix}/d/${s.slug}`, lastModified: s.updatedAt, changeFrequency: "weekly" as const, priority: 0.7 })),
            ...prods.map(p => ({ url: `${origin}${prefix}/p/${p.slug}`, lastModified: p.updatedAt, changeFrequency: "weekly" as const, priority: 0.6 })),
        ];

        return [...staticPaths, ...rows];
    } catch {
        return staticPaths;
    }
}
