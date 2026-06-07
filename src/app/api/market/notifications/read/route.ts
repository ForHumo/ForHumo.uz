import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// POST — barchasini (yoki bittasini) o'qilgan deb belgilash
export async function POST(req: Request) {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const profile = await prisma.userProfile.findUnique({ where: { email: session.user.email } });
    if (!profile) return NextResponse.json({ error: "Profil topilmadi" }, { status: 404 });

    const { id } = await req.json().catch(() => ({ id: undefined }));
    await prisma.marketNotification.updateMany({
        where: { profileId: profile.id, ...(id ? { id } : {}), read: false },
        data: { read: true },
    });
    return NextResponse.json({ ok: true });
}
