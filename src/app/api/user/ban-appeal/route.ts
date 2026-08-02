import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// POST /api/user/ban-appeal — bloklangan foydalanuvchi ariza yuboradi.
// body: { banId: string, text: string }
// Faqat ba'zi shartlar:
//   - Ariza faqat o'z ban'iga
//   - Ariza faqat bir marta bir ban uchun (appealAt bo'lmasa)
export async function POST(req: Request) {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const me = await prisma.userProfile.findUnique({
        where: { email: session.user.email }, select: { id: true },
    });
    if (!me) return NextResponse.json({ error: "Profil topilmadi" }, { status: 404 });

    const { banId, text } = (await req.json()) as { banId?: string; text?: string };
    const clean = (text || "").trim().slice(0, 2000);
    if (!banId || !clean) return NextResponse.json({ error: "Ariza matni bo'sh bo'lmasin" }, { status: 400 });

    const ban = await prisma.userBan.findUnique({
        where: { id: banId }, select: { id: true, profileId: true, appealAt: true, lifted: true },
    });
    if (!ban) return NextResponse.json({ error: "Bloklash topilmadi" }, { status: 404 });
    if (ban.profileId !== me.id) return NextResponse.json({ error: "Ruxsat yo'q" }, { status: 403 });
    if (ban.appealAt) return NextResponse.json({ error: "Ariza allaqachon yuborilgan" }, { status: 400 });
    if (ban.lifted) return NextResponse.json({ error: "Bloklash allaqachon bekor qilingan" }, { status: 400 });

    await prisma.userBan.update({
        where: { id: banId },
        data: { appealAt: new Date(), appealText: clean },
    });
    return NextResponse.json({ ok: true });
}

// GET /api/user/ban-appeal — mening aktiv/eskirmagan bloklarim (bor bo'lsa)
export async function GET() {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const me = await prisma.userProfile.findUnique({
        where: { email: session.user.email }, select: { id: true },
    });
    if (!me) return NextResponse.json({ error: "Profil topilmadi" }, { status: 404 });

    const bans = await prisma.userBan.findMany({
        where: {
            profileId: me.id,
            lifted: false,
            OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
        },
        orderBy: { issuedAt: "desc" }, take: 5,
        select: {
            id: true, level: true, reason: true, category: true, issuedAt: true, expiresAt: true,
            appealAt: true, contextSnippet: true,
        },
    });
    return NextResponse.json({ bans });
}
