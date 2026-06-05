"use client";

// Rasmiy tasdiqlangan brend belgisi — to'liq yashil
export function VerifiedBadge({ size = 14 }: { size?: number }) {
    return (
        <svg width={size} height={size} viewBox="0 0 20 20" fill="none" aria-label="Tasdiqlangan brend">
            <circle cx="10" cy="10" r="10" fill="#16a34a" />
            <path
                d="M6 10.5L8.5 13L14 7.5"
                stroke="white"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
            />
        </svg>
    );
}
