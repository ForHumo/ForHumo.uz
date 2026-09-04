// Belis — Beshik To'y komplekt + 10 quti seed (test narxlar).
// Ishga tushirish:
//   DATABASE_URL="<neon-url>" node scripts/belis-seed-beshik.mjs

import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

const KOMPLEKT = {
    slug: "beshik-toy-standart",
    kind: "BESHIK_TOY",
    nameUz: "Beshik to'y — standart to'plami",
    descriptionUz: "Chaqaloq beshik to'yi uchun to'liq idish-tovoq va bezak to'plami. 10 ta quti, 3 nusxa.",
    dailyRentUzs: 600_000,
    deposit: 6_000_000,
    itemsCount: 10,
    copyCount: 3,
    images: [
        "https://picsum.photos/seed/beshik-cover/800/600",
        "https://picsum.photos/seed/beshik-2/800/600",
    ],
    isActive: true,
    hidden: false,
};

// 10 ta quti (real hayotdagi beshik to'y elementlariga yaqin).
// kind: BelisItemKind enum'idan (mavjud). Beshik uchun BOSHQA/SANDIQ ishlatamiz.
const ITEMS = [
    { slug: "beshik-beshik",         kind: "SANDIQ",       nameUz: "Bezakli beshik",           dailyRentUzs: 150_000, deposit: 1_500_000, copyCount: 3 },
    { slug: "beshik-yostiq",         kind: "BOSHQA",       nameUz: "Beshik yostiqchalari",     dailyRentUzs: 40_000,  deposit: 300_000,   copyCount: 6 },
    { slug: "beshik-adyol",          kind: "BOSHQA",       nameUz: "Bezakli adyol",            dailyRentUzs: 50_000,  deposit: 400_000,   copyCount: 3 },
    { slug: "beshik-tortik-idish",   kind: "KATTA_IDISH",  nameUz: "Tortiq idishi (katta)",    dailyRentUzs: 60_000,  deposit: 500_000,   copyCount: 3 },
    { slug: "beshik-shirinlik",      kind: "HOLVA",        nameUz: "Shirinlik idishi",         dailyRentUzs: 35_000,  deposit: 250_000,   copyCount: 6 },
    { slug: "beshik-quruq-meva",     kind: "QURUQ_MEVA",   nameUz: "Quruq meva idishi",        dailyRentUzs: 35_000,  deposit: 250_000,   copyCount: 3 },
    { slug: "beshik-parfyum",        kind: "PARFYUM",      nameUz: "Chaqaloq parfyumi idishi", dailyRentUzs: 30_000,  deposit: 200_000,   copyCount: 3 },
    { slug: "beshik-kiyim",          kind: "BOSHQA",       nameUz: "Kiyim idishi",             dailyRentUzs: 45_000,  deposit: 350_000,   copyCount: 3 },
    { slug: "beshik-maniken",        kind: "MANIKEN",      nameUz: "Kichik maniken idishi",    dailyRentUzs: 50_000,  deposit: 400_000,   copyCount: 3 },
    { slug: "beshik-katta-podnos",   kind: "KATTA_IDISH",  nameUz: "Katta podnos",             dailyRentUzs: 45_000,  deposit: 350_000,   copyCount: 6 },
];

async function main() {
    console.log("Checking existing komplekt...");
    const existing = await prisma.belisKomplekt.findUnique({ where: { slug: KOMPLEKT.slug } });
    let komplekt;
    if (existing) {
        console.log(`Komplekt already exists: ${existing.id}`);
        komplekt = await prisma.belisKomplekt.update({
            where: { id: existing.id },
            data: { ...KOMPLEKT },
        });
    } else {
        komplekt = await prisma.belisKomplekt.create({ data: KOMPLEKT });
        console.log(`Created komplekt: ${komplekt.id}`);
    }

    for (const item of ITEMS) {
        const found = await prisma.belisItem.findUnique({ where: { slug: item.slug } });
        if (found) {
            await prisma.belisItem.update({
                where: { id: found.id },
                data: { ...item, komplektId: komplekt.id, isActive: true, hidden: false,
                    images: [`https://picsum.photos/seed/${item.slug}/600/600`] },
            });
            console.log(`  updated: ${item.slug}`);
        } else {
            await prisma.belisItem.create({
                data: { ...item, komplektId: komplekt.id, isActive: true, hidden: false,
                    images: [`https://picsum.photos/seed/${item.slug}/600/600`] },
            });
            console.log(`  created: ${item.slug}`);
        }
    }

    // Update itemsCount
    const itemCount = await prisma.belisItem.count({ where: { komplektId: komplekt.id } });
    await prisma.belisKomplekt.update({
        where: { id: komplekt.id },
        data: { itemsCount: itemCount },
    });
    console.log(`Total items in Beshik komplekt: ${itemCount}`);

    // Also update Fotiha komplekt images if empty
    const fotiha = await prisma.belisKomplekt.findUnique({ where: { slug: "fotiha-standart" } });
    if (fotiha && (!fotiha.images || fotiha.images.length === 0)) {
        await prisma.belisKomplekt.update({
            where: { id: fotiha.id },
            data: {
                images: [
                    "https://picsum.photos/seed/fotiha-cover/800/600",
                    "https://picsum.photos/seed/fotiha-2/800/600",
                ],
            },
        });
        console.log("Fotiha rasmi qo'shildi");
    }
    // Fotiha items rasmi bo'shmi
    const fotihaItems = await prisma.belisItem.findMany({ where: { komplektId: fotiha?.id ?? "" } });
    for (const it of fotihaItems) {
        if (!it.images || it.images.length === 0) {
            await prisma.belisItem.update({
                where: { id: it.id },
                data: { images: [`https://picsum.photos/seed/${it.slug}/600/600`] },
            });
        }
    }
    console.log("Done.");
}

main().catch(e => { console.error(e); process.exit(1); }).finally(() => prisma.$disconnect());
