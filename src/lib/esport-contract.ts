// O'yinchi shartnomasi lifecycle — transfer yaratadi, chiqish TERMINATED qiladi, muddat o'tsa EXPIRED.
import { prisma } from "@/lib/prisma";

// Oyni sanaga to'g'ri qo'shadi (30 kun emas — kalendar oy).
export function addMonths(from: Date, months: number): Date {
    const d = new Date(from);
    d.setMonth(d.getMonth() + months);
    return d;
}

// Sportchining barcha faol shartnomalarini bekor qiladi (chiqish/chiqarish/transfer chiqishi).
export async function terminateContracts(athleteId: string) {
    await prisma.esContract.updateMany({ where: { athleteId, status: "ACTIVE" }, data: { status: "TERMINATED" } });
}

// Ko'rsatish uchun haqiqiy holat: ACTIVE bo'lsa-yu muddati o'tgan bo'lsa — EXPIRED.
export function effectiveStatus(c: { status: string; endsAt: Date | null }): string {
    if (c.status === "ACTIVE" && c.endsAt && c.endsAt.getTime() < Date.now()) return "EXPIRED";
    return c.status;
}
