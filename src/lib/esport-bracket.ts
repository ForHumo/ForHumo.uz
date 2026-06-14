// Turnir setkasi dvigateli — Elo seeding + single-elim generatsiya + g'olib o'tkazish + Elo yangilash.
import { prisma } from "@/lib/prisma";
import { applyElo } from "@/lib/esport-elo";

// Standart seeding tartibi: 1 va 2 qarama-qarshi tomonда (kuchlilar finalgacha uchrashmaydi).
export function seedOrder(size: number): number[] {
    let pls = [1, 2];
    while (pls.length < size) {
        const sum = pls.length * 2 + 1;
        const out: number[] = [];
        for (const p of pls) { out.push(p); out.push(sum - p); }
        pls = out;
    }
    return pls;
}

function nextPow2(n: number): number { let s = 1; while (s < n) s *= 2; return Math.max(s, 2); }

async function putTeam(matchId: string, slot: string, teamId: string) {
    await prisma.esMatch.update({ where: { id: matchId }, data: slot === "A" ? { teamAId: teamId } : { teamBId: teamId } });
}

// Turnir setkasini Elo bo'yicha seed qilib tuzadi (single-elim + ixtiyoriy 3-o'rin o'yini).
export async function generateBracket(tournamentId: string): Promise<{ ok: boolean; error?: string }> {
    const t = await prisma.esTournament.findUnique({ where: { id: tournamentId }, select: { id: true, thirdPlace: true, bracketReady: true } });
    if (!t) return { ok: false, error: "Turnir topilmadi" };
    if (t.bracketReady) return { ok: false, error: "Setka allaqachon tuzilgan" };

    const parts = await prisma.esTournamentTeam.findMany({ where: { tournamentId }, select: { teamId: true, rosterId: true, registeredAt: true } });
    if (parts.length < 2) return { ok: false, error: "Kamida 2 jamoa kerak" };

    // Seeding: Elo (roster.rating) desc; teng bo'lsa avval ro'yxatdan o'tgan
    const rosters = await prisma.esRoster.findMany({ where: { id: { in: parts.map(p => p.rosterId) } }, select: { id: true, rating: true } });
    const ratingMap = Object.fromEntries(rosters.map(r => [r.id, r.rating]));
    const seeded = parts
        .map(p => ({ teamId: p.teamId, rating: ratingMap[p.rosterId] ?? -1000, at: p.registeredAt.getTime() }))
        .sort((a, b) => b.rating - a.rating || a.at - b.at);

    const N = seeded.length;
    const size = nextPow2(N);
    const rounds = Math.log2(size);
    const order = seedOrder(size);
    const teamForSeed = (s: number) => (s <= N ? seeded[s - 1].teamId : null);

    // 1) Barcha matchlarni yaratamiz (round 1 jamoalar bilan, qolgani bo'sh)
    const data: { tournamentId: string; round: number; slot: number; bracket: string; teamAId: string | null; teamBId: string | null; seedA: number | null; seedB: number | null }[] = [];
    for (let s = 0; s < size / 2; s++) {
        const seedA = order[s * 2], seedB = order[s * 2 + 1];
        data.push({ tournamentId, round: 1, slot: s, bracket: "MAIN", teamAId: teamForSeed(seedA), teamBId: teamForSeed(seedB), seedA, seedB });
    }
    for (let r = 2; r <= rounds; r++) {
        for (let s = 0; s < size / Math.pow(2, r); s++) data.push({ tournamentId, round: r, slot: s, bracket: "MAIN", teamAId: null, teamBId: null, seedA: null, seedB: null });
    }
    if (t.thirdPlace && rounds >= 2) data.push({ tournamentId, round: rounds, slot: 0, bracket: "THIRD", teamAId: null, teamBId: null, seedA: null, seedB: null });
    await prisma.esMatch.createMany({ data });

    // 2) Ulanishlar (g'olib -> keyingi round; yarim final mag'lubi -> 3-o'rin)
    const all = await prisma.esMatch.findMany({ where: { tournamentId }, select: { id: true, round: true, slot: true, bracket: true } });
    const idOf = (bracket: string, round: number, slot: number) => all.find(m => m.bracket === bracket && m.round === round && m.slot === slot)?.id ?? null;

    const ops = [];
    for (const m of all) {
        if (m.bracket !== "MAIN" || m.round >= rounds) continue;
        const upd: { nextMatchId: string | null; nextSlot: string; loserNextMatchId?: string | null; loserNextSlot?: string } = {
            nextMatchId: idOf("MAIN", m.round + 1, Math.floor(m.slot / 2)),
            nextSlot: m.slot % 2 === 0 ? "A" : "B",
        };
        if (t.thirdPlace && m.round === rounds - 1) {
            upd.loserNextMatchId = idOf("THIRD", rounds, 0);
            upd.loserNextSlot = m.slot % 2 === 0 ? "A" : "B";
        }
        ops.push(prisma.esMatch.update({ where: { id: m.id }, data: upd }));
    }
    if (ops.length) await prisma.$transaction(ops);

    await prisma.esTournament.update({ where: { id: tournamentId }, data: { bracketReady: true, status: "LIVE" } });

    // 3) Bye'larni avto-o'tkazish
    await autoAdvanceByes(tournamentId);
    return { ok: true };
}

