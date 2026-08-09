// Humo Market — eski mock do'konlar va mahsulotlarni tozalaydi va
// YAKKA "Humo Market" brendi ostidagi test uchun mos mahsulotlarni seed qiladi.
//
// Ishlatish: DATABASE_URL="..." node scripts/market-reset-and-seed.mjs

import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

const OWNER_USERNAME = "abduvoris";
const BRAND_SLUG = "humo-market";

async function main() {
    console.log("Owner qidirilyapti (@abduvoris)...");
    const owner = await prisma.userProfile.findFirst({
        where: { username: OWNER_USERNAME },
        select: { id: true, username: true, name: true },
    });
    if (!owner) {
        console.error(`Owner @${OWNER_USERNAME} topilmadi. Avval hisobga kiring.`);
        process.exit(1);
    }
    console.log(`  ✓ Owner: @${owner.username} (${owner.id})`);

    console.log("\nEski mock mahsulotlarni tozalash...");
    const existing = await prisma.marketProduct.findMany({ select: { id: true } });
    for (const p of existing) {
        await prisma.marketCartItem.deleteMany({ where: { productId: p.id } });
        await prisma.marketWishlist.deleteMany({ where: { productId: p.id } });
        await prisma.marketOrderItem.deleteMany({ where: { productId: p.id } });
        await prisma.marketReview.deleteMany({ where: { productId: p.id } });
        await prisma.marketProductQuestion.deleteMany({ where: { productId: p.id } });
        await prisma.marketProductVariant.deleteMany({ where: { productId: p.id } });
        await prisma.marketProduct.delete({ where: { id: p.id } }).catch(() => {});
    }
    console.log(`  ✓ ${existing.length} ta mahsulot o'chirildi`);

    console.log("\nEski brendlarni tozalash (Humo Market'dan tashqari)...");
    const brands = await prisma.marketBrand.findMany();
    for (const b of brands) {
        if (b.slug === BRAND_SLUG) continue;
        await prisma.marketBrandReview.deleteMany({ where: { brandId: b.id } });
        await prisma.marketBrand.delete({ where: { id: b.id } }).catch(() => {});
    }
    console.log(`  ✓ Boshqa brendlar o'chirildi`);

    console.log("\nHumo Market brendi (upsert)...");
    const brand = await prisma.marketBrand.upsert({
        where: { slug: BRAND_SLUG },
        create: {
            slug: BRAND_SLUG,
            name: "Humo Market",
            ownerId: owner.id,
            description: "Humo Market — bitta ishonchli manzil. Sifatli mahsulotlar, tez yetkazish.",
            categories: ["elektronika", "kiyim", "oziq-ovqat", "sport", "uy-jihozlari"],
            logo: "/logos/humo-market.png",
            verified: true,
        },
        update: {
            ownerId: owner.id, verified: true,
            logo: "/logos/humo-market.png",
        },
    });
    console.log(`  ✓ Brend: ${brand.name} (${brand.slug})`);

    const PRODUCTS = [
        { name: "TechPro SmartWatch S3", cat: "elektronika", sub: "aksessuarlar", price: 130, oldPrice: 150, stock: 45, rating: 4.4, reviewCount: 77 },
        { name: "Adidas ko'ylak (M)",     cat: "kiyim",       sub: "erkaklar",   price: 85,  oldPrice: 90,  stock: 30, rating: 5.0, reviewCount: 12 },
        { name: "Toza Qo'y go'shti (1kg)", cat: "oziq-ovqat",  sub: "gosht",     price: 13,  oldPrice: null, stock: 200, rating: 4.9, reviewCount: 112 },
        { name: "Yozgi Ko'ylak (Ko'k)",   cat: "kiyim",       sub: "ayollar",   price: 20,  oldPrice: null, stock: 25, rating: 5.0, reviewCount: 8 },
        { name: "Pro Yoga Mati",          cat: "sport",       sub: "fitnes",    price: 35,  oldPrice: 45,  stock: 60, rating: 4.6, reviewCount: 128 },
        { name: "Samsung Galaxy Buds Live", cat: "elektronika", sub: "audio",   price: 210, oldPrice: 240, stock: 15, rating: 4.7, reviewCount: 54 },
        { name: "Xiaomi Mi Band 8",       cat: "elektronika", sub: "aksessuarlar", price: 45, oldPrice: null, stock: 80, rating: 4.5, reviewCount: 220 },
        { name: "Mustaqillik Choy 250g",  cat: "oziq-ovqat",  sub: "ichimlik",  price: 8,   oldPrice: null, stock: 500, rating: 4.8, reviewCount: 340 },
        { name: "Nike Air krossovka (42)", cat: "kiyim",      sub: "poyabzal",  price: 320, oldPrice: 360, stock: 12, rating: 4.9, reviewCount: 67 },
        { name: "Philips avto blender",   cat: "uy-jihozlari", sub: "oshxona",  price: 180, oldPrice: null, stock: 22, rating: 4.5, reviewCount: 44 },
        { name: "Uy sharoiti uchun ko'rpa", cat: "uy-jihozlari", sub: "yotoq",  price: 95,  oldPrice: 110, stock: 40, rating: 4.6, reviewCount: 89 },
        { name: "Anor sharbati (1L)",     cat: "oziq-ovqat",  sub: "ichimlik",  price: 15,  oldPrice: null, stock: 300, rating: 4.7, reviewCount: 156 },
    ];

    console.log("\nYangi mahsulotlarni yaratish...");
    for (const p of PRODUCTS) {
        const slug = p.name.toLowerCase()
            .replace(/[^a-z0-9\s-]/gi, "")
            .replace(/\s+/g, "-")
            .slice(0, 60) + "-" + Math.random().toString(36).slice(2, 6);
        const seed = slug.replace(/-/g, "");
        await prisma.marketProduct.create({
            data: {
                brandId: brand.id,
                name: p.name, slug,
                description: `${p.name} — sifatli va ishonchli. Humo Market da xarid qiling.`,
                price: p.price, oldPrice: p.oldPrice ?? undefined,
                stock: p.stock,
                category: p.cat, subcategory: p.sub,
                images: [
                    `https://picsum.photos/seed/${seed}/600/600`,
                    `https://picsum.photos/seed/${seed}b/600/600`,
                ],
                isActive: true, isFeatured: Math.random() < 0.4,
                rating: p.rating, reviewCount: p.reviewCount,
                sold: Math.floor(Math.random() * 50),
            },
        });
        console.log(`  ✓ ${p.name}`);
    }

    console.log(`\nYakun: 1 brend + ${PRODUCTS.length} mahsulot yaratildi.`);
    await prisma.$disconnect();
}

main().catch(async e => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
});
