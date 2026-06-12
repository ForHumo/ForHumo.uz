import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// POST /api/nexus/mute — ovozsizlantirish toggle ({ username } yoki { profileId })
// Mute yumshoq: faqat men o'sha odamning kontentini tasmada ko'rmayman. U bilmaydi.
export async function POST(req: Request) {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const me = await prisma.userProfile.findUnique({ where: { email: session.user.email }, select: { id: true } });
    if (!me) return NextResponse.json({ error: "Profil topilmadi" }, { status: 404 });

    const { username, profileId } = await req.json();
    let targetId: string | null = profileId ?? null;
    if (!targetId && username) {
        const t = await prisma.userProfile.findUnique({ where: { username }, select: { id: true } });
        targetId = t?.id ?? null;
    }
    if (!targetId) return NextResponse.json({ error: "Foydalanuvchi topilmadi" }, { status: 404 });
    if (targetId === me.id) return NextResponse.json({ error: "O'zingizni mute qila olmaysiz" }, { status: 400 });

    const existing = await prisma.nexusMute.findUnique({
        where: { muterId_mutedId: { muterId: me.id, mutedId: targetId } },
    });
    if (existing) {
        await prisma.nexusMute.delete({ where: { id: existing.id } });
        return NextResponse.json({ muted: false });
    }
    await prisma.nexusMute.create({ data: { muterId: me.id, mutedId: targetId } });
    return NextResponse.json({ muted: true });
}
