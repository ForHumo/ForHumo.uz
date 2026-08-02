// Ishtirokchi chiqib ketganini belgilaydi (leftAt).
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

type Ctx = { params: Promise<{ id: string }> };

export async function POST(_req: Request, { params }: Ctx) {
    const { id } = await params;
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) return NextResponse.json({ error: "Kirish talab" }, { status: 401 });
    const me = await prisma.userProfile.findUnique({ where: { email: session.user.email }, select: { id: true } });
    if (!me) return NextResponse.json({ error: "Profil topilmadi" }, { status: 404 });

    await prisma.nexusGroupCallParticipant.updateMany({
        where: { groupCallId: id, profileId: me.id, leftAt: null },
        data: { leftAt: new Date() },
    }).catch(() => { });
    return NextResponse.json({ ok: true });
}
