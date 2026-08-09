// Toshkent shahridagi real bozorlar ro'yxati.
// Eski mock bozorlar yangi ma'lumot bilan yangilanadi (mavjud slug bo'lsa upsert).
//
// Ishlatish: DATABASE_URL="..." node scripts/bn-real-tashkent-markets.mjs

import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

// Toshkentdagi eng mashhur bozorlar (real ma'lumot).
// Koordinatalar: OpenStreetMap dan olingan (yaqin).
const MARKETS = [
    {
        slug: "chorsu-bozori",
        name: "Chorsu bozori",
        district: "Eski shahar",
        address: "Toshkent shahar, Eski shahar tumani, Chorsu maydoni",
        lat: 41.3266, lng: 69.2361,
        workHours: "Har kuni 07:00-19:00",
        sections: ["Sabzavot-meva", "Go'sht", "Sut mahsulotlari", "Non", "Ziravorlar", "Milliy taomlar"],
        order: 1,
    },
    {
        slug: "malika-bozori",
        name: "Malika savdo majmuasi",
        district: "Yashnobod",
        address: "Toshkent shahar, Yashnobod tumani, Bunyodkor 12",
        lat: 41.311, lng: 69.279,
        workHours: "Har kuni 09:00-21:00",
        sections: ["Kiyim", "Elektronika", "Oziq-ovqat", "Uy jihozlari"],
        order: 2,
    },
    {
        slug: "farhod-bozori",
        name: "Farhod bozori",
        district: "Yashnobod",
        address: "Toshkent shahar, Yashnobod tumani",
        lat: 41.302, lng: 69.318,
        workHours: "Har kuni 08:00-20:00",
        sections: ["Kiyim", "Poyabzal", "Uy jihozlari", "Aksessuar"],
        order: 3,
    },
    {
        slug: "yunusobod-dehqon-bozori",
        name: "Yunusobod dehqon bozori",
        district: "Yunusobod",
        address: "Toshkent shahar, Yunusobod tumani, Amir Temur ko'chasi",
        lat: 41.365, lng: 69.291,
        workHours: "Har kuni 07:00-19:00",
        sections: ["Sabzavot-meva", "Go'sht", "Sut mahsulotlari"],
        order: 4,
    },
    {
        slug: "olay-bozori",
        name: "Olay dehqon bozori",
        district: "Mirzo Ulug'bek",
        address: "Toshkent shahar, Mirzo Ulug'bek tumani, Amir Temur ko'chasi 45",
        lat: 41.331, lng: 69.297,
        workHours: "Har kuni 07:00-19:00",
        sections: ["Sabzavot-meva", "Go'sht", "Milliy taomlar"],
        order: 5,
    },
    {
        slug: "mirobod-bozori",
        name: "Mirobod bozori",
        district: "Mirobod",
        address: "Toshkent shahar, Mirobod tumani, Mustaqillik shoh ko'chasi",
        lat: 41.294, lng: 69.288,
        workHours: "Har kuni 08:00-20:00",
        sections: ["Sabzavot-meva", "Kiyim", "Uy jihozlari"],
        order: 6,
    },
    {
        slug: "sergeli-avto-bozori",
        name: "Sergeli avtomobil bozori",
        district: "Sergeli",
        address: "Toshkent shahar, Sergeli tumani",
        lat: 41.226, lng: 69.222,
        workHours: "Har kuni 08:00-18:00",
        sections: ["Avto-ehtiyot qismlar", "Moy va suyuqliklar", "Shina va disk", "Aksessuar"],
        order: 7,
    },
    {
        slug: "urikzor-bozori",
        name: "Urikzor bozori",
        district: "Mirzo Ulug'bek",
        address: "Toshkent shahar, Mirzo Ulug'bek tumani, Urikzor",
        lat: 41.353, lng: 69.302,
        workHours: "Har kuni 07:00-19:00",
        sections: ["Sabzavot-meva", "Go'sht"],
        order: 8,
    },
    {
        slug: "shayxontohur-bozori",
        name: "Shayxontohur bozori",
        district: "Shayxontohur",
        address: "Toshkent shahar, Shayxontohur tumani, Beruniy ko'chasi",
        lat: 41.323, lng: 69.242,
        workHours: "Har kuni 07:00-19:00",
        sections: ["Sabzavot-meva", "Kiyim"],
        order: 9,
    },
    {
        slug: "chilonzor-mebel-bozori",
        name: "Chilonzor mebel bozori",
        district: "Chilonzor",
        address: "Toshkent shahar, Chilonzor tumani, Bunyodkor shoh ko'chasi",
        lat: 41.276, lng: 69.209,
        workHours: "Har kuni 09:00-19:00",
        sections: ["Mebel", "Uy jihozlari", "Aksessuar"],
        order: 10,
    },
    {
        slug: "sebzor-bozori",
        name: "Sebzor bozori",
        district: "Shayxontohur",
        address: "Toshkent shahar, Shayxontohur tumani, Sebzor",
        lat: 41.334, lng: 69.230,
        workHours: "Har kuni 07:00-19:00",
        sections: ["Sabzavot-meva", "Milliy taomlar"],
        order: 11,
    },
    {
        slug: "abu-sahiy-bozori",
        name: "Abu Sahiy bozori",
        district: "Shayxontohur",
        address: "Toshkent shahar, Shayxontohur tumani, Abu Sahiy majmuasi",
        lat: 41.318, lng: 69.246,
        workHours: "Har kuni 08:00-20:00",
        sections: ["Kiyim", "Poyabzal", "Elektronika", "Xitoy tovarlari"],
        order: 12,
    },
];

