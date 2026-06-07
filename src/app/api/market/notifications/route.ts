import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// GET — bildirishnomalar ro'yxati + o'qilmaganlar soni
export async function GET() {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) return NextResponse.json({ items: [], unread: 0 });
    const profile = await prisma.userProfile.findUnique({ where: { email: session.user.email } });
    if (!profile) return NextResponse.json({ items: [], unread: 0 });

    const [items, unread] = await Promise.all([
        prisma.marketNotification.findMany({
            where: { profileId: profile.id },
            orderBy: { createdAt: "desc" },
            take: 50,
        }),
        prisma.marketNotification.count({ where: { profileId: profile.id, read: false } }),
    ]);
    return NextResponse.json({ items, unread });
}
