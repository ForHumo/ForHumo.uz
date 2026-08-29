// Batch CQ — Streamer level (weighted score → level 1-100)
// Score = 0.4 * streams + 0.3 * (peak_max / 10) + 0.2 * (tips_uzs / 100k) + 0.1 * subs
// Level = ceil(score / 10)

export interface LevelStats {
    streams: number;
    peakMax: number;
    tipsSum: number;
    subs: number;
}

export function computeStreamerLevel(s: LevelStats): { level: number; tier: string; score: number } {
    const score =
        (s.streams * 0.4)
        + (s.peakMax / 10) * 0.3
        + (s.tipsSum / 100_000) * 0.2
        + (s.subs) * 0.1;
    const level = Math.max(1, Math.min(100, Math.ceil(score)));
    const tier =
        level >= 80 ? "DIAMOND"
            : level >= 60 ? "PLATINUM"
                : level >= 40 ? "GOLD"
                    : level >= 20 ? "SILVER"
                        : level >= 5 ? "BRONZE"
                            : "ROOKIE";
    return { level, tier, score: Math.round(score * 10) / 10 };
}

export const TIER_META: Record<string, { color: string; label: string }> = {
    ROOKIE: { color: "#94A3B8", label: "Yangi" },
    BRONZE: { color: "#B87333", label: "Bronza" },
    SILVER: { color: "#C0C0C0", label: "Kumush" },
    GOLD: { color: "#F59E0B", label: "Oltin" },
    PLATINUM: { color: "#00CEC8", label: "Platina" },
    DIAMOND: { color: "#8B5CF6", label: "Olmos" },
};