async function main() {
    console.log("Real Toshkent bozorlarini yangilash...\n");

    let created = 0, updated = 0;
    for (const m of MARKETS) {
        const existing = await prisma.bnMarket.findUnique({ where: { slug: m.slug } });
        if (existing) {
            await prisma.bnMarket.update({
                where: { slug: m.slug },
                data: { ...m, isActive: true, city: "Toshkent" },
            });
            console.log(`  ✓ Yangilandi: ${m.name}`);
            updated++;
        } else {
            await prisma.bnMarket.create({
                data: { ...m, isActive: true, city: "Toshkent" },
            });
            console.log(`  ✓ Yaratildi: ${m.name}`);
            created++;
        }
    }

    // Test mahsulotlar tozalash
    const testProducts = await prisma.bnProduct.findMany({
        where: {
            OR: [
                { title: { contains: "test", mode: "insensitive" } },
                { title: { contains: "Aroq", mode: "insensitive" } },
                { title: { startsWith: "P3 " } },
                { title: { startsWith: "P4 " } },
                { title: { contains: "Michelin Primacy" } },
            ],
        },
        select: { id: true, title: true },
    });
    console.log(`\nTest mahsulotlar topildi: ${testProducts.length}`);
    for (const p of testProducts) {
        await prisma.bnCartItem.deleteMany({ where: { productId: p.id } });
        await prisma.bnFavorite.deleteMany({ where: { productId: p.id } });
        await prisma.bnOrderItem.deleteMany({ where: { productId: p.id } });
        await prisma.bnProductReview.deleteMany({ where: { productId: p.id } });
        await prisma.bnInspectHold.deleteMany({ where: { productId: p.id } });
        await prisma.bnPriceWatch.deleteMany({ where: { productId: p.id } });
        await prisma.bnProductVariant.deleteMany({ where: { productId: p.id } });
        await prisma.bnProduct.delete({ where: { id: p.id } }).catch(() => {});
        console.log(`  ✗ O'chirildi: ${p.title}`);
    }

    console.log(`\nYakun: ${created} yaratildi, ${updated} yangilandi, ${testProducts.length} test o'chirildi`);
    await prisma.$disconnect();
}

main().catch(async e => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
});
