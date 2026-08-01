import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// GET /api/user/steam-link — joriy foydalanuvchi Steam holati
export async function GET() {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) return NextResponse.json({ linked: false });
    const me = await prisma.userProfile.findUnique({
        where: { email: session.user.email },
        select: { steamId64: true, steamPersona: true, steamAvatar: true, steamLinkedAt: true },
    });
    if (!me?.steamId64) return NextResponse.json({ linked: false });
    return NextResponse.json({
        linked: true,
        steamId64: me.steamId64,
        persona: me.steamPersona,
        avatar: me.steamAvatar,
        linkedAt: me.steamLinkedAt,
    });
}

// DELETE /api/user/steam-link — Steam bog'lanishini uzish
// CS2 sportchi profili mavjud bo'lsa — uzib bo'lmaydi (avval sportchi profilini o'chirish kerak)
export async function DELETE() {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) return NextResponse.json({ error: "Avval tizimga kiring" }, { status: 401 });

    const me = await prisma.userProfile.findUnique({
        where: { email: session.user.email },
        select: { id: true, steamId64: true },
    });
    if (!me) return NextResponse.json({ error: "Profil topilmadi" }, { status: 404 });
    if (!me.steamId64) return NextResponse.json({ ok: true, alreadyUnlinked: true });

    // CS2 sportchi bo'lsa — uzib bo'lmaydi
    const cs2Athlete = await prisma.esAthlete.findFirst({
        where: { humoProfileId: me.id, game: { slug: "cs2" } },
        select: { id: true },
    });
    if (cs2Athlete) {
        return NextResponse.json(
            { error: "CS2 sportchi profili bor — avval sportchi profilini o'chiring" },
            { status: 409 },
        );
    }

    await prisma.userProfile.update({
        where: { id: me.id },
        data: { steamId64: null, steamPersona: null, steamAvatar: null, steamLinkedAt: null },
    });
    return NextResponse.json({ ok: true });
}
