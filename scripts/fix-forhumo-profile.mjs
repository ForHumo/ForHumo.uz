// Bir martalik: For Humo rasmiy profilini to'g'rilash (ceo@forhumo.uz).
import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

const EMAIL = "ceo@forhumo.uz";
const NEW_HUMO_ID = "UZ0000001";
const NEW_USERNAME = "forhumo";
const NEW_NAME = "For Humo";
const NEW_BIO = "Uzbekistan's first national super-app. One Humo ID for everything — social, payments, marketplace & AI.";

const me = await prisma.userProfile.findUnique({ where: { email: EMAIL } });
if (!me) {
    console.log(`TOPILMADI: ${EMAIL}. Mavjud profillar:`);
    const all = await prisma.userProfile.findMany({ where: { OR: [{ humoId: "UZ2323154" }, { username: "777" }] }, select: { email: true, username: true, humoId: true, name: true } });
    console.log(all);
    await prisma.$disconnect();
    process.exit(1);
}
console.log("Joriy:", { email: me.email, username: me.username, humoId: me.humoId, name: me.name, verified: me.verified });

// Yangi humoId band emasligini tekshir
if (NEW_HUMO_ID !== me.humoId) {
    const taken = await prisma.userProfile.findUnique({ where: { humoId: NEW_HUMO_ID }, select: { email: true } });
    if (taken && taken.email !== EMAIL) { console.log(`XATO: ${NEW_HUMO_ID} band.`); await prisma.$disconnect(); process.exit(1); }
}
const unTaken = await prisma.userProfile.findUnique({ where: { username: NEW_USERNAME }, select: { email: true } });
if (unTaken && unTaken.email !== EMAIL) { console.log(`XATO: @${NEW_USERNAME} band.`); await prisma.$disconnect(); process.exit(1); }

const updated = await prisma.userProfile.update({
    where: { email: EMAIL },
    data: {
        username: NEW_USERNAME, name: NEW_NAME, firstName: NEW_NAME, lastName: null,
        bio: NEW_BIO, humoId: NEW_HUMO_ID, verified: true, verifiedAt: new Date(),
    },
});
console.log("Yangilandi:", { username: updated.username, humoId: updated.humoId, name: updated.name, bio: updated.bio, verified: updated.verified });
await prisma.$disconnect();
