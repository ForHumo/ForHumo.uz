// BN admin (OWNER) qo'shish — Humo ID UZ6889574 (@abduvoris).
// Ishga tushirish:
//   DATABASE_URL="..." node scripts/bn-add-owner.mjs

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const HUMO_ID = "UZ6889574";

async function main() {
    const profile = await prisma.userProfile.findFirst({
        where: { humoId: HUMO_ID },
        select: { id: true, username: true, humoId: true, email: true },
    });
    if (!profile) {
        console.error(`❌ UserProfile topilmadi: ${HUMO_ID}`);
        process.exit(1);
    }
    console.log(`✅ Foydalanuvchi:`, profile);

    const admin = await prisma.bnAdmin.upsert({
        where: { profileId: profile.id },
        update: { role: "OWNER", note: "BN loyiha rahbari (founder)" },
        create: {
            profileId: profile.id,
            role: "OWNER",
            note: "BN loyiha rahbari (founder)",
        },
    });
    console.log(`✅ BnAdmin:`, admin);
}

main().catch(e => { console.error(e); process.exit(1); }).finally(() => prisma.$disconnect());
