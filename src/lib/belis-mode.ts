// Belis ish rejimi — test / live.
// Env: NEXT_PUBLIC_BELIS_MODE = "test" (default) | "live"
// Live rejimga o'tish: env qo'yiladi va rebuild (yoki Vercel'da qayta deploy).

export type BelisMode = "test" | "live";

export function belisMode(): BelisMode {
    const v = (process.env.NEXT_PUBLIC_BELIS_MODE ?? "test").toLowerCase();
    return v === "live" ? "live" : "test";
}

export function isBelisTest(): boolean {
    return belisMode() === "test";
}
