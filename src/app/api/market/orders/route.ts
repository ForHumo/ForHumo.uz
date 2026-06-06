import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) return NextResponse.json({ orders: [] });
    const profile = await prisma.userProfile.findUnique({ where: { email: session.user.email } });
    if (!profile) return NextResponse.json({ orders: [] });

    const orders = await prisma.marketOrder.findMany({
        where: { profileId: profile.id },
        include: {
            items: {
                include: {
                    product: {
                        select: { name: true, slug: true, images: true, brand: { select: { name: true } } },
                    },
                },
            },
        },
        orderBy: { createdAt: "desc" },
    });
    return NextResponse.json({ orders });
}
