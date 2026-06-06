import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

async function getProfile(email: string) {
    return prisma.userProfile.findUnique({ where: { email } });
}

// GET — wishlist
export async function GET() {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) return NextResponse.json({ items: [] });
    const profile = await getProfile(session.user.email);
    if (!profile) return NextResponse.json({ items: [] });

    const items = await prisma.marketWishlist.findMany({
        where: { profileId: profile.id },
        include: { product: { include: { brand: { select: { name: true, slug: true, verified: true } } } } },
        orderBy: { createdAt: "desc" },
    });
    // Qaysi productIds wishlistda borligini ham qaytaramiz
    const ids = items.map(i => i.productId);
    return NextResponse.json({ items, ids });
}

// POST — toggle (qo'shish/olib tashlash)
export async function POST(req: Request) {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const profile = await getProfile(session.user.email);
    if (!profile) return NextResponse.json({ error: "Profile not found" }, { status: 404 });

    const { productId } = await req.json();
    if (!productId) return NextResponse.json({ error: "productId kerak" }, { status: 400 });

    const existing = await prisma.marketWishlist.findUnique({
        where: { profileId_productId: { profileId: profile.id, productId } },
    });

    if (existing) {
        await prisma.marketWishlist.delete({ where: { id: existing.id } });
        return NextResponse.json({ liked: false });
    } else {
        await prisma.marketWishlist.create({ data: { profileId: profile.id, productId } });
        return NextResponse.json({ liked: true });
    }
}
