import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Humo eSport — boshlang'ich o'yinlar (disiplinalar). MLBB launch uchun faol;
// PUBG Mobile kelajak uchun (schema tayyor, UI keyin).
async function main() {
    console.log('Seeding Humo eSport games...');
    // MLBB launch uchun FAOL; PUBG hozircha nofaol (schema tayyor, UI keyin).
    const games = [
        { slug: 'mlbb', name: 'Mobile Legends: Bang Bang', teamSize: 5, active: true },
        { slug: 'pubgm', name: 'PUBG Mobile', teamSize: 4, active: false },
    ];
    for (const g of games) {
        await prisma.esGame.upsert({
            where: { slug: g.slug },
            update: { name: g.name, teamSize: g.teamSize, active: g.active },
            create: g,
        });
        console.log('  ok:', g.name, g.active ? '(faol)' : '(nofaol)');
    }

    // MLBB uchun boshlang'ich divizionlar (tier 1 = eng yuqori) + mavsum
    const mlbb = await prisma.esGame.findUnique({ where: { slug: 'mlbb' }, select: { id: true } });
    if (mlbb) {
        const divisions = [
            { name: 'Pro Division', tier: 1 },
            { name: 'Division 1', tier: 2 },
            { name: 'Division 2', tier: 3 },
        ];
        for (const d of divisions) {
            await prisma.esDivision.upsert({
                where: { gameId_tier: { gameId: mlbb.id, tier: d.tier } },
                update: { name: d.name },
                create: { gameId: mlbb.id, name: d.name, tier: d.tier },
            });
        }
        console.log('  ok: MLBB divizionlar (Pro/Div1/Div2)');

        const hasSeason = await prisma.esSeason.findFirst({ where: { gameId: mlbb.id }, select: { id: true } });
        if (!hasSeason) {
            await prisma.esSeason.create({ data: { gameId: mlbb.id, name: '2026 Pre-Season', active: true } });
            console.log('  ok: MLBB mavsum (2026 Pre-Season)');
        }
    }
    console.log('Done.');
}

main()
    .then(async () => { await prisma.$disconnect(); })
    .catch(async (e) => { console.error(e); await prisma.$disconnect(); process.exit(1); });
