// BN referral leaderboard — TOP 10 chaqiruvchi.
// Ochiq endpoint (login shart emas), 15 daqiqa cache.
// Foydalanuvchi ma'lumotlari: username (yoki humoId), name (bosh harflari), image.
// Privacy: telefon/email hech qachon chiqmaydi.

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";
export const revalidate = 900;   // 15 daqiqa

interface Row {
    rank: number;
    inviterId: string;
    username: string | null;
    humoId: string | null;
    name: string | null;
    image: string | null;
    invited: number;   // muvaffaqiyatli (REWARDED) chaqirilganlar
    earned: number;    // umumiy so'm
}

export async function GET() {
    const grouped = await prisma.bnReferral.groupBy({
        by: ["inviterId"],
        where: { status: "REWARDED" },
        _count: { _all: true },
        _sum: { inviterReward: true },
        orderBy: [
            { _count: { inviterId: "desc" } },
        ],
        take: 10,
    }).catch(() => []);

    if (grouped.length === 0) {
        return NextResponse.json({ leaderboard: [] });
    }

    const ids = grouped.map(g => g.inviterId);
    const profs = await prisma.userProfile.findMany({
        where: { id: { in: ids } },
        select: { id: true, username: true, humoId: true, name: true, image: true },
    });
    const profById = new Map(profs.map(p => [p.id, p]));

    const rows: Row[] = grouped.map((g, i) => {
        const p = profById.get(g.inviterId);
        return {
            rank: i + 1,
            inviterId: g.inviterId,
            username: p?.username ?? null,
            humoId: p?.humoId ?? null,
            name: p?.name ?? null,
            image: p?.image ?? null,
            invited: g._count._all,
            earned: g._sum.inviterReward ?? 0,
        };
    });

    return NextResponse.json({ leaderboard: rows });
}
