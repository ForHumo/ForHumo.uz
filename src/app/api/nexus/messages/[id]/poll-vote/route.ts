import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// POST /api/nexus/messages/[id]/poll-vote — DM'dagi so'rovnomaga ovoz berish.
// body: { optionIndex: number }  (single-choice: bitta; multi: bitta ovoz qo'shadi/olib tashlaydi)
// - Bir marta ovoz bergan bo'lsa, single: eskisini o'chirib yangisini yozadi
//                                  multi: bosilgani bo'lsa oladi, yo'q bo'lsa qo'shadi
// - Poll muddat tugagan bo'lsa 400
// - O'zining pollida ovoz berishi mumkin
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const { id: msgId } = await params;
    const me = await prisma.userProfile.findUnique({ where: { email: session.user.email }, select: { id: true } });
    if (!me) return NextResponse.json({ error: "Profil topilmadi" }, { status: 404 });

    const msg = await prisma.nexusMessage.findUnique({
        where: { id: msgId },
        select: { id: true, conversationId: true, mediaType: true, pollOptions: true, pollExpiresAt: true, pollMulti: true, conversation: { select: { user1Id: true, user2Id: true } } },
    });
    if (!msg) return NextResponse.json({ error: "Xabar topilmadi" }, { status: 404 });
    if (msg.mediaType !== "poll") return NextResponse.json({ error: "Bu so'rovnoma emas" }, { status: 400 });
    if (msg.conversation.user1Id !== me.id && msg.conversation.user2Id !== me.id) {
        return NextResponse.json({ error: "Ruxsat yo'q" }, { status: 403 });
    }
    if (msg.pollExpiresAt && msg.pollExpiresAt.getTime() < Date.now()) {
        return NextResponse.json({ error: "So'rovnoma muddati tugagan" }, { status: 400 });
    }

    const { optionIndex } = (await req.json()) as { optionIndex?: number };
    if (typeof optionIndex !== "number" || optionIndex < 0 || optionIndex >= msg.pollOptions.length) {
        return NextResponse.json({ error: "Noto'g'ri variant" }, { status: 400 });
    }

    // P2002 race: bir vaqtda ikki so'rov kelsa, ikkalasi ham bo'sh delete + create qilishga urinadi.
    try {
        if (msg.pollMulti) {
            // Multi — toggle
            const existing = await prisma.nexusDmPollVote.findFirst({
                where: { messageId: msgId, profileId: me.id, optionIndex }, select: { id: true },
            });
            if (existing) {
                await prisma.nexusDmPollVote.delete({ where: { id: existing.id } });
            } else {
                await prisma.nexusDmPollVote.create({ data: { messageId: msgId, profileId: me.id, optionIndex } });
            }
        } else {
            // Single — boshqa optionlarni o'chirib, target upsert (race'da xavfsiz)
            await prisma.$transaction([
                prisma.nexusDmPollVote.deleteMany({ where: { messageId: msgId, profileId: me.id, optionIndex: { not: optionIndex } } }),
                prisma.nexusDmPollVote.upsert({
                    where: { messageId_profileId_optionIndex: { messageId: msgId, profileId: me.id, optionIndex } },
                    create: { messageId: msgId, profileId: me.id, optionIndex },
                    update: {},
                }),
            ]);
        }
    } catch (e) {
        const code = (e as { code?: string })?.code;
        if (code !== "P2002") throw e;
    }

    // Yangilangan statistikani qaytaramiz
    const allVotes = await prisma.nexusDmPollVote.findMany({
        where: { messageId: msgId }, select: { profileId: true, optionIndex: true },
    });
    const counts = msg.pollOptions.map((_, i) => allVotes.filter(v => v.optionIndex === i).length);
    const myVotes = allVotes.filter(v => v.profileId === me.id).map(v => v.optionIndex);
    const total = new Set(allVotes.map(v => v.profileId)).size;

    return NextResponse.json({ ok: true, counts, myVotes, total });
}
