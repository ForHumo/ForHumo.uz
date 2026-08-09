// Agent xabariga foydalanuvchi javob berishi (yulduz bosish, media qo'shish).
//
//   POST /api/nexus/messages/[id]/agent-action
//     [id] = NexusMessage.id (agent kartasi)
//     body: { rating?: 1..5, appendText?: string, appendMedia?: string[] }
//
// - rating berilsa: MarketReview yaratiladi (yoki mavjud bo'lsa yangilanadi),
//   agentActionRef review.id ga qo'yiladi
// - matn/media berilsa: mavjud review'ga qo'shiladi

import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

interface AgentPayloadShape {
    kind?: string;
    productId?: string;
    orderId?: string;
}

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const { id } = await params;

    const me = await prisma.userProfile.findUnique({
        where: { email: session.user.email }, select: { id: true },
    });
    if (!me) return NextResponse.json({ error: "Profil topilmadi" }, { status: 404 });

    const msg = await prisma.nexusMessage.findUnique({
        where: { id },
        include: { conversation: true },
    });
    if (!msg) return NextResponse.json({ error: "Xabar topilmadi" }, { status: 404 });
    if (msg.mediaType !== "agent") return NextResponse.json({ error: "Agent xabari emas" }, { status: 400 });

    // Faqat qabul qiluvchi (agent egasi emas) javob bera oladi
    const isRecipient = msg.senderId !== me.id
        && (msg.conversation.user1Id === me.id || msg.conversation.user2Id === me.id);
    if (!isRecipient) return NextResponse.json({ error: "Ruxsat yo'q" }, { status: 403 });

    const payload = (msg.agentPayload ?? {}) as AgentPayloadShape;
    const body = await req.json().catch(() => ({}));
    const rating = Number.isFinite(Number(body?.rating)) ? Math.max(1, Math.min(5, Math.floor(Number(body.rating)))) : null;
    const appendText = typeof body?.appendText === "string" ? body.appendText.trim().slice(0, 2000) : "";
    const appendMedia: string[] = Array.isArray(body?.appendMedia)
        ? body.appendMedia.filter((u: unknown) => typeof u === "string").slice(0, 5) as string[]
        : [];

    // Hozircha faqat product-review kind qo'llanadi
    if (payload.kind !== "product-review" || !payload.productId) {
        return NextResponse.json({ error: "Qo'llab-quvvatlanmaydi" }, { status: 400 });
    }

    let review = await prisma.marketReview.findFirst({
        where: { productId: payload.productId, profileId: me.id },
    });

    // Yulduz bosilsa — review yaratish/yangilash
    if (rating !== null) {
        if (!review) {
            if (!payload.orderId) {
                return NextResponse.json({ error: "orderId topilmadi" }, { status: 400 });
            }
            review = await prisma.marketReview.create({
                data: {
                    productId: payload.productId,
                    profileId: me.id,
                    rating,
                    text: appendText || null,
                    media: appendMedia,
                    orderId: payload.orderId,
                },
            });
        } else {
            const mergedMedia = [...new Set([...(review.media ?? []), ...appendMedia])].slice(0, 10);
            const mergedText = [review.text, appendText].filter(Boolean).join("\n").slice(0, 3000);
            review = await prisma.marketReview.update({
                where: { id: review.id },
                data: { rating, text: mergedText || null, media: mergedMedia },
            });
        }
    } else if (review && (appendText || appendMedia.length)) {
        // Ratingsiz — faqat matn/media qo'shish (rating oldindan qo'yilgan bo'lsa)
        const mergedMedia = [...new Set([...(review.media ?? []), ...appendMedia])].slice(0, 10);
        const mergedText = [review.text, appendText].filter(Boolean).join("\n").slice(0, 3000);
        review = await prisma.marketReview.update({
            where: { id: review.id },
            data: { text: mergedText || null, media: mergedMedia },
        });
    } else {
        return NextResponse.json({ error: "Rating yoki matn kerak" }, { status: 400 });
    }

    // Mahsulot reyting agregatsiyasi
    if (rating !== null) {
        const agg = await prisma.marketReview.aggregate({
            where: { productId: payload.productId, hidden: false },
            _avg: { rating: true }, _count: { _all: true },
        });
        await prisma.marketProduct.update({
            where: { id: payload.productId },
            data: {
                rating: agg._avg.rating ?? 0,
                reviewCount: agg._count._all,
            },
        });
    }

    // Agent xabariga havolani yozib qo'yamiz
    if (review && msg.agentActionRef !== review.id) {
        await prisma.nexusMessage.update({
            where: { id: msg.id },
            data: { agentActionRef: review.id },
        });
    }

    return NextResponse.json({
        ok: true,
        review: review ? {
            id: review.id, rating: review.rating, text: review.text, media: review.media,
        } : null,
    });
}
