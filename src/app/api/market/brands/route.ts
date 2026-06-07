import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// Avto-tasdiqlangan + bepul brend egalari (asoschilar)
const FOUNDER_HUMO_IDS = ["UZ6889574", "UZ3549920"];
const FOUNDER_USERNAMES = ["abduvoris", "aaa"];

// Brend ochish narxi (Zij): 1-bepul, 2-25, 3-50, 4-100, 5+-200
function brandPrice(existingCount: number): number {
    if (existingCount <= 0) return 0;
    if (existingCount === 1) return 25;
    if (existingCount === 2) return 50;
    if (existingCount === 3) return 100;
    return 200;
}

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
    // Keyingi brend narxini ham qaytaramiz (UI uchun)
    const isFounder =
        FOUNDER_HUMO_IDS.includes(profile.humoId ?? "") ||
        FOUNDER_USERNAMES.includes((profile.username ?? "").toLowerCase());
    const nextPrice = isFounder ? 0 : brandPrice(brands.length);
    return NextResponse.json({ brands, nextPrice, isFounder });
}

export async function POST(req: Request) {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { name, slug, description, category, logo } = await req.json();
    if (!name?.trim() || !slug?.trim())
        return NextResponse.json({ error: "Nom va slug kerak" }, { status: 400 });
    if (!category)
        return NextResponse.json({ error: "Yo'nalish tanlang" }, { status: 400 });

    const profile = await prisma.userProfile.findUnique({ where: { email: session.user.email } });
    if (!profile) return NextResponse.json({ error: "Profil topilmadi" }, { status: 404 });

    const exists = await prisma.marketBrand.findUnique({ where: { slug } });
    if (exists) return NextResponse.json({ error: "Bu slug band, boshqa nom tanlang" }, { status: 409 });

    const isFounder =
        FOUNDER_HUMO_IDS.includes(profile.humoId ?? "") ||
        FOUNDER_USERNAMES.includes((profile.username ?? "").toLowerCase());

    const existingCount = await prisma.marketBrand.count({ where: { ownerId: profile.id } });
    const price = isFounder ? 0 : brandPrice(existingCount);

    // Pullik brend — Zij yechish (atomik)
    if (price > 0) {
        let wallet = await prisma.zijWallet.findUnique({ where: { profileId: profile.id } });
        if (!wallet) wallet = await prisma.zijWallet.create({ data: { profileId: profile.id } });
        if (Number(wallet.balance) < price)
            return NextResponse.json({
                error: `Brend ochish narxi ${price} Ƶ. Balansingiz yetarli emas (${Number(wallet.balance).toFixed(2)} Ƶ).`,
                code: "INSUFFICIENT_ZIJ", required: price, available: Number(wallet.balance),
            }, { status: 400 });

        const newBalance = Number(wallet.balance) - price;
        const [, brand] = await prisma.$transaction([
            prisma.zijWallet.update({ where: { id: wallet.id }, data: { balance: newBalance } }),
            prisma.marketBrand.create({
                data: {
                    slug, name: name.trim(),
                    description: description?.trim() ?? null,
                    category, logo: logo ?? null,
                    ownerId: profile.id,
                    isPaid: true,
                    verified: isFounder,
                },
            }),
            prisma.zijTransaction.create({
                data: {
                    walletId: wallet.id, type: "PURCHASE", amount: price, balanceAfter: newBalance,
                    description: `Brend ochish: ${name.trim()}`,
                },
            }),
        ]);
        return NextResponse.json({ brand, charged: price });
    }

    // Bepul brend (1-chi yoki asoschi)
    const brand = await prisma.marketBrand.create({
        data: {
            slug, name: name.trim(),
            description: description?.trim() ?? null,
            category, logo: logo ?? null,
            ownerId: profile.id,
            isPaid: existingCount > 0 && !isFounder,
            verified: isFounder,
        },
    });
    return NextResponse.json({ brand, charged: 0 });
}
