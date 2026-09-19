// BN admin — barcha do'konlar ro'yxati (status filtri bilan).
// Faqat OWNER yoki MODERATOR admin.
//
// GET /api/bn/admin/shops?status=PENDING&limit=50

import { NextResponse } from "next/server";
import { revalidateTag } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireBnAuth } from "@/lib/bn-auth";
import { uniqueSlug } from "@/lib/bn-slug";

async function requireBnAdmin(profileId: string): Promise<boolean> {
    const a = await prisma.bnAdmin.findUnique({
        where: { profileId }, select: { role: true },
    });
    return a?.role === "OWNER" || a?.role === "MODERATOR";
}

export async function GET(req: Request) {
    const auth = await requireBnAuth();
    if (auth instanceof NextResponse) return auth;
    if (!(await requireBnAdmin(auth.profileId))) {
        return NextResponse.json({ error: "forbidden" }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const status = searchParams.get("status");
    const limit = Math.min(200, Number(searchParams.get("limit")) || 50);

    const shops = await prisma.bnShop.findMany({
        where: status ? { status: status as "PENDING" | "APPROVED" | "REJECTED" | "SUSPENDED" } : {},
        orderBy: { createdAt: "desc" },
        take: limit,
        include: { market: { select: { slug: true, name: true } } },
    });

    // Profil ma'lumotlarini alohida yuklaymiz (BnShop.profile relation yo'q)
    const profileIds = shops.map(s => s.profileId);
    const profiles = profileIds.length ? await prisma.userProfile.findMany({
        where: { id: { in: profileIds } },
        select: { id: true, email: true, name: true, username: true, humoId: true },
    }) : [];
    const byId = new Map(profiles.map(p => [p.id, p]));

    const enriched = shops.map(s => ({
        ...s,
        profile: byId.get(s.profileId) ?? null,
    }));

    // Do'kon qo'shish formasi uchun bozorlar ro'yxati
    const markets = await prisma.bnMarket.findMany({
        where: { isActive: true },
        orderBy: { order: "asc" },
        select: { slug: true, name: true, sections: true },
    });

    return NextResponse.json({ shops: enriched, markets });
}

// POST /api/bn/admin/shops — founder mavjud do'konni kiritadi (Sergeli digitizatsiya).
// Do'kon APPROVED yaratiladi + placeholder profil (haqiqiy sotuvchi kelganda ega
// o'tkaziladi). Bulk uchun: bir marketSection'ni saqlab, shopNo'ni oshirib ketasiz.
export async function POST(req: Request) {
    const auth = await requireBnAuth();
    if (auth instanceof NextResponse) return auth;
    if (!(await requireBnAdmin(auth.profileId))) {
        return NextResponse.json({ error: "forbidden" }, { status: 403 });
    }

    const body = await req.json().catch(() => ({}));
    const name = String(body?.name ?? "").trim();
    if (name.length < 2) return NextResponse.json({ error: "name_required" }, { status: 400 });

    const marketSlug = String(body?.marketSlug ?? "").trim();
    const market = marketSlug
        ? await prisma.bnMarket.findUnique({ where: { slug: marketSlug }, select: { id: true } })
        : null;

    const marketSection = String(body?.marketSection ?? "").trim() || null;
    const marketShopNo = String(body?.marketShopNo ?? "").trim() || null;
    const phone = String(body?.phone ?? "").trim();
    const legalType = ["YATT", "MCHJ"].includes(String(body?.legalType)) ? String(body?.legalType) as "YATT" | "MCHJ" : "YATT";
    const legalName = String(body?.legalName ?? "").trim() || name;
    const innNumber = String(body?.innNumber ?? "").trim() || null;
    const city = String(body?.city ?? "").trim() || "Toshkent";
    const tier = ["NEW", "TRUSTED", "VERIFIED", "PREMIUM"].includes(String(body?.tier)) ? String(body?.tier) as "NEW" | "TRUSTED" | "VERIFIED" | "PREMIUM" : "NEW";
    const locationType = market ? "IN_MARKET" : "STANDALONE";

    const slug = await uniqueSlug(name, async (s) => (await prisma.bnShop.count({ where: { slug: s } })) > 0);

    // Placeholder profil (email unique — slug bilan)
    const profile = await prisma.userProfile.upsert({
        where: { email: `bn-shop-${slug}@bn.local` },
        update: {},
        create: {
            email: `bn-shop-${slug}@bn.local`,
            name,
            username: `shop_${slug.replace(/-/g, "_")}`.slice(0, 20),
        },
    });

    try {
        const shop = await prisma.bnShop.create({
            data: {
                slug, profileId: profile.id, name,
                tier, locationType,
                marketId: market?.id ?? null, marketSection, marketShopNo,
                city, status: "APPROVED",
                phone, phoneVerified: false,
                legalType, legalName, innNumber: innNumber ?? `founder-${slug}`,
                approvedAt: new Date(),
            },
            select: { id: true, slug: true, name: true, marketSection: true, marketShopNo: true },
        });
        if (market) {
            const cnt = await prisma.bnShop.count({ where: { marketId: market.id, status: "APPROVED" } });
            await prisma.bnMarket.update({ where: { id: market.id }, data: { shopCount: cnt } });
        }
        try { revalidateTag("bn-shops"); } catch { /* fail-safe */ }
        return NextResponse.json({ ok: true, shop });
    } catch (e) {
        return NextResponse.json({ error: "create_failed", detail: e instanceof Error ? e.message.slice(0, 120) : "unknown" }, { status: 500 });
    }
}
