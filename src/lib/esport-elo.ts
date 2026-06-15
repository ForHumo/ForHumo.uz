// Elo kuch reytingi — har o'yindan keyin yangilanadi. Boshlang'ich 1000 (EsRoster.rating).
// 1000 bazaviy chiziq, undan yuqori = o'rtachadan kuchli. Turnir seeding shu bo'yicha.

const K = 32;            // o'zgarish kuchi
export const ELO_BASE = 1000;

// Kutilgan natija (A ning g'alaba ehtimoli)
function expected(ratingA: number, ratingB: number): number {
    return 1 / (1 + Math.pow(10, (ratingB - ratingA) / 400));
}

// O'yindan keyin ikki jamoaning yangi reytingi (zero-sum: A oladi, B yo'qotadi)
export function applyElo(ratingA: number, ratingB: number, aWon: boolean): { newA: number; newB: number } {
    const delta = Math.round(K * ((aWon ? 1 : 0) - expected(ratingA, ratingB)));
    return { newA: ratingA + delta, newB: ratingB - delta };
}
