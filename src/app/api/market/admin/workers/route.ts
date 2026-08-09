// Owner: worker'lar boshqaruvi.
//
//   GET  /api/market/admin/workers          → ro'yxat
//   POST /api/market/admin/workers          → yangi worker (body: { username })
//     — @username orqali qidiradi, ID orqali saqlaydi

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getMarketStaff } from "@/lib/market-staff";
import { isFounderProfile } from "@/lib/founders";

export async function GET() {
    const staff = await getMarketStaff();
    if (!staff || !staff.isOwner) return NextResponse.json({ error: "forbidden" }, { status: 403 });

    const workers = await prisma.marketWorker.findMany({
        orderBy: { createdAt: "desc" },
        include: {
            profile: { select: { id: true, username: true, name: true, image: true, humoId: true } },
            addedByProfile: { select: { username: true, name: true } },
        },
    });
    return NextResponse.json({
        items: workers.map(w => ({
            id: w.id,
            profileId: w.profileId,
            username: w.profile.username,
            name: w.profile.name,
            image: w.profile.image,
            humoId: w.profile.humoId,
            addedBy: w.addedByProfile.username ?? w.addedByProfile.name,
            createdAt: w.createdAt.toISOString(),
        })),
    });
}

export async function POST(req: Request) {
    const staff = await getMarketStaff();
    if (!staff || !staff.isOwner) return NextResponse.json({ error: "forbidden" }, { status: 403 });

    const body = await req.json().catch(() => null);
    const raw = String(body?.username ?? "").trim().replace(/^@/, "");
    if (!raw || raw.length < 2) return NextResponse.json({ error: "invalid_username" }, { status: 400 });

    const target = await prisma.userProfile.findUnique({
        where: { username: raw },
        select: { id: true, username: true, name: true, image: true, humoId: true },
    });
    if (!target) return NextResponse.json({ error: `@${raw} topilmadi` }, { status: 404 });

    if (isFounderProfile(target)) {
        return NextResponse.json({ error: "Founder allaqachon owner" }, { status: 400 });
    }
    if (target.id === staff.profileId) {
        return NextResponse.json({ error: "O'zingizni qo'sha olmaysiz" }, { status: 400 });
    }

    try {
        const w = await prisma.marketWorker.create({
            data: { profileId: target.id, addedByProfileId: staff.profileId },
        });
        return NextResponse.json({
            ok: true,
            worker: {
                id: w.id, profileId: target.id,
                username: target.username, name: target.name,
                image: target.image, humoId: target.humoId,
                createdAt: w.createdAt.toISOString(),
            },
        });
    } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        if (msg.includes("P2002")) return NextResponse.json({ error: "Bu foydalanuvchi allaqachon worker" }, { status: 409 });
        return NextResponse.json({ error: "create_failed" }, { status: 500 });
    }
}
