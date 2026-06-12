import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { isFounderProfile } from "@/lib/founders";

// GET /api/nexus/verify — mening ariza holatim (founder bo'lsam: PENDING arizalar ro'yxati)
export async function GET() {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const me = await prisma.userProfile.findUnique({
        where: { email: session.user.email },
        select: { id: true, username: true, humoId: true, verified: true },
    });
    if (!me) return NextResponse.json({ error: "Profil topilmadi" }, { status: 404 });

    const isFounder = isFounderProfile(me);

    // Founder — ko'rib chiqilishi kerak bo'lgan arizalar
    let queue: unknown[] = [];
    if (isFounder) {
        const rows = await prisma.nexusVerifyRequest.findMany({
            where: { status: "PENDING" }, orderBy: { createdAt: "asc" }, take: 50,
        });
        const ids = rows.map(r => r.profileId);
        const profs = ids.length
            ? await prisma.userProfile.findMany({ where: { id: { in: ids } }, select: { id: true, name: true, username: true, image: true } })
            : [];
        const pMap = Object.fromEntries(profs.map(p => [p.id, p]));
        queue = rows.map(r => ({
            id: r.id, profileId: r.profileId, fullName: r.fullName, category: r.category,
            reason: r.reason, links: r.links, createdAt: r.createdAt,
            applicant: pMap[r.profileId] ? { name: pMap[r.profileId].name, username: pMap[r.profileId].username, image: pMap[r.profileId].image } : null,
        }));
    }

    const myReq = await prisma.nexusVerifyRequest.findUnique({ where: { profileId: me.id } });
    return NextResponse.json({
        verified: me.verified || isFounder,
        isFounder,
        request: myReq ? { status: myReq.status, createdAt: myReq.createdAt } : null,
        queue,
    });
}

// POST /api/nexus/verify — verifikatsiya arizasi berish
export async function POST(req: Request) {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const me = await prisma.userProfile.findUnique({
        where: { email: session.user.email },
        select: { id: true, username: true, humoId: true, verified: true },
    });
    if (!me) return NextResponse.json({ error: "Profil topilmadi" }, { status: 404 });
    if (me.verified || isFounderProfile(me)) return NextResponse.json({ error: "Siz allaqachon tasdiqlangansiz" }, { status: 400 });
    if (!me.username) return NextResponse.json({ error: "Avval username tanlang" }, { status: 400 });

    const { fullName, category, reason, links } = await req.json();
    if (!fullName?.trim() || !category?.trim() || !reason?.trim()) {
        return NextResponse.json({ error: "Ism, toifa va sabab kerak" }, { status: 400 });
    }
    const cleanLinks = Array.isArray(links)
        ? links.filter((l: unknown) => typeof l === "string" && l.trim()).map((l: string) => l.trim().slice(0, 200)).slice(0, 5)
        : [];

    // Mavjud arizani yangilaymiz (qayta ariza), aks holda yaratamiz; har doim PENDING
    await prisma.nexusVerifyRequest.upsert({
        where: { profileId: me.id },
        create: {
            profileId: me.id, fullName: String(fullName).trim().slice(0, 100),
            category: String(category).trim().slice(0, 60), reason: String(reason).trim().slice(0, 1000),
            links: cleanLinks, status: "PENDING",
        },
        update: {
            fullName: String(fullName).trim().slice(0, 100), category: String(category).trim().slice(0, 60),
            reason: String(reason).trim().slice(0, 1000), links: cleanLinks, status: "PENDING", reviewedBy: null, reviewedAt: null,
        },
    });
    return NextResponse.json({ ok: true });
}

// PATCH /api/nexus/verify — founder ariza ko'rib chiqadi { requestId, action: approve|reject }
export async function PATCH(req: Request) {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const me = await prisma.userProfile.findUnique({
        where: { email: session.user.email },
        select: { id: true, username: true, humoId: true },
    });
    if (!me || !isFounderProfile(me)) return NextResponse.json({ error: "Ruxsat yo'q" }, { status: 403 });

    const { requestId, action } = await req.json();
    const vr = await prisma.nexusVerifyRequest.findUnique({ where: { id: requestId } });
    if (!vr) return NextResponse.json({ error: "Ariza topilmadi" }, { status: 404 });

    if (action === "approve") {
        await prisma.$transaction([
            prisma.userProfile.update({ where: { id: vr.profileId }, data: { verified: true, verifiedAt: new Date() } }),
            prisma.nexusVerifyRequest.update({ where: { id: vr.id }, data: { status: "APPROVED", reviewedBy: me.id, reviewedAt: new Date() } }),
        ]);
        return NextResponse.json({ ok: true, status: "APPROVED" });
    }
    if (action === "reject") {
        await prisma.nexusVerifyRequest.update({ where: { id: vr.id }, data: { status: "REJECTED", reviewedBy: me.id, reviewedAt: new Date() } });
        return NextResponse.json({ ok: true, status: "REJECTED" });
    }
    return NextResponse.json({ error: "Noto'g'ri amal" }, { status: 400 });
}
