import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// PATCH /api/market/reviews/[id]/replies/[replyId] — o'z javobini tahrirlash
export async function PATCH(req: Request, { params }: { params: Promise<{ id: string; replyId: string }> }) {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { replyId } = await params;
    const { text, media } = await req.json();

    const profile = await prisma.userProfile.findUnique({ where: { email: session.user.email } });
    if (!profile) return NextResponse.json({ error: "Profil topilmadi" }, { status: 404 });

    const reply = await prisma.marketReviewReply.findUnique({ where: { id: replyId }, select: { profileId: true } });
    if (!reply) return NextResponse.json({ error: "Javob topilmadi" }, { status: 404 });
    if (reply.profileId !== profile.id) return NextResponse.json({ error: "Bu sizning javobingiz emas" }, { status: 403 });

    const mediaArr: string[] | undefined = Array.isArray(media) ? media.filter((x: unknown) => typeof x === "string") : undefined;
    const newText = text?.trim() || null;
    if (!newText && !(mediaArr?.length))
        return NextResponse.json({ error: "Javob bo'sh bo'lmasin" }, { status: 400 });

    await prisma.marketReviewReply.update({
        where: { id: replyId },
        data: {
            ...(text !== undefined ? { text: newText } : {}),
            ...(mediaArr !== undefined ? { media: mediaArr } : {}),
        },
    });
    return NextResponse.json({ ok: true });
}

// DELETE — o'z javobini o'chirish (barcha ichki javoblari bilan)
export async function DELETE(req: Request, { params }: { params: Promise<{ id: string; replyId: string }> }) {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { replyId } = await params;
    const profile = await prisma.userProfile.findUnique({ where: { email: session.user.email } });
    if (!profile) return NextResponse.json({ error: "Profil topilmadi" }, { status: 404 });

    const reply = await prisma.marketReviewReply.findUnique({ where: { id: replyId }, select: { profileId: true, reviewId: true } });
    if (!reply) return NextResponse.json({ error: "Javob topilmadi" }, { status: 404 });
    if (reply.profileId !== profile.id) return NextResponse.json({ error: "Bu sizning javobingiz emas" }, { status: 403 });

    // Ichki javoblarni ham yig'amiz (parentId da DB cascade yo'q)
    const all = await prisma.marketReviewReply.findMany({
        where: { reviewId: reply.reviewId }, select: { id: true, parentId: true },
    });
    const toDelete = new Set<string>([replyId]);
    let grew = true;
    while (grew) {
        grew = false;
        for (const r of all) {
            if (r.parentId && toDelete.has(r.parentId) && !toDelete.has(r.id)) { toDelete.add(r.id); grew = true; }
        }
    }
    await prisma.marketReviewReply.deleteMany({ where: { id: { in: [...toDelete] } } });
    return NextResponse.json({ ok: true });
}
