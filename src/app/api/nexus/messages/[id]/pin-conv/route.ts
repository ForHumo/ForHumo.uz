// Suhbatni chat ro'yxatida pinga qo'yish/olib tashlash (per-user).
//   POST /api/nexus/messages/[convId]/pin-conv  { pin: true|false }

import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id } = await params;
    const body = await req.json().catch(() => ({}));
    const pin = body?.pin !== false;

    const me = await prisma.userProfile.findUnique({
        where: { email: session.user.email }, select: { id: true },
    });
    if (!me) return NextResponse.json({ error: "Profil topilmadi" }, { status: 404 });

    const conv = await prisma.nexusConversation.findUnique({ where: { id } });
    if (!conv) return NextResponse.json({ error: "Suhbat topilmadi" }, { status: 404 });
    if (conv.user1Id !== me.id && conv.user2Id !== me.id) {
        return NextResponse.json({ error: "Ruxsat yo'q" }, { status: 403 });
    }

    const isUser1 = conv.user1Id === me.id;

    // DM-13: Pinned chats max 5 (Telegram limit) — faqat pin=true holatida tekshiruv
    if (pin) {
        const already = await prisma.nexusConversation.count({
            where: isUser1
                ? { user1Id: me.id, pinnedByUser1: { not: null } }
                : { user2Id: me.id, pinnedByUser2: { not: null } },
        });
        // Agar shu chat allaqachon pin'da bo'lsa, count'ga kirmaydi (noop update)
        const isAlreadyPinned = isUser1 ? !!conv.pinnedByUser1 : !!conv.pinnedByUser2;
        if (already >= 5 && !isAlreadyPinned) {
            return NextResponse.json({
                error: "Maks 5 ta chatni pinga qo'yish mumkin. Boshqasini olib tashlang.",
                code: "PIN_LIMIT",
            }, { status: 400 });
        }
    }

    await prisma.nexusConversation.update({
        where: { id },
        data: isUser1
            ? { pinnedByUser1: pin ? new Date() : null }
            : { pinnedByUser2: pin ? new Date() : null },
    });
    return NextResponse.json({ ok: true, pinned: pin });
}
