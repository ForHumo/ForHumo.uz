// Retro: Autumn Tournament 2025-2026 — match history (CEO bergan ma'lumot).
// Idempotent: shu nom+mavsumdagi eskisini o'chirib qayta yaratadi.
// Ishga tushirish: DATABASE_URL=... node scripts/seed-retro-autumn.mjs
import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

const MATCHES = [
    { order: 1, date: "10/11/2025", time: "22:00", stage: "GROUP STAGE", teamA: "Assasin's", teamB: "Phantom", scoreA: 1, scoreB: 0, winner: "Assasin's", note: "Oddiy o'yin", youtube: "https://www.youtube.com/live/-JLvSRfYnu0" },
    { order: 2, date: "10/11/2025", time: "22:30", stage: "GROUP STAGE", teamA: "Star Boys", teamB: "Kurayami", scoreA: 1, scoreB: 0, winner: "Star Boys", note: "Oddiy o'yin", youtube: "https://www.youtube.com/live/LM9wcoIt2-s" },
    { order: 3, date: "10/11/2025", time: "23:00", stage: "GROUP STAGE", teamA: "Team Vamos", teamB: "Assasin's", scoreA: null, scoreB: null, winner: null, note: "TO'XTATILGAN — G'olib yo'q", reason: "Turnir tashkilotchisi xatosi. Ruxsatsiz ishtirokchi o'yinga kirdi. O'yin buzildi. Assasin's taslim bo'ldi. Humo eSport tashkilotchilari javobgarlikni o'z zimmasiga oldi.", youtube: "https://www.youtube.com/live/cbuwvi6kZgM" },
    { order: 4, date: "11/11/2025", time: "22:00", stage: "SEMIFINALS", teamA: "Team Vamos", teamB: "Kurayami", scoreA: 1, scoreB: 0, winner: "Team Vamos", note: "Oddiy o'yin", youtube: "https://www.youtube.com/live/OjuCvSPrplo" },
    { order: 5, date: "11/11/2025", time: "22:30", stage: "SEMIFINALS", teamA: "Kurayami", teamB: "Team Vamos", scoreA: 0, scoreB: 1, winner: "Team Vamos", note: "Team Vamos seriyada 2:0 g'olib", youtube: "https://www.youtube.com/live/CakirTjDBUY" },
    { order: 6, date: "12/11/2025", time: "22:00", stage: "SEMIFINALS", teamA: "Star Boys", teamB: "Assasin's", scoreA: 1, scoreB: 0, winner: "Star Boys", note: "Oddiy o'yin", youtube: "https://www.youtube.com/live/FmEnbblZcjA" },
    { order: 7, date: "12/11/2025", time: "22:30", stage: "SEMIFINALS", teamA: "Assasin's", teamB: "Star Boys", scoreA: 0, scoreB: 1, winner: "Star Boys", note: "Star Boys seriyada 2:0 g'olib", youtube: "https://www.youtube.com/live/2KmSLcdc4AQ" },
    { order: 8, date: "13/11/2025", time: null, stage: "THIRD PLACE", teamA: "Kurayami", teamB: "Assasin's", scoreA: 3, scoreB: 0, winner: "Kurayami", note: "Texnik natija", reason: "Assasin's o'z ixtiyori bilan o'yindan chiqdi. Kurayamiga texnik g'alaba berildi.", youtube: null },
    { order: 9, date: "14/11/2025", time: "22:00", stage: "GRAND FINAL", teamA: "Star Boys", teamB: "Team Vamos", scoreA: 1, scoreB: 0, winner: "Star Boys", note: "Oddiy o'yin", youtube: "https://www.youtube.com/live/ihVDDDAzwxs" },
    { order: 10, date: "14/11/2025", time: "22:30", stage: "GRAND FINAL", teamA: "Team Vamos", teamB: "Star Boys", scoreA: 0, scoreB: 1, winner: "Star Boys", note: "Star Boys seriyada 2:0 g'olib — CHEMPION", youtube: "https://www.youtube.com/live/YT4XiYoRyKY" },
];

async function main() {
    await prisma.esRetro.deleteMany({ where: { name: "Autumn Tournament", season: "2025-2026" } });
    const retro = await prisma.esRetro.create({
        data: {
            name: "Autumn Tournament", season: "2025-2026", game: "Mobile Legends: Bang Bang",
            organizer: "For Humo & Humo eSport",
            startDate: new Date(Date.UTC(2025, 10, 10, 17, 0)), endDate: new Date(Date.UTC(2025, 10, 14, 19, 0)),
            prizePool: 200000, currency: "UZS",
            champion: "Star Boys", runnerUp: "Team Vamos", third: "Kurayami",
            matches: { create: MATCHES },
        },
    });
    console.log("Retro yaratildi:", retro.name, retro.season, "| matches:", MATCHES.length);
    await prisma.$disconnect();
}
main().catch(e => { console.error(e); process.exit(1); });
