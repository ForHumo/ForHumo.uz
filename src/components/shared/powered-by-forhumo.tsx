"use client";

// Har For Humo loyihasida (BN, Nexus, Market, For Pay, eSport) footer'da:
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

            {/* For Humo rasmiy logo */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
                src="/logos/forhumo.png"
                alt=""
                aria-hidden="true"
                width={small ? 16 : 20}
                height={small ? 16 : 20}
                className="object-contain"
                style={{ width: small ? 16 : 20, height: small ? 16 : 20 }}
            />

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
