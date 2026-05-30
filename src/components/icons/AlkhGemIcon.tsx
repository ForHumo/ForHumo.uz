/**
 * AlkhGemIcon — ALKH Pay brand icon
 *
 * Design spec (200 × 200 viewBox):
 *  • Stylised sharp downward-pointing V (gem silhouette)
 *  • Inner 'o' circle balanced at Y = 44, centred on the V axis
 *  • Exactly 3 horizontal cyber-strike lines cutting through the lower half
 *  • currentColor — inherits any CSS colour / Tailwind text-* class
 *
 * Named in honour of Muhammad ibn Musa al-Khwarizmi (ALKH),
 * father of algebra and algorithms.
 */

export function AlkhGemIcon({
    size = 24,
    className = "",
}: {
    size?: number;
    className?: string;
}) {
    return (
        <svg
            width={size}
            height={size}
            viewBox="0 0 200 200"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            className={className}
            aria-label="ALKH Pay"
        >
            {/* ── Sharp V (gem outline) ─────────────────────────────────── */}
            <path
                d="M10 8 L100 192 L190 8"
                stroke="currentColor"
                strokeWidth="14"
                strokeLinecap="square"
                strokeLinejoin="miter"
                fill="none"
            />

            {/* ── Inner 'o' circle at Y = 44 ───────────────────────────── */}
            <circle
                cx="100"
                cy="44"
                r="20"
                stroke="currentColor"
                strokeWidth="11"
                fill="none"
            />

            {/*
             * ── 3 cyber-strike lines — lower half ────────────────────────
             * Each line endpoint is calculated to sit just outside the V arms
             * at that Y, giving a "slicing through crystal" visual.
             *
             * V arm slope: Δx/Δy = 90 / 184 ≈ 0.489
             * x_left(y)  = 10 + (y - 8) × 0.489
             * x_right(y) = 190 − (y - 8) × 0.489
             * Lines extend ±6 px beyond the arms for the strike effect.
             */}

            {/* Line 1 — Y = 105 */}
            <line
                x1="44" y1="105"
                x2="156" y2="105"
                stroke="currentColor"
                strokeWidth="10"
                strokeLinecap="butt"
            />

            {/* Line 2 — Y = 138 */}
            <line
                x1="61" y1="138"
                x2="139" y2="138"
                stroke="currentColor"
                strokeWidth="10"
                strokeLinecap="butt"
            />

            {/* Line 3 — Y = 168 */}
            <line
                x1="76" y1="168"
                x2="124" y2="168"
                stroke="currentColor"
                strokeWidth="10"
                strokeLinecap="butt"
            />
        </svg>
    );
}