// Round 1 da bitta jamoali matchlar (bye) — yagona jamoa avtomatik o'tadi.
async function autoAdvanceByes(tournamentId: string) {
    const r1 = await prisma.esMatch.findMany({ where: { tournamentId, round: 1, bracket: "MAIN", status: "PENDING" } });
    for (const m of r1) {
        const present = m.teamAId && !m.teamBId ? m.teamAId : (!m.teamAId && m.teamBId ? m.teamBId : null);
        if (!present) continue;
        await prisma.esMatch.update({ where: { id: m.id }, data: { winnerId: present, status: "DONE" } });
        if (m.nextMatchId && m.nextSlot) await putTeam(m.nextMatchId, m.nextSlot, present);
    }
}

// Turnir o'yini natijasi: g'olibni keyingiga, mag'lubni (yarim finalда) 3-o'ringa o'tkazadi + Elo.
export async function recordTournamentResult(matchId: string, a: number, b: number): Promise<{ ok: boolean; error?: string; winnerId?: string }> {
    const m = await prisma.esMatch.findUnique({ where: { id: matchId } });
    if (!m) return { ok: false, error: "O'yin topilmadi" };
    if (m.status === "DONE") return { ok: false, error: "Natija allaqachon kiritilgan" };
    if (!m.teamAId || !m.teamBId) return { ok: false, error: "Ikki jamoa to'liq emas" };
    if (a === b) return { ok: false, error: "Durang bo'lmaydi — g'olib aniq bo'lsin" };

    const winnerId = a > b ? m.teamAId : m.teamBId;
    const loserId = a > b ? m.teamBId : m.teamAId;

    await prisma.esMatch.update({ where: { id: matchId }, data: { scoreA: a, scoreB: b, winnerId, status: "DONE" } });
    if (m.nextMatchId && m.nextSlot) await putTeam(m.nextMatchId, m.nextSlot, winnerId);
    if (m.loserNextMatchId && m.loserNextSlot) await putTeam(m.loserNextMatchId, m.loserNextSlot, loserId);

    // Elo (turnir o'yini ham reytingni yangilaydi)
    const t = await prisma.esTournament.findUnique({ where: { id: m.tournamentId }, select: { gameId: true } });
    if (t) {
        const [rw, rl] = await Promise.all([
            prisma.esRoster.findUnique({ where: { teamId_gameId: { teamId: winnerId, gameId: t.gameId } }, select: { id: true, rating: true } }),
            prisma.esRoster.findUnique({ where: { teamId_gameId: { teamId: loserId, gameId: t.gameId } }, select: { id: true, rating: true } }),
        ]);
        if (rw && rl) {
            const { newA, newB } = applyElo(rw.rating, rl.rating, true);
            await prisma.$transaction([
                prisma.esRoster.update({ where: { id: rw.id }, data: { rating: newA } }),
                prisma.esRoster.update({ where: { id: rl.id }, data: { rating: newB } }),
            ]);
        }
    }
    return { ok: true, winnerId };
}
