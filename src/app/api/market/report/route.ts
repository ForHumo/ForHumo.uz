import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { applyModeration, type ModTargetType } from "@/lib/moderation";

const TARGETS = ["PRODUCT", "REVIEW", "REPLY", "QUESTION", "ANSWER"] as const;
type Target = typeof TARGETS[number];

// Shikoyat qilingan kontentni AI uchun matn + rasmga aylantiradi
async function loadMarketTarget(t: Target, id: string): Promise<{ text: string; imageUrl: string | null } | null> {
    switch (t) {
        case "PRODUCT": {
            const p = await prisma.marketProduct.findUnique({ where: { id }, select: { name: true, description: true, images: true } });
            return p ? { text: `${p.name}\n${p.description || ""}`, imageUrl: p.images[0] || null } : null;
        }
        case "REVIEW": {
            const r = await prisma.marketReview.findUnique({ where: { id }, select: { text: true, media: true } });
            return r ? { text: r.text || "", imageUrl: r.media[0] || null } : null;
        }
        case "REPLY": {
            const r = await prisma.marketReviewReply.findUnique({ where: { id }, select: { text: true, media: true } });
            return r ? { text: r.text || "", imageUrl: r.media[0] || null } : null;
        }
        case "QUESTION": {
            const q = await prisma.marketProductQuestion.findUnique({ where: { id }, select: { text: true } });
            return q ? { text: q.text, imageUrl: null } : null;
        }
        case "ANSWER": {
            const a = await prisma.marketProductAnswer.findUnique({ where: { id }, select: { text: true } });
            return a ? { text: a.text, imageUrl: null } : null;
        }
        default:
            return null;
    }
}

// POST /api/market/report — kontentni shikoyat qilish (+ AI reaktiv tahlil)
export async function POST(req: Request) {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const profile = await prisma.userProfile.findUnique({ where: { email: session.user.email }, select: { id: true } });
    if (!profile) return NextResponse.json({ error: "Profil topilmadi" }, { status: 404 });

    const { targetType, targetId, reason } = await req.json();
    if (!TARGETS.includes(targetType) || !targetId)
        return NextResponse.json({ error: "Noto'g'ri so'rov" }, { status: 400 });

    const target = await loadMarketTarget(targetType as Target, targetId);
    if (!target) return NextResponse.json({ error: "Kontent topilmadi" }, { status: 404 });

    // AI tekshiradi + flag yaratadi/yangilaydi + jiddiy bo'lsa avto-yashiradi
    await applyModeration({
        module: "MARKET",
        targetType: targetType as ModTargetType,
        targetId,
        text: target.text,
        imageUrl: target.imageUrl,
        kind: (targetType as string).toLowerCase(),
        reporterReason: reason ? String(reason).slice(0, 300) : "",
    });

    return NextResponse.json({ ok: true });
}
