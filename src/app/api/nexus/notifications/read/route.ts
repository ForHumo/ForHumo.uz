import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// POST /api/nexus/notifications/read — body { id? }: bittasini yoki hammasini o'qilgan
export async function POST(req: Request) {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const me = await prisma.userProfile.findUnique({ where: { email: session.user.email }, select: { id: true } });
    if (!me) return NextResponse.json({ error: "Profil topilmadi" }, { status: 404 });

    const { id } = await req.json().catch(() => ({ id: undefined })) as { id?: string };
    if (id) await prisma.nexusNotification.updateMany({ where: { id, recipientId: me.id }, data: { read: true } });
    else await prisma.nexusNotification.updateMany({ where: { recipientId: me.id, read: false }, data: { read: true } });

    return NextResponse.json({ ok: true });
}
