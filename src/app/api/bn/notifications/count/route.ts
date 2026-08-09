import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getBnAuth } from "@/lib/bn-auth";

export async function GET() {
    const auth = await getBnAuth();
    if (!auth) return NextResponse.json({ unreadCount: 0 });
    const unreadCount = await prisma.bnNotification.count({
        where: { profileId: auth.profileId, read: false },
    });
    return NextResponse.json({ unreadCount });
}
