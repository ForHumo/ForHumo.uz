// AI endpointlari uchun yagona darvoza: auth + rate-limit + chaqiruv jurnali.
// Pullik Gemini'ni suiiste'mol qilishni (ayniqsa anonim/cheksiz chaqiruvni) to'sadi.

import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { nexusRateLimited } from "@/lib/nexus-rate";

export type AiGateResult =
    | { ok: true; profileId: string }
    | { ok: false; status: number; error: string };

// Sessiya + profil + tezlik cheklovini tekshiradi va chaqiruvni jurnal qiladi.
// kind faqat statistika uchun ("chat"|"search"|"listing"|"assist").
export async function aiGate(kind?: string): Promise<AiGateResult> {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) return { ok: false, status: 401, error: "Avval tizimga kiring" };
    const me = await prisma.userProfile.findUnique({ where: { email: session.user.email }, select: { id: true } });
    if (!me) return { ok: false, status: 404, error: "Profil topilmadi" };
    if (await nexusRateLimited(me.id, "ai")) return { ok: false, status: 429, error: "Juda ko'p AI so'rovi — biroz kutib, qayta urinib ko'ring" };
    await prisma.aiUsage.create({ data: { profileId: me.id, kind: kind ?? null } }).catch(() => { });
    return { ok: true, profileId: me.id };
}
