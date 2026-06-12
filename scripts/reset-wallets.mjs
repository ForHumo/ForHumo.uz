// Bir martalik: barcha hamyon balanslarini 0ga tushirish, valyutani davlatdan
// o'rnatish, test tranzaksiya tarixini tozalash. (Zij → real pul o'tishi.)
import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

const wallets = await prisma.zijWallet.findMany({
    include: { profile: { select: { country: true } } },
});
for (const w of wallets) {
    const c = w.profile?.country;
    const currency = !c || c.toUpperCase() === "UZ" ? "UZS" : "USD";
    await prisma.zijWallet.update({ where: { id: w.id }, data: { balance: 0, currency } });
}
const delTx = await prisma.zijTransaction.deleteMany({});
const safes = await prisma.zijSafe.updateMany({ data: { balance: 0, isCompleted: false } });

console.log(`Reset: ${wallets.length} wallet (balance=0 + currency), ${delTx.count} tx o'chirildi, ${safes.count} safe nol.`);
await prisma.$disconnect();
