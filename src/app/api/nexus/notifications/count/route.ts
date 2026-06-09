import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// GET /api/nexus/notifications/count — o'qilmagan soni (qo'ng'iroq badge)
export async function GET() {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) return NextResponse.json({ unread: 0 });
    const me = await prisma.userProfile.findUnique({ where: { email: session.user.email }, select: { id: true } });
    if (!me) return NextResponse.json({ unread: 0 });
    const unread = await prisma.nexusNotification.count({ where: { recipientId: me.id, read: false } });
    return NextResponse.json({ unread });
}
