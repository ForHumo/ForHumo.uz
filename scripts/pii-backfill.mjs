// PII backfill — mavjud plaintext totpSecret va phone'ni shifrlangan
// formatga ko'chiradi va plaintext'larni null qiladi.
//
// Bir marta ishga tushiriladi (idempotent — qayta ishga tushirish xavfsiz).
// Ishga tushirish:
//   DATABASE_URL="<neon-url>" node scripts/pii-backfill.mjs

import { PrismaClient } from "@prisma/client";
import { createCipheriv, createHash, randomBytes } from "crypto";

function getKey(purpose) {
    const hex = process.env.LOCATION_ENCRYPTION_KEY;
    if (hex && hex.length >= 64) {
        const master = Buffer.from(hex.slice(0, 64), "hex");
        return createHash("sha256").update(master).update(`::${purpose}`).digest();
    }
    const secret = process.env.NEXTAUTH_SECRET ?? "dev-only-insecure-key";
    return createHash("sha256").update(`${purpose}:${secret}`).digest();
}

function encrypt(plaintext, purpose) {
    const iv = randomBytes(16);
    const cipher = createCipheriv("aes-256-gcm", getKey(purpose), iv);
    const encrypted = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
    const tag = cipher.getAuthTag();
    return {
        encrypted: Buffer.concat([encrypted, tag]).toString("base64"),
        iv: iv.toString("base64"),
    };
}

const prisma = new PrismaClient();

async function main() {
    console.log("Starting PII backfill...");

    // 1. TOTP secrets
    const totpUsers = await prisma.userProfile.findMany({
        where: {
            totpSecret: { not: null },
            totpSecretEnc: null,   // hali ko'chirilmagan
        },
        select: { id: true, totpSecret: true },
    });
    console.log(`TOTP: ${totpUsers.length} foydalanuvchi ko'chiriladi`);
    let totpDone = 0;
    for (const u of totpUsers) {
        if (!u.totpSecret) continue;
        const { encrypted, iv } = encrypt(u.totpSecret, "totp");
        await prisma.userProfile.update({
            where: { id: u.id },
            data: { totpSecret: null, totpSecretEnc: encrypted, totpSecretIv: iv },
        });
        totpDone++;
    }
    console.log(`TOTP: ${totpDone} muvaffaqiyatli ko'chirildi`);

    // 2. Phones
    const phoneUsers = await prisma.userProfile.findMany({
        where: {
            phone: { not: null },
            phoneEnc: null,
        },
        select: { id: true, phone: true },
    });
    console.log(`Phone: ${phoneUsers.length} foydalanuvchi ko'chiriladi`);
    let phoneDone = 0;
    for (const u of phoneUsers) {
        if (!u.phone) continue;
        const { encrypted, iv } = encrypt(u.phone, "phone");
        await prisma.userProfile.update({
            where: { id: u.id },
            data: { phone: null, phoneEnc: encrypted, phoneIv: iv },
        });
        phoneDone++;
    }
    console.log(`Phone: ${phoneDone} muvaffaqiyatli ko'chirildi`);

    console.log("Done.");
}

main()
    .catch(e => { console.error(e); process.exit(1); })
    .finally(() => prisma.$disconnect());
