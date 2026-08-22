// Channel post view — foydalanuvchi xabarni ko'rgani hisoblanadi (unique per user).
//   POST /api/nexus/channels/[id]/messages/[messageId]/view
// Batch qo'llovchi: body = { messageIds: string[] } — bir marta bir necha xabar ko'rildi deyish uchun.

import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(req: Request, { params }: { params: Promise<{ id: string; messageId: string }> }) {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const { id, messageId } = await params;

    const me = await prisma.userProfile.findUnique({
        where: { email: session.user.email }, select: { id: true },
    });
    if (!me) return NextResponse.json({ error: "Profil topilmadi" }, { status: 404 });

    // A'zomi tekshiruv (ochiq kanal'lar ham a'zosiz view'ni istamaydi — spam oldini olish)
    const member = await prisma.nexusChannelMember.findFirst({
        where: { channelId: id, profileId: me.id }, select: { id: true },
    });
    if (!member) return NextResponse.json({ error: "A'zo emas" }, { status: 403 });

    // Batch — body'da messageIds bo'lsa hammasi uchun
    let ids: string[] = [messageId];
    try {
        const body = await req.json().catch(() => ({}));
        if (Array.isArray(body?.messageIds)) {
            ids = [messageId, ...body.messageIds.filter((x: unknown): x is string => typeof x === "string")];
            ids = [...new Set(ids)].slice(0, 100);
        }
    } catch {}

    // Har xabar uchun: unique constraint bilan create; muvaffaqiyat bo'lsa viewCount++
    let newViews = 0;
    for (const mid of ids) {
        try {
            await prisma.nexusChannelMessageView.create({
                data: { messageId: mid, profileId: me.id },
            });
            await prisma.nexusChannelMessage.update({
                where: { id: mid }, data: { viewCount: { increment: 1 } },
            });
            newViews++;
        } catch {
            // Unique constraint xatosi — allaqachon ko'rilgan, jim o'tkazamiz
        }
    }
    return NextResponse.json({ ok: true, newViews });
}
