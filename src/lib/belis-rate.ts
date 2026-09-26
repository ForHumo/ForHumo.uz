// Belis endpointlari uchun DB-asosli rate limit.
// Serverless-safe (in-memory ishonchsiz). Fail-open — DB xatosida ochiq qoladi.

import { prisma } from "@/lib/prisma";

const MIN = 60_000;

type BelisRateKind = "bookingCreate" | "aiChat" | "passportUpload";

const RULES: Record<BelisRateKind, [max: number, windowMs: number]> = {
    bookingCreate:  [5,   60 * MIN],      // 5 ariza / soat / profil
    aiChat:         [120, 24 * 60 * MIN], // 120 AI so'rov / kun / profil (barcha modul: /ai, Belis, BN, Support...)
    passportUpload: [10,  60 * MIN],      // 10 rasm / soat / profil
};

export interface BelisRateResult {
    limited: boolean;
    max: number;
    used: number;
    windowMinutes: number;
}

export async function belisRate(profileId: string, kind: BelisRateKind): Promise<BelisRateResult> {
    const [max, windowMs] = RULES[kind];
    const since = new Date(Date.now() - windowMs);
    const windowMinutes = Math.round(windowMs / MIN);
    let used = 0;

    try {
        switch (kind) {
            case "bookingCreate":
                used = await prisma.belisRentalBooking.count({
                    where: { buyerId: profileId, createdAt: { gt: since } },
                });
                break;
            case "aiChat":
                // Foydalanuvchining haqiqiy AI so'rovlari — oxirgi 24 soatdagi user xabarlari
                // (barcha AI suhbatlari bo'yicha). Ilgari faqat kind:"belis" sanardi — /ai/chat
                // amalda cheklanmasdi (mis-wire). Endi real so'rovlarni sanaymiz.
                used = await prisma.aiMessage.count({
                    where: { role: "user", createdAt: { gt: since }, conversation: { profileId } },
                });
                break;
            case "passportUpload":
                // Alohida jadval yo'q — profil booking'lariga qarab hisoblaymiz
                used = await prisma.belisRentalBooking.count({
                    where: { buyerId: profileId, createdAt: { gt: since }, passportUrl: { not: null } },
                });
                break;
        }
    } catch {
        // Fail-open — DB tushib qolsa foydalanuvchi bloklanmasin
        return { limited: false, max, used: 0, windowMinutes };
    }

    return { limited: used >= max, max, used, windowMinutes };
}

export const BELIS_RATE_MSG = "Juda ko'p urinish — biroz kutib qayta urinib ko'ring";
