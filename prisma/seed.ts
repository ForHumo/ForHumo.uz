import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Humo eSport — boshlang'ich o'yinlar (disiplinalar). MLBB launch uchun faol;
// PUBG Mobile kelajak uchun (schema tayyor, UI keyin).
async function main() {
    console.log('Seeding Humo eSport games...');
    const games = [
        { slug: 'mlbb', name: 'Mobile Legends: Bang Bang', teamSize: 5 },
        { slug: 'pubgm', name: 'PUBG Mobile', teamSize: 4 },
    ];
    for (const g of games) {
        await prisma.esGame.upsert({
            where: { slug: g.slug },
            update: { name: g.name, teamSize: g.teamSize },
            create: g,
        });
        console.log('  ok:', g.name);
    }
    console.log('Done.');
}

main()
    .then(async () => { await prisma.$disconnect(); })
    .catch(async (e) => { console.error(e); await prisma.$disconnect(); process.exit(1); });
