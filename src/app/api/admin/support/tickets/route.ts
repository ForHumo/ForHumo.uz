// Admin: barcha tiketlar ro'yxati (status filter).
//
//   GET /api/admin/support/tickets?status=open|pending|closed|all

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireFounder } from "@/lib/admin-guard";

export async function GET(req: Request) {
    const admin = await requireFounder();
    if (!admin) return NextResponse.json({ error: "forbidden" }, { status: 403 });

    const url = new URL(req.url);
    const status = url.searchParams.get("status") ?? "open";
    const filter = url.searchParams.get("filter") ?? "";  // "escalated" | "ai" | ""
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const where: any = status === "all" ? {} : { status };
    if (filter === "escalated") where.escalated = true;
    if (filter === "ai") where.aiHandled = true;

    const tickets = await prisma.supportTicket.findMany({
        where, orderBy: [{ escalated: "desc" }, { updatedAt: "desc" }], take: 100,
        select: {
            id: true, subject: true, status: true, module: true,
            email: true, createdAt: true, updatedAt: true,
            aiHandled: true, aiConfidence: true,
            escalated: true, escalatedAt: true, escalatedReason: true,
            profile: { select: { username: true, name: true, humoId: true } },
            messages: {
                orderBy: { createdAt: "desc" }, take: 1,
                select: { body: true, authorRole: true, createdAt: true, readByAdmin: true },
            },
        },
    });

    // Segment sonlari
    const [escalatedCount, aiCount] = await Promise.all([
        prisma.supportTicket.count({ where: { escalated: true, status: { not: "closed" } } }),
        prisma.supportTicket.count({ where: { aiHandled: true, status: { not: "closed" } } }),
    ]);

    return NextResponse.json({
        segments: { escalated: escalatedCount, ai: aiCount },
        items: tickets.map(t => ({
            id: t.id, subject: t.subject, status: t.status, module: t.module,
            email: t.email,
            profile: t.profile,
            aiHandled: t.aiHandled,
            aiConfidence: t.aiConfidence,
            escalated: t.escalated,
            escalatedAt: t.escalatedAt?.toISOString() ?? null,
            escalatedReason: t.escalatedReason,
            createdAt: t.createdAt.toISOString(),
            updatedAt: t.updatedAt.toISOString(),
            lastMessage: t.messages[0] ? {
                body: t.messages[0].body.slice(0, 200),
                fromAdmin: t.messages[0].authorRole === "ADMIN",
                fromAi: t.messages[0].authorRole === "AI",
                readByAdmin: t.messages[0].readByAdmin,
                createdAt: t.messages[0].createdAt.toISOString(),
            } : null,
        })),
    });
}
