import { NextResponse } from "next/server";
import { Prisma, ModerationStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireFounder } from "@/lib/admin-guard";

const STATUSES = ["PENDING", "KEPT", "HIDDEN", "AUTO_HIDDEN"] as const;

interface Enriched {
    preview: string;
    image: string | null;
    author: { name: string | null; username: string | null } | null;
    link: string | null;
    exists: boolean;
}

async function loadProfile(profileId: string) {
    const p = await prisma.userProfile.findUnique({ where: { id: profileId }, select: { name: true, username: true } });
    return p ? { name: p.name, username: p.username } : null;
}

// Flag maqsadini admin uchun ko'rinishga aylantiradi (kontent ko'rinishi + muallif + havola)
async function enrich(module: string, targetType: string, targetId: string): Promise<Enriched> {
    const none: Enriched = { preview: "(o'chirilgan kontent)", image: null, author: null, link: null, exists: false };
    if (module === "MARKET") {
        switch (targetType) {
            case "PRODUCT": {
                const p = await prisma.marketProduct.findUnique({ where: { id: targetId }, select: { name: true, description: true, images: true, slug: true, brand: { select: { name: true } } } });
                if (!p) return none;
                return { preview: `${p.name}${p.description ? " — " + p.description : ""}`, image: p.images[0] || null, author: { name: p.brand?.name ?? null, username: null }, link: `/market/product/${p.slug}`, exists: true };
            }
            case "REVIEW": {
                const r = await prisma.marketReview.findUnique({ where: { id: targetId }, select: { text: true, media: true, profileId: true, product: { select: { slug: true } } } });
                if (!r) return none;
                return { preview: r.text || "(matnsiz sharh)", image: r.media[0] || null, author: await loadProfile(r.profileId), link: `/market/product/${r.product.slug}`, exists: true };
            }
            case "REPLY": {
                const r = await prisma.marketReviewReply.findUnique({ where: { id: targetId }, select: { text: true, media: true, profileId: true, review: { select: { product: { select: { slug: true } } } } } });
                if (!r) return none;
                return { preview: r.text || "(matnsiz javob)", image: r.media[0] || null, author: await loadProfile(r.profileId), link: `/market/product/${r.review.product.slug}`, exists: true };
            }
            case "QUESTION": {
                const q = await prisma.marketProductQuestion.findUnique({ where: { id: targetId }, select: { text: true, profileId: true, product: { select: { slug: true } } } });
                if (!q) return none;
                return { preview: q.text, image: null, author: await loadProfile(q.profileId), link: `/market/product/${q.product.slug}`, exists: true };
            }
            case "ANSWER": {
                const a = await prisma.marketProductAnswer.findUnique({ where: { id: targetId }, select: { text: true, profileId: true, question: { select: { product: { select: { slug: true } } } } } });
                if (!a) return none;
                return { preview: a.text, image: null, author: await loadProfile(a.profileId), link: `/market/product/${a.question.product.slug}`, exists: true };
            }
        }
    } else if (module === "NEXUS") {
        switch (targetType) {
            case "POST": {
                const p = await prisma.nexusPost.findUnique({ where: { id: targetId }, select: { text: true, media: true, profileId: true } });
                if (!p) return none;
                return { preview: p.text || "(matnsiz post)", image: p.media[0] || null, author: await loadProfile(p.profileId), link: "/nexus", exists: true };
            }
            case "COMMENT": {
                const c = await prisma.nexusComment.findUnique({ where: { id: targetId }, select: { text: true, profileId: true } });
                if (!c) return none;
                return { preview: c.text, image: null, author: await loadProfile(c.profileId), link: "/nexus", exists: true };
            }
        }
    }
    return none;
}

// GET /api/admin/moderation?status=PENDING&module=ALL — moderatsiya navbati
export async function GET(req: Request) {
    const founder = await requireFounder();
    if (!founder) return NextResponse.json({ error: "Ruxsat yo'q" }, { status: 403 });

    const url = new URL(req.url);
    const statusParam = url.searchParams.get("status") || "PENDING";
    const moduleParam = url.searchParams.get("module") || "ALL";

    const where: Prisma.ModerationFlagWhereInput = {};
    if (statusParam !== "ALL" && STATUSES.includes(statusParam as typeof STATUSES[number]))
        where.status = statusParam as ModerationStatus;
    if (moduleParam === "MARKET" || moduleParam === "NEXUS") where.module = moduleParam;

    const flags = await prisma.moderationFlag.findMany({
        where,
        orderBy: [{ aiSeverity: { sort: "desc", nulls: "last" } }, { createdAt: "desc" }],
        take: 100,
    });

    const enriched = await Promise.all(flags.map(async f => ({
        ...f,
        target: await enrich(f.module, f.targetType, f.targetId),
    })));

    // Navbat sonlari (badge uchun)
    const counts = await prisma.moderationFlag.groupBy({ by: ["status"], _count: true });

    return NextResponse.json({ flags: enriched, counts });
}
