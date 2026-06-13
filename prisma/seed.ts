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
    console.log('Done.');
}

main()
    .then(async () => { await prisma.$disconnect(); })
    .catch(async (e) => { console.error(e); await prisma.$disconnect(); process.exit(1); });
