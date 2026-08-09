// Rasmiy Nexus agentlarni yaratadi (@create + 8 modul agenti).
// Har biriga UserProfile + NexusAgent yozuvi.
// Ishlatish: DATABASE_URL="..." node scripts/seed-nexus-agents.mjs

import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

const CREATOR_USERNAME = "create";
const CREATOR_OWNER_USERNAME = "abduvoris";

const AGENTS = [
    { username: "id_agent",      module: "ID",      name: "Humo ID",       image: "/logos/humo-id.png" },
    { username: "ai_agent",      module: "AI",      name: "Humo AI",       image: "/logos/humo-ai.png" },
    { username: "nexus_agent",   module: "NEXUS",   name: "Humo Nexus",    image: "/logos/humo-nexus.png" },
    { username: "esport_agent",  module: "ESPORT",  name: "Humo eSport",   image: "/logos/humo-esport.png" },
    { username: "market_agent",  module: "MARKET",  name: "Humo Market",   image: "/logos/humo-market.png" },
    { username: "pay_agent",     module: "PAY",     name: "For Pay",       image: "/logos/for-pay.png" },
    { username: "support_agent", module: "SUPPORT", name: "Humo Support",  image: "/logos/humo-support.png" },
    { username: "bn_agent",      module: "BN",      name: "Bozor Narxida", image: "/bn/logo.png" },
];

async function ensureProfile({ username, name, image, humoId, email }) {
    let p = await prisma.userProfile.findFirst({ where: { username } });
    if (p) {
        // Nom/rasm/verified holatini yangilash
        p = await prisma.userProfile.update({
            where: { id: p.id },
            data: { name, image, verified: true, verifiedCategory: "OFFICIAL" },
        });
    } else {
        p = await prisma.userProfile.create({
            data: {
                email: email ?? `${username}@agents.forhumo.uz`,
                username, name, image,
                humoId: humoId ?? `AGENT${Math.floor(Math.random() * 900000 + 100000)}`,
                onboardingDone: true,
                verified: true,
                verifiedCategory: "OFFICIAL",
                bio: `Rasmiy For Humo agenti (${username}).`,
            },
        });
    }
    return p;
}

async function main() {
    // Owner (@abduvoris) topish — bu @create egasi
    const owner = await prisma.userProfile.findFirst({
        where: { username: CREATOR_OWNER_USERNAME },
        select: { id: true, username: true },
    });
    if (!owner) {
        console.error(`Owner @${CREATOR_OWNER_USERNAME} topilmadi. Avval ushbu hisobga kiring.`);
        process.exit(1);
    }
    console.log(`Owner: @${owner.username} (${owner.id})`);

    // @create profili — @abduvoris'ga bog'lanadi
    console.log("\n@create hisobi tayyorlanmoqda...");
    const creator = await ensureProfile({
        username: CREATOR_USERNAME,
        name: "Agent Creator",
        image: "/logos/forhumo.png",
        email: "create@agents.forhumo.uz",
    });
    console.log(`  ✓ @${creator.username}`);

    // Rasmiy agentlar
    console.log("\nRasmiy agentlar yaratilyapti...");
    for (const a of AGENTS) {
        const prof = await ensureProfile({
            username: a.username,
            name: a.name,
            image: a.image,
        });
        // NexusAgent yozuvi
        await prisma.nexusAgent.upsert({
            where: { profileId: prof.id },
            create: {
                profileId: prof.id,
                module: a.module,
                ownerId: owner.id,
                isSystem: true,
            },
            update: {
                module: a.module,
                ownerId: owner.id,
                isSystem: true,
            },
        });
        console.log(`  ✓ @${a.username} (${a.module})`);
    }

    console.log(`\nYakun: 1 creator + ${AGENTS.length} agent tayyor.`);
    await prisma.$disconnect();
}

main().catch(async e => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
});
