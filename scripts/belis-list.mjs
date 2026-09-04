import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();
const komplekts = await prisma.belisKomplekt.findMany({
  select: { slug: true, nameUz: true, kind: true, dailyRentUzs: true, deposit: true, itemsCount: true, copyCount: true, isActive: true },
});
console.log("KOMPLEKTS:", JSON.stringify(komplekts, null, 2));
const items = await prisma.belisItem.findMany({
  select: { slug: true, nameUz: true, komplektId: true, dailyRentUzs: true, deposit: true, copyCount: true, isActive: true },
  take: 50,
});
console.log("ITEMS:", JSON.stringify(items, null, 2));
await prisma.$disconnect();
