"use client";

// Har For Humo loyihasida (BN, Nexus, Market, ALKH Pay, eSport) footer'da:
//     "Powered by [logo] For Humo"
// Foydalanuvchi so'rovi: "For Humo" qalin va brend rangida (ko'k gradient)
// bo'lsin.

interface Props {
    /** true = kichik shrift (footer uchun); false = katta */
    small?: boolean;
    /** Havola URL — default forhumo.uz */
    href?: string;
}

export function PoweredByForHumo({ small = true, href = "https://forhumo.uz" }: Props) {
    return (
        <a
            href={href}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 opacity-80 hover:opacity-100 transition-opacity"
            aria-label="Powered by For Humo"
        >
            <span
                className="tracking-wide"
                style={{
                    fontSize: small ? 11 : 13,
                    color: "currentColor",
                    fontWeight: 500,
                    opacity: 0.7,
                }}
            >
                Powered by
            </span>

            {/* Uchburchak / paper-plane belgi (For Humo ramzi — brend rangida) */}
            <svg
                width={small ? 12 : 14}
                height={small ? 12 : 14}
                viewBox="0 0 24 24"
                fill="none"
                aria-hidden="true"
                style={{ marginTop: 1 }}
            >
                <defs>
                    <linearGradient id="fh-mark-grad" x1="0" y1="0" x2="24" y2="24" gradientUnits="userSpaceOnUse">
                        <stop offset="0%" stopColor="#2B3EE8" />
                        <stop offset="100%" stopColor="#00CEC8" />
                    </linearGradient>
                </defs>
                <path
                    d="M22 2 L2 11 L10 13 L13 22 Z"
                    fill="url(#fh-mark-grad)"
                />
            </svg>

            <span
                style={{
                    fontSize: small ? 12 : 15,
                    fontWeight: 900,
                    letterSpacing: "-0.01em",
                    background: "linear-gradient(90deg, #2B3EE8 0%, #00CEC8 100%)",
                    WebkitBackgroundClip: "text",
                    WebkitTextFillColor: "transparent",
                    backgroundClip: "text",
                }}
            >
                For Humo
            </span>
        </a>
    );
}
