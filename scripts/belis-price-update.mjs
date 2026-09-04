import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

// Fotiha komplekt narxini tahminiy realga yaqinlashtiramiz (test rejim)
await prisma.belisKomplekt.update({
    where: { slug: "fotiha-standart" },
    data: { dailyRentUzs: 500_000, deposit: 5_000_000 },
});

console.log("Fotiha narxi yangilandi: 500K/kun, 5M zaklat");

const all = await prisma.belisKomplekt.findMany({
    select: { slug: true, dailyRentUzs: true, deposit: true, itemsCount: true, copyCount: true },
});
console.log("Barcha komplektlar:", JSON.stringify(all, null, 2));

await prisma.$disconnect();
