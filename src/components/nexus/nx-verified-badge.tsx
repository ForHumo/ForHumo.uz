"use client";

// Kategoriyaga oid tasdiq belgisi — profil ismi yonida ko'rinadi.
// Foydalanuvchining verifiedCategory'siga qarab ikon va rang tanlaydi.
// Kategoriya bo'lmasa (founder yoki eski) — an'anaviy ko'k BadgeCheck.

import { getVerifiedIcon } from "@/lib/verified-categories";

interface Props {
    category?: string | null;
    /** Piksel diametri. Default 14. */
    size?: number;
    /** Tooltip'da to'liq matn (default: kategoriya nomi) */
    title?: string;
    className?: string;
}

export function NxVerifiedBadge({ category, size = 14, title, className = "" }: Props) {
    const { Icon, color, label } = getVerifiedIcon(category);
    return (
        <span title={title ?? label} className={`inline-flex items-center justify-center flex-shrink-0 ${className}`}>
            <Icon
                className=""
                style={{ width: size, height: size, color, filter: `drop-shadow(0 0 3px ${color}40)` }}
                strokeWidth={2.5}
            />
        </span>
    );
}
