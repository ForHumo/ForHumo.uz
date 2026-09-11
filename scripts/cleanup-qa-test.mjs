// QA test paytida yaratilgan spam waitlist yozuvlarini o'chirish.
// Ular '+998 9000...' random telefon nomerlari va name="Spam N" ni ishlatgan.
// Xavfsiz — faqat name'i "Spam " bilan boshlanadigan va "Test QA" bo'lgan yozuvlar.
// Ishga tushirish: DATABASE_URL="..." node scripts/cleanup-qa-test.mjs

import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

const beforeDelete = await prisma.bnSellerWaitlist.findMany({
    where: {
        OR: [
            { name: { startsWith: "Spam " } },
            { name: "Test QA" },
        ],
    },
    select: { id: true, name: true, phone: true, createdAt: true },
    orderBy: { createdAt: "asc" },
});
console.log(`Topildi: ${beforeDelete.length} ta QA test yozuv`);
for (const w of beforeDelete) {
    console.log(`  ${w.createdAt.toISOString()}  ${w.phone}  ${w.name}`);
}

if (beforeDelete.length === 0) {
    console.log("Hech nima o'chirilmadi.");
    await prisma.$disconnect();
    process.exit(0);
}

const result = await prisma.bnSellerWaitlist.deleteMany({
    where: {
        OR: [
            { name: { startsWith: "Spam " } },
            { name: "Test QA" },
        ],
    },
});
console.log(`O'chirildi: ${result.count} ta yozuv.`);

await prisma.$disconnect();
