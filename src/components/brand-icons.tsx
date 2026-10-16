"use client";

// Rasmiy brand logolari — inline SVG (Telegram, WhatsApp) + Image (For Pay).
// Har joyda bir xil qilingan brand toza tanilishi uchun.

import Image from "next/image";
import { useId } from "react";

export function TelegramIcon({ className = "w-4 h-4" }: { className?: string }) {
    return (
        <svg viewBox="0 0 24 24" className={className} fill="currentColor" aria-hidden="true">
            <path d="M9.78 18.65l.28-4.23 7.68-6.92c.34-.31-.07-.46-.52-.19L7.74 13.24 3.64 11.95c-.88-.25-.89-.86.2-1.3l15.97-6.16c.73-.33 1.43.18 1.15 1.3l-2.72 12.81c-.19.91-.74 1.13-1.5.7L12.6 16.3l-1.99 1.93c-.23.23-.42.42-.83.42z"/>
        </svg>
    );
}

export function WhatsAppIcon({ className = "w-4 h-4" }: { className?: string }) {
    return (
        <svg viewBox="0 0 24 24" className={className} fill="currentColor" aria-hidden="true">
            <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.174.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51l-.57-.01c-.198 0-.52.074-.792.372s-1.04 1.016-1.04 2.479 1.065 2.876 1.213 3.074c.149.198 2.096 3.2 5.077 4.487.71.306 1.263.489 1.695.625.712.226 1.36.194 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347zM12.05 21.785h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884zm8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
        </svg>
    );
}

// ── To'liq rangli rasmiy logolar (Telegram 2021+ / WhatsApp joriy) ─────────
// Yuqoridagi mono ikonkalar `currentColor` oladi; bular esa brendning o'z
// ranglarida (doira ichida) chiziladi — "Telegram'da yozish" kabi tugmalar uchun.

export function TelegramLogo({ size = 20, className = "" }: { size?: number; className?: string }) {
    const gid = `tg-${useId().replace(/:/g, "")}`;
    return (
        <svg viewBox="0 0 24 24" width={size} height={size} className={className} aria-hidden="true">
            <defs>
                <linearGradient id={gid} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0" stopColor="#2AABEE" />
                    <stop offset="1" stopColor="#229ED9" />
                </linearGradient>
            </defs>
            <circle cx="12" cy="12" r="12" fill={`url(#${gid})`} />
            <path
                fill="#FFFFFF"
                d="M16.906 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z"
            />
        </svg>
    );
}

export function WhatsAppLogo({ size = 20, className = "" }: { size?: number; className?: string }) {
    return (
        <svg viewBox="0 0 24 24" width={size} height={size} className={className} aria-hidden="true">
            <circle cx="12" cy="12" r="12" fill="#25D366" />
            <g transform="translate(5.04 4.92) scale(0.58)">
                <path
                    fill="#FFFFFF"
                    d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.174.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51l-.57-.01c-.198 0-.52.074-.792.372s-1.04 1.016-1.04 2.479 1.065 2.876 1.213 3.074c.149.198 2.096 3.2 5.077 4.487.71.306 1.263.489 1.695.625.712.226 1.36.194 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347zM12.05 21.785h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884zm8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"
                />
            </g>
        </svg>
    );
}

export function GmailIcon({ className = "w-4 h-4" }: { className?: string }) {
    return (
        <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <rect x="3" y="5" width="18" height="14" rx="2" />
            <path d="M3 7l9 6 9-6" />
        </svg>
    );
}

// For Humo modul logolari — PNG'lar `/public/logos/` da
export function ForPayLogo({ size = 20, className = "" }: { size?: number; className?: string }) {
    return <Image src="/logos/for-pay.png" alt="For Pay" width={size} height={size} className={`object-contain ${className}`} />;
}
export function HumoNexusLogo({ size = 20, className = "" }: { size?: number; className?: string }) {
    return <Image src="/logos/humo-nexus.png" alt="Humo Nexus" width={size} height={size} className={`object-contain ${className}`} />;
}
export function HumoSupportLogo({ size = 20, className = "" }: { size?: number; className?: string }) {
    return <Image src="/logos/humo-support.png" alt="Humo Support" width={size} height={size} className={`object-contain ${className}`} />;
}
export function HumoAiLogo({ size = 20, className = "" }: { size?: number; className?: string }) {
    return <Image src="/logos/humo-ai.png" alt="Humo AI" width={size} height={size} className={`object-contain ${className}`} />;
}
export function HumoIdLogo({ size = 20, className = "" }: { size?: number; className?: string }) {
    return <Image src="/logos/humo-id.png" alt="Humo ID" width={size} height={size} className={`object-contain ${className}`} />;
}
export function HumoMarketLogo({ size = 20, className = "" }: { size?: number; className?: string }) {
    return <Image src="/logos/humo-market.png" alt="Humo Market" width={size} height={size} className={`object-contain ${className}`} />;
}
export function ForHumoLogo({ size = 20, className = "" }: { size?: number; className?: string }) {
    return <Image src="/logos/forhumo.png" alt="For Humo" width={size} height={size} className={`object-contain ${className}`} />;
}
