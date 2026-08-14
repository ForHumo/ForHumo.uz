// Chat auto-delete taymer — chatdagi barcha xabarlar shu sekunddan keyin
// avtomatik o'chiriladi. Ikkala foydalanuvchi uchun umumiy sozlama.
//
//   PATCH /api/nexus/messages/[id]/auto-delete
//     body: { seconds: number }  // 0 = o'chirilgan, 86400 = 24 soat, 604800 = 7 kun
//   Har ikki ishtirokchi ham o'zgartira oladi (chat egasi tushunchasi DM'da yo'q).

import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// Ruxsat etilgan preset qiymatlar (WhatsApp uslub)
const PRESET_SECONDS = new Set([
    0,           // O'chirilgan
    3600,        // 1 soat
    86400,       // 24 soat / 1 kun
    604800,      // 7 kun
    2592000,     // 30 kun
    7776000,     // 90 kun
]);
const MAX_SECONDS = 31536000; // 1 yil

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const me = await prisma.userProfile.findUnique({
        where: { email: session.user.email }, select: { id: true },
    });
    if (!me) return NextResponse.json({ error: "Profil topilmadi" }, { status: 404 });

    const conv = await prisma.nexusConversation.findUnique({
        where: { id }, select: { user1Id: true, user2Id: true },
    });
    if (!conv) return NextResponse.json({ error: "Topilmadi" }, { status: 404 });
    if (conv.user1Id !== me.id && conv.user2Id !== me.id) {
        return NextResponse.json({ error: "Ruxsat yo'q" }, { status: 403 });
    }

    const body = await req.json().catch(() => ({}));
    const secondsRaw = Number(body.seconds);
    if (!Number.isFinite(secondsRaw) || secondsRaw < 0 || secondsRaw > MAX_SECONDS) {
        return NextResponse.json({ error: "seconds noto'g'ri (0..31536000)" }, { status: 400 });
    }
    // Preset yoki custom (0..1 yil) qabul qilamiz; UI custom slider bermaganda preset bo'ladi.
    const seconds = PRESET_SECONDS.has(secondsRaw) ? secondsRaw : Math.floor(secondsRaw);

    await prisma.nexusConversation.update({
        where: { id }, data: { autoDeleteAfterSeconds: seconds },
    });

    // Body xabar sifatida ikkalasi ko'radi ("Auto-delete X kunga o'rnatildi")
    // Bu keyingi bosqichda sistem xabar yozib qo'yish orqali qilinadi.
    return NextResponse.json({ ok: true, seconds });
}
