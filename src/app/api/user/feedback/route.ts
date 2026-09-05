// Humo universal feedback endpoint.
// Rate limited (10/kun/user), anonim ham qabul qiladi.
//
//   POST /api/user/feedback  { mood, message, module?, url?, imageUrl? }
//   GET  /api/user/feedback  (founder-only) — barcha feedback

import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { requireFounder } from "@/lib/admin-guard";

export const dynamic = "force-dynamic";

const VALID_MOODS = ["happy", "neutral", "sad", "bug", "idea"] as const;
const MAX_MSG = 2000;
const RATE_PER_DAY = 10;

export async function POST(req: Request) {
    const body = await req.json().catch(() => ({}));

    const mood = typeof body?.mood === "string" ? body.mood : null;
    if (!mood || !VALID_MOODS.includes(mood as typeof VALID_MOODS[number])) {
        return NextResponse.json({ error: "invalid_mood" }, { status: 400 });
    }
    const message = String(body?.message ?? "").trim().slice(0, MAX_MSG);
    if (!message || message.length < 3) {
        return NextResponse.json({ error: "message_required" }, { status: 400 });
    }
    const module = typeof body?.module === "string" ? body.module.slice(0, 20) : null;
    const url = typeof body?.url === "string" ? body.url.slice(0, 500) : null;
    const imageUrl = typeof body?.imageUrl === "string" ? body.imageUrl.slice(0, 500) : null;
    const userAgent = req.headers.get("user-agent")?.slice(0, 500) ?? null;

    // Rate limit (auth user)
    const session = await getServerSession(authOptions);
    let profileId: string | null = null;
    if (session?.user?.email) {
        const p = await prisma.userProfile.findUnique({
            where: { email: session.user.email }, select: { id: true },
        });
        if (p) {
            profileId = p.id;
            const oneDayAgo = new Date(Date.now() - 86400000);
            const count = await prisma.humoFeedback.count({
                where: { profileId: p.id, createdAt: { gte: oneDayAgo } },
            });
            if (count >= RATE_PER_DAY) {
                return NextResponse.json({
                    error: "rate_limited",
                    message: `Kuniga ${RATE_PER_DAY} feedback chegarasi.`,
                }, { status: 429 });
            }
        }
    }

    const fb = await prisma.humoFeedback.create({
        data: { profileId, mood, message, module, url, imageUrl, userAgent },
    });

    return NextResponse.json({ ok: true, id: fb.id });
}

export async function GET(req: Request) {
    const founder = await requireFounder();
    if (!founder) return NextResponse.json({ error: "founder_required" }, { status: 403 });

    const { searchParams } = new URL(req.url);
    const status = searchParams.get("status");
    const module = searchParams.get("module");
    const limit = Math.min(100, Math.max(10, Number(searchParams.get("limit")) || 30));

    const rows = await prisma.humoFeedback.findMany({
        where: {
            ...(status ? { status } : {}),
            ...(module ? { module } : {}),
        },
        orderBy: { createdAt: "desc" },
        take: limit,
    });

    const counts = await prisma.humoFeedback.groupBy({
        by: ["status"], _count: { _all: true },
    });
    const byStatus: Record<string, number> = {};
    for (const c of counts) byStatus[c.status] = c._count._all;

    return NextResponse.json({ items: rows, counts: byStatus });
}
