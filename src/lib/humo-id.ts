// Humo ID generatsiyasi — <DAVLAT_PREFIKS><7 raqam>. Sessiya kerak emas
// (Telegram-telefon ro'yxatida, hali hisob yaratilmasdan oldin chaqiriladi).

import { prisma } from "@/lib/prisma";

// Davlat (ISO-2) → Humo ID prefiks. Ro'yxatda yo'q bo'lsa — "WW" (dunyo).
const PREFIX_MAP: Record<string, string> = {
    UZ: "UZ", RU: "RU", KZ: "KZ", KG: "KG", TJ: "TJ",
    TM: "TM", AZ: "AZ", GE: "GE", TR: "TR",
    DE: "DE", FR: "FR", GB: "GB", US: "US",
    KR: "KR", JP: "JP", CN: "CN", IN: "IN",
    AE: "AE", SA: "SA",
};

export function countryToPrefix(country?: string | null): string {
    return PREFIX_MAP[(country || "").toUpperCase()] ?? "WW";
}

const pad7 = (n: number) => String(n).padStart(7, "0");

/** Noyob Humo ID yaratadi. Topa olmasa null (juda kam ehtimol). */
export async function generateHumoId(country?: string | null): Promise<string | null> {
    const prefix = countryToPrefix(country);
    for (let attempt = 0; attempt < 20; attempt++) {
        const digits = Math.floor(1_000_000 + Math.random() * 9_000_000); // 1000000–9999999
        const humoId = `${prefix}${pad7(digits)}`;
        const exists = await prisma.userProfile.findUnique({ where: { humoId }, select: { id: true } });
        if (!exists) return humoId;
    }
    return null;
}
