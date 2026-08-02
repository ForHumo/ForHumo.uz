// Nexus Verified Badge kategoriyalari — YouTube uslubi lekin kengaytirilgan.
// Foydalanuvchi (asoschi orqali) tasdiqlanganda kategoriya beriladi.
// Har kategoriyaning o'z ikon va rangi bor.

import { Music, Clapperboard, BookOpen, Trophy, PenLine, Play, Gamepad2, Smile, Building2, Landmark, BadgeCheck } from "lucide-react";

export type VerifiedCategory =
    | "musician" | "filmmaker" | "author" | "sportsman" | "journalist"
    | "creator"  | "gamer"     | "entertainer" | "organization" | "government";

export interface VerifiedCategoryInfo {
    key: VerifiedCategory;
    label: string;           // Ta'rif (o'zbek tilida)
    shortLabel: string;      // Qisqa nomi (badge tooltip'ida)
    icon: React.ComponentType<{ className?: string; style?: React.CSSProperties; strokeWidth?: number }>;
    color: string;           // HEX yoki css color
    description: string;     // Ariza kim uchun ekanini tushuntiradi
}

export const VERIFIED_CATEGORIES: Record<VerifiedCategory, VerifiedCategoryInfo> = {
    musician: {
        key: "musician",
        label: "Musiqachi",
        shortLabel: "Musiqachi",
        icon: Music,
        color: "#A855F7",   // Purple
        description: "Rasmiy albom, single yoki trek chiqargan ijodkorlar",
    },
    filmmaker: {
        key: "filmmaker",
        label: "Kinochi / Rejissyor",
        shortLabel: "Kinochi",
        icon: Clapperboard,
        color: "#EF4444",   // Red
        description: "Rasmiy film, serial yoki qisqametrajli asar egasi",
    },
    author: {
        key: "author",
        label: "Yozuvchi / Kitob muallifi",
        shortLabel: "Yozuvchi",
        icon: BookOpen,
        color: "#F59E0B",   // Amber
        description: "Nashr etilgan kitob yoki jurnal muallifi",
    },
    sportsman: {
        key: "sportsman",
        label: "Sportchi",
        shortLabel: "Sportchi",
        icon: Trophy,
        color: "#EAB308",   // Gold
        description: "Milliy yoki xalqaro darajadagi sportchi",
    },
    journalist: {
        key: "journalist",
        label: "Jurnalist / Bloger",
        shortLabel: "Jurnalist",
        icon: PenLine,
        color: "#3B82F6",   // Blue
        description: "Haqiqiy blog yozadigan jurnalist yoki muxbir",
    },
    creator: {
        key: "creator",
        label: "Kontent yaratuvchi",
        shortLabel: "Kontentmaker",
        icon: Play,
        color: "#00CEC8",   // Teal (Nexus brand)
        description: "Video, podkast yoki umumiy kontent yaratuvchi",
    },
    gamer: {
        key: "gamer",
        label: "Gamer / eSport",
        shortLabel: "Gamer",
        icon: Gamepad2,
        color: "#10B981",   // Green
        description: "Kiberga oid kontent, eSport ishtirokchisi",
    },
    entertainer: {
        key: "entertainer",
        label: "Vayner / Komik",
        shortLabel: "Vayner",
        icon: Smile,
        color: "#EC4899",   // Pink
        description: "Kulgu, sketch, ko'ngilochar kontent",
    },
    organization: {
        key: "organization",
        label: "Rasmiy tashkilot / OAV",
        shortLabel: "Tashkilot",
        icon: Building2,
        color: "#64748B",   // Slate
        description: "Rasmiy kompaniya, ommaviy axborot vositasi yoki brend",
    },
    government: {
        key: "government",
        label: "Davlat organi",
        shortLabel: "Davlat",
        icon: Landmark,
        color: "#1E3A8A",   // Navy
        description: "Rasmiy davlat idorasi yoki mansabdor",
    },
};

export const VERIFIED_LIST = Object.values(VERIFIED_CATEGORIES);

/** Foydalanuvchi kategoriyaga qarab ikon+rang berish. Kategoriya bo'lmasa (founder yoki eski)
 *  standart ko'k BadgeCheck qaytaradi. */
export function getVerifiedIcon(category: string | null | undefined) {
    if (!category) {
        return { Icon: BadgeCheck, color: "#00CEC8", label: "Tasdiqlangan" };
    }
    const info = VERIFIED_CATEGORIES[category as VerifiedCategory];
    if (!info) return { Icon: BadgeCheck, color: "#00CEC8", label: "Tasdiqlangan" };
    return { Icon: info.icon, color: info.color, label: info.label };
}
