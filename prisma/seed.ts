import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Humo eSport — boshlang'ich o'yinlar (disiplinalar).
async function main() {
    console.log('Seeding Humo eSport games...');
    const games = [
        { slug: 'mlbb', name: 'Mobile Legends: Bang Bang', teamSize: 5, active: true },
        { slug: 'pubgm', name: 'PUBG Mobile', teamSize: 4, active: true },
        { slug: 'cs2', name: 'Counter-Strike 2', teamSize: 5, active: true },
    ];
    for (const g of games) {
        await prisma.esGame.upsert({
            where: { slug: g.slug },
            update: { name: g.name, teamSize: g.teamSize, active: g.active },
            create: g,
        });
        console.log('  ok:', g.name, g.active ? '(faol)' : '(nofaol)');
    }

    // Har bir o'yin uchun boshlang'ich divizionlar (tier 1 = eng yuqori) + mavsum
    const divisionTemplate = [
        { name: 'Pro Division', tier: 1, capacity: 8 },
        { name: 'Division 1', tier: 2, capacity: 8 },
        { name: 'Division 2', tier: 3, capacity: 8 },
        { name: 'Ochiq divizion', tier: 4, capacity: null as number | null },
    ];
    for (const slug of ['mlbb', 'pubgm', 'cs2']) {
        const g = await prisma.esGame.findUnique({ where: { slug }, select: { id: true } });
        if (!g) continue;
        for (const d of divisionTemplate) {
            await prisma.esDivision.upsert({
                where: { gameId_tier: { gameId: g.id, tier: d.tier } },
                update: { name: d.name, capacity: d.capacity },
                create: { gameId: g.id, name: d.name, tier: d.tier, capacity: d.capacity },
            });
        }
        console.log(`  ok: ${slug.toUpperCase()} divizionlar (Pro/Div1/Div2/Ochiq)`);

        const hasSeason = await prisma.esSeason.findFirst({ where: { gameId: g.id }, select: { id: true } });
        if (!hasSeason) {
            await prisma.esSeason.create({ data: { gameId: g.id, name: '2026 Pre-Season', active: true } });
            console.log(`  ok: ${slug.toUpperCase()} mavsum (2026 Pre-Season)`);
        }
    }
    console.log('Done.');
}

main()
    .then(async () => { await prisma.$disconnect(); })
    .catch(async (e) => { console.error(e); await prisma.$disconnect(); process.exit(1); });
