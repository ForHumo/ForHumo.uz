// 2025-2026 mavsumi + divizionlar + 4 fasl turniri (aniq sanalar) seed.
// Idempotent: qayta ishga tushirsa yangilaydi (dublikat yaratmaydi).
// Ishga tushirish: DATABASE_URL=... node scripts/seed-esport-season.mjs
import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

// Toshkent vaqti (+5, DST yo'q) → UTC Date
const tk = (y, mo, d, h = 0, mi = 0) => new Date(Date.UTC(y, mo - 1, d, h - 5, mi));

const SEASON_NAME = "2025-2026";

const DIVS = [
    { name: "Pro Division", tier: 1, capacity: 8 },
    { name: "Division 1", tier: 2, capacity: 8 },
    { name: "Division 2", tier: 3, capacity: 8 },
    { name: "Open Division", tier: 4, capacity: null }, // cheksiz — har turnir alohida ro'yxat
];

// Turnir nomlari TARJIMA QILINMAYDI.
const TOURS = [
    { name: "Autumn Tournament", regOpen: tk(2025, 10, 18), regClose: tk(2025, 11, 1), bracket: tk(2025, 11, 1, 10), start: tk(2025, 11, 16), end: tk(2025, 11, 28, 23, 59) },
    { name: "Winter Tournament", regOpen: tk(2026, 1, 18), regClose: tk(2026, 2, 1), bracket: tk(2026, 2, 1, 10), start: tk(2026, 2, 16), end: tk(2026, 2, 28, 23, 59) },
    { name: "Spring Tournament", regOpen: tk(2026, 4, 16), regClose: tk(2026, 5, 1), bracket: tk(2026, 5, 1, 10), start: tk(2026, 5, 16), end: tk(2026, 5, 28, 23, 59) },
    { name: "Summer Tournament", regOpen: tk(2026, 7, 17), regClose: tk(2026, 8, 1), bracket: tk(2026, 8, 1, 10), start: tk(2026, 8, 16), end: tk(2026, 8, 28, 23, 59) },
];

async function main() {
    const game = await prisma.esGame.findFirst({ where: { active: true }, orderBy: { name: "asc" }, select: { id: true, name: true } });
    if (!game) throw new Error("Faol o'yin (EsGame) topilmadi — avval o'yin yarating.");
    console.log("O'yin:", game.name);

    // Divizionlar (gameId + tier unique)
    const divMap = {};
    for (const d of DIVS) {
        const div = await prisma.esDivision.upsert({
            where: { gameId_tier: { gameId: game.id, tier: d.tier } },
            create: { gameId: game.id, name: d.name, tier: d.tier, capacity: d.capacity },
            update: { name: d.name, capacity: d.capacity },
        });
        divMap[d.tier] = div;
    }
    console.log("Divizionlar:", Object.values(divMap).map(d => d.name).join(", "));

    // Mavsum
    let season = await prisma.esSeason.findFirst({ where: { gameId: game.id, name: SEASON_NAME }, select: { id: true } });
    if (!season) season = await prisma.esSeason.create({ data: { gameId: game.id, name: SEASON_NAME, startsAt: tk(2025, 11, 1), active: true } });
    console.log("Mavsum:", SEASON_NAME);

    // 16 turnir (4 fasl × 4 divizion)
    let created = 0, updated = 0;
    for (const t of TOURS) {
        for (const d of DIVS) {
            const div = divMap[d.tier];
            const isOpen = d.capacity == null;
            const data = {
                gameId: game.id, seasonId: season.id, divisionId: div.id,
                name: t.name, format: "SINGLE_ELIM",
                maxTeams: d.capacity ?? 0, thirdPlace: true,
                startsAt: t.start, endsAt: t.end, bracketAt: t.bracket,
                registrationStartsAt: isOpen ? t.regOpen : null,
                registrationEndsAt: isOpen ? t.regClose : null,
            };
            const existing = await prisma.esTournament.findFirst({
                where: { seasonId: season.id, divisionId: div.id, name: t.name }, select: { id: true },
            });
            if (existing) { await prisma.esTournament.update({ where: { id: existing.id }, data }); updated++; }
            else { await prisma.esTournament.create({ data: { ...data, status: "UPCOMING" } }); created++; }
        }
    }
    console.log(`Turnirlar: ${created} yaratildi, ${updated} yangilandi (jami ${TOURS.length * DIVS.length}).`);
    await prisma.$disconnect();
}

main().catch(e => { console.error(e); process.exit(1); });
