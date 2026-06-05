import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

const BRANDS = [
    { slug: "saber-uz",    name: "Saber UZ",       description: "O'zbekistonda litsenziyalangan Saber brendi", verified: true,  logo: "/market/brands/saber.png"   },
    { slug: "techpro-uz",  name: "TechPro UZ",     description: "O'zbek elektronika brendi",                   verified: true,  logo: "/market/brands/techpro.png" },
    { slug: "fresh-farm",  name: "Fresh Farm",     description: "Yangi qishloq mahsulotlari",                  verified: false, logo: "/market/brands/fresh.png"   },
    { slug: "moda-house",  name: "Moda House",     description: "Zamonaviy kiyim-kechak brendi",               verified: false, logo: "/market/brands/moda.png"    },
    { slug: "bookland-uz", name: "BookLand UZ",    description: "O'zbek va xorijiy kitoblar",                  verified: false, logo: "/market/brands/book.png"    },
    { slug: "sport-elite", name: "Sport Elite",    description: "Professional sport jihozlari",                verified: true,  logo: "/market/brands/sport.png"   },
];

const PRODUCTS = [
    // Elektronika
    { brandSlug: "techpro-uz", name: "TechPro X15 Smartfon",        slug: "techpro-x15",       category: "elektronika", subcategory: "telefonlar",   price: 1299, oldPrice: 1499, stock: 45, sold: 230, rating: 4.7, reviewCount: 89,  isFeatured: true,  description: "6.7\" AMOLED, 256GB, 5G, 108MP kamera" },
    { brandSlug: "techpro-uz", name: "TechPro AirBud Pro",          slug: "techpro-airbud",    category: "elektronika", subcategory: "quloqchinlar", price: 149,  oldPrice: 199,  stock: 120, sold: 450, rating: 4.5, reviewCount: 210, isFeatured: true,  description: "ANC, 30 soat batareya, IPX5" },
    { brandSlug: "saber-uz",   name: "Saber UltraBook 14",          slug: "saber-ultrabook",   category: "elektronika", subcategory: "noutbuklar",   price: 2199, oldPrice: null, stock: 20,  sold: 67,  rating: 4.8, reviewCount: 34,  isFeatured: true,  description: "Intel i7, 16GB RAM, 512GB SSD, IPS" },
    { brandSlug: "techpro-uz", name: "TechPro SmartWatch S3",       slug: "techpro-watch-s3",  category: "elektronika", subcategory: "smart-soatlar",price: 299,  oldPrice: 349,  stock: 60,  sold: 190, rating: 4.4, reviewCount: 77,  isFeatured: false, description: "AMOLED, GPS, yurak urish monitori" },

    // Kiyim
    { brandSlug: "moda-house", name: "Classic Ko'ylak (Oq)",        slug: "classic-shirt-oq",  category: "kiyim", subcategory: "erkaklar",  price: 89,   oldPrice: 119,  stock: 200, sold: 560, rating: 4.6, reviewCount: 145, isFeatured: true,  description: "100% paxta, slim fit, S-3XL" },
    { brandSlug: "moda-house", name: "Yozgi Ko'ylak (Ko'k)",        slug: "summer-dress-kok",  category: "kiyim", subcategory: "ayollar",   price: 129,  oldPrice: null,  stock: 85,  sold: 310, rating: 4.7, reviewCount: 98,  isFeatured: false, description: "Yengil mato, ayollar uchun, XS-XL" },
    { brandSlug: "sport-elite",name: "Sport Futbolka Set",           slug: "sport-futbolka",    category: "kiyim", subcategory: "sport-kiyim",price: 79,   oldPrice: 99,   stock: 150, sold: 420, rating: 4.5, reviewCount: 167, isFeatured: false, description: "Namlikni o'tkazuvchi mato, M-XXL" },

    // Oziq-ovqat
    { brandSlug: "fresh-farm", name: "Organik Olma (1kg)",          slug: "organic-olma",      category: "oziq-ovqat", subcategory: "meva-sabzavot", price: 8,    oldPrice: null, stock: 500, sold: 1200, rating: 4.8, reviewCount: 340, isFeatured: true,  description: "Fermer bog'idan yangi uzilgan" },
    { brandSlug: "fresh-farm", name: "Toza Qo'y go'shti (1kg)",    slug: "qoy-gusht",         category: "oziq-ovqat", subcategory: "gusht-baliq",   price: 65,   oldPrice: null, stock: 80,  sold: 290,  rating: 4.9, reviewCount: 112, isFeatured: false, description: "Sog'lom o'tloq qo'yi, muzlatilmagan" },
    { brandSlug: "fresh-farm", name: "Tabiiy Asal (500g)",          slug: "tabiiy-asal",       category: "oziq-ovqat", subcategory: "shirinliklar",  price: 45,   oldPrice: 55,   stock: 200, sold: 680,  rating: 4.9, reviewCount: 256, isFeatured: true,  description: "Tog' asali, antibiotik yo'q" },

    // Sport
    { brandSlug: "sport-elite",name: "Pro Yoga Matı",               slug: "yoga-mat-pro",      category: "sport", subcategory: "fitnes",      price: 99,   oldPrice: 129,  stock: 75,  sold: 340,  rating: 4.6, reviewCount: 128, isFeatured: false, description: "Non-slip, 6mm qalinlik, eco-rubber" },
    { brandSlug: "sport-elite",name: "Protein Shake (1kg, Shokolad)",slug: "protein-choko",     category: "sport", subcategory: "fitnes",      price: 189,  oldPrice: 219,  stock: 90,  sold: 510,  rating: 4.5, reviewCount: 203, isFeatured: true,  description: "Whey protein, 25g protein/serving" },

    // Kitoblar
    { brandSlug: "bookland-uz",name: "Yulduzlar Qizi (Roman)",      slug: "yulduzlar-qizi",    category: "kitoblar", subcategory: "ozbek-adabiyot",  price: 35,   oldPrice: null, stock: 300, sold: 890,  rating: 4.8, reviewCount: 445, isFeatured: true,  description: "Zamonaviy o'zbek romaniI" },
    { brandSlug: "bookland-uz",name: "Atomic Habits (O'zb. tarjima)",slug: "atomic-habits-uzb", category: "kitoblar", subcategory: "biznes-kitob",     price: 49,   oldPrice: 59,   stock: 150, sold: 1100, rating: 4.9, reviewCount: 567, isFeatured: true,  description: "James Clear — o'zingizni o'zgartiring" },
];

async function main() {
    console.log("Seeding market data...");

    // Brandlar
    const brandMap: Record<string, string> = {};
    for (const b of BRANDS) {
        const brand = await prisma.marketBrand.upsert({
            where: { slug: b.slug },
            update: {},
            create: { slug: b.slug, name: b.name, description: b.description, verified: b.verified, logo: b.logo, ownerId: "seed" },
        });
        brandMap[b.slug] = brand.id;
        console.log(`  Brand: ${b.name}`);
    }

    // Mahsulotlar
    for (const p of PRODUCTS) {
        await prisma.marketProduct.upsert({
            where: { slug: p.slug },
            update: {},
            create: {
                brandId: brandMap[p.brandSlug],
                name: p.name, slug: p.slug,
                description: p.description,
                images: [`/market/products/${p.slug}.jpg`],
                price: p.price,
                oldPrice: p.oldPrice ?? undefined,
                stock: p.stock, sold: p.sold,
                rating: p.rating, reviewCount: p.reviewCount,
                category: p.category, subcategory: p.subcategory,
                isFeatured: p.isFeatured,
            },
        });
        console.log(`  Product: ${p.name}`);
    }

    console.log("Done!");
}

main().catch(console.error).finally(() => prisma.$disconnect());
