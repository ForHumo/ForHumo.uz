import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function GET() {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
        return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }

    const profile = await prisma.userProfile.findUnique({
        where: { email: session.user.email },
        select: {
            lastLoginAt: true,
            loginEvents: {
                orderBy: { createdAt: "desc" },
                take: 5,
                select: { id: true, createdAt: true, ip: true },
            },
        },
    });

    return NextResponse.json(profile ?? { lastLoginAt: null, loginEvents: [] });
}
