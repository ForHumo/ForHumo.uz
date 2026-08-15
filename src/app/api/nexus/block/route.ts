import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

async function resolveTarget(username?: string, profileId?: string): Promise<string | null> {
    if (profileId) return profileId;
    if (username) {
        const t = await prisma.userProfile.findUnique({ where: { username }, select: { id: true } });
        return t?.id ?? null;
    }
    return null;
}

// GET /api/nexus/block — men bloklagan foydalanuvchilar ro'yxati
export async function GET() {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const me = await prisma.userProfile.findUnique({ where: { email: session.user.email }, select: { id: true } });
    if (!me) return NextResponse.json({ error: "Profil topilmadi" }, { status: 404 });

    const blocks = await prisma.nexusBlock.findMany({
        where: { blockerId: me.id }, orderBy: { createdAt: "desc" },
    });
    const ids = blocks.map(b => b.blockedId);
    const profs = await prisma.userProfile.findMany({
        where: { id: { in: ids } },
        select: { id: true, name: true, username: true, image: true },
    });
    const pMap = Object.fromEntries(profs.map(p => [p.id, p]));
    const users = ids.map(id => pMap[id]).filter(Boolean)
        .map(u => ({ name: u.name, username: u.username, image: u.image }));
    return NextResponse.json({ users });
}

// POST /api/nexus/block — bloklash toggle ({ username } yoki { profileId })
// Bloklash mavjud follow'larni (ikki tomonlama) uzadi.
export async function POST(req: Request) {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const me = await prisma.userProfile.findUnique({ where: { email: session.user.email }, select: { id: true } });
    if (!me) return NextResponse.json({ error: "Profil topilmadi" }, { status: 404 });

    const { username, profileId } = await req.json();
    const targetId = await resolveTarget(username, profileId);
    if (!targetId) return NextResponse.json({ error: "Foydalanuvchi topilmadi" }, { status: 404 });
    if (targetId === me.id) return NextResponse.json({ error: "O'zingizni bloklay olmaysiz" }, { status: 400 });

    // Rasmiy tizim agentini bloklab bo'lmaydi (faqat mute qilinishi mumkin)
    const isSystemAgent = await prisma.nexusAgent.findFirst({
        where: { profileId: targetId, isSystem: true },
        select: { id: true },
    });
    if (isSystemAgent) {
        return NextResponse.json({
            error: "Rasmiy For Humo agentini bloklab bo'lmaydi. Ovozsizlantirish (mute) uchun chat menyusidan foydalaning.",
        }, { status: 400 });
    }

    const existing = await prisma.nexusBlock.findUnique({
        where: { blockerId_blockedId: { blockerId: me.id, blockedId: targetId } },
    });

    if (existing) {
        await prisma.nexusBlock.delete({ where: { id: existing.id } });
        return NextResponse.json({ blocked: false });
    }

    await prisma.$transaction([
        prisma.nexusBlock.create({ data: { blockerId: me.id, blockedId: targetId } }),
        // Ikki tomonlama follow'larni uzish
        prisma.nexusFollow.deleteMany({
            where: { OR: [
                { followerId: me.id, followingId: targetId },
                { followerId: targetId, followingId: me.id },
            ] },
        }),
    ]);
    return NextResponse.json({ blocked: true });
}
