// Support badge: umumiy o'qilmagan admin xabarlar soni.

import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
    const s = await getServerSession(authOptions);
    if (!s?.user?.email) return NextResponse.json({ count: 0 });

    const p = await prisma.userProfile.findUnique({
        where: { email: s.user.email }, select: { id: true },
    });
    if (!p) return NextResponse.json({ count: 0 });

    const count = await prisma.supportMessage.count({
        where: {
            authorRole: "ADMIN",
            readByUser: false,
            ticket: { profileId: p.id },
        },
    });
    return NextResponse.json({ count });
}
