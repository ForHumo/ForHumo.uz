// Humo Market staff (owner + worker) auth qatlami.
// Owner = founder (isFounderProfile). Worker = MarketWorker jadvalida ID bo'yicha.
// Worker keyinchalik username o'zgartirsa ham qoladi (bog'lanish ID orqali).

import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { isFounderProfile } from "@/lib/founders";

export type MarketStaff = {
    profileId: string;
    username: string | null;
    isOwner: boolean;
    isWorker: boolean;
};

export async function getMarketStaff(): Promise<MarketStaff | null> {
    const s = await getServerSession(authOptions);
    if (!s?.user?.email) return null;
    const p = await prisma.userProfile.findUnique({
        where: { email: s.user.email },
        select: { id: true, username: true, humoId: true },
    });
    if (!p) return null;
    const isOwner = isFounderProfile(p);
    let isWorker = false;
    if (!isOwner) {
        const w = await prisma.marketWorker.findUnique({ where: { profileId: p.id }, select: { id: true } });
        isWorker = !!w;
    }
    if (!isOwner && !isWorker) return null;
    return { profileId: p.id, username: p.username, isOwner, isWorker };
}

export async function requireMarketStaff() {
    const staff = await getMarketStaff();
    if (!staff) return NextResponse.json({ error: "forbidden" }, { status: 403 });
    return staff;
}

export async function requireMarketOwner() {
    const staff = await getMarketStaff();
    if (!staff || !staff.isOwner) return NextResponse.json({ error: "forbidden" }, { status: 403 });
    return staff;
}

// Client hasStaff hook uchun light payload
export async function getMyStaffFlags(profileId: string | null | undefined): Promise<{ isOwner: boolean; isWorker: boolean }> {
    if (!profileId) return { isOwner: false, isWorker: false };
    const p = await prisma.userProfile.findUnique({
        where: { id: profileId },
        select: { username: true, humoId: true },
    });
    if (!p) return { isOwner: false, isWorker: false };
    const isOwner = isFounderProfile(p);
    if (isOwner) return { isOwner: true, isWorker: false };
    const w = await prisma.marketWorker.findUnique({ where: { profileId }, select: { id: true } });
    return { isOwner: false, isWorker: !!w };
}
