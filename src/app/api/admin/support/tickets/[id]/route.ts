// Admin: bitta tiket — thread + xabar yuborish + status.
//
//   GET    /api/admin/support/tickets/[id]           → thread
//   POST   /api/admin/support/tickets/[id]           → admin javob  body:{ body }
//   PATCH  /api/admin/support/tickets/[id]           → status  body:{ status }

import { NextResponse, after } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireFounder } from "@/lib/admin-guard";
import { triggerSupportAgentDM } from "@/lib/support-agent-trigger";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
    const admin = await requireFounder();
    if (!admin) return NextResponse.json({ error: "forbidden" }, { status: 403 });
    const { id } = await params;

    const ticket = await prisma.supportTicket.findUnique({
        where: { id },
        include: {
            profile: { select: { username: true, name: true, humoId: true, image: true } },
            messages: { orderBy: { createdAt: "asc" } },
        },
    });
    if (!ticket) return NextResponse.json({ error: "not_found" }, { status: 404 });

    // Foydalanuvchi xabarlarini "o'qildi" belgilash (admin uchun)
    await prisma.supportMessage.updateMany({
        where: { ticketId: id, authorRole: "USER", readByAdmin: false },
        data: { readByAdmin: true },
    });

    return NextResponse.json({
        ticket: {
            id: ticket.id, subject: ticket.subject, status: ticket.status,
            module: ticket.module, email: ticket.email,
            profile: ticket.profile,
            aiHandled: ticket.aiHandled,
            escalated: ticket.escalated,
            escalatedReason: ticket.escalatedReason,
            createdAt: ticket.createdAt.toISOString(),
            updatedAt: ticket.updatedAt.toISOString(),
        },
        messages: ticket.messages.map(m => ({
            id: m.id, body: m.body,
            fromAdmin: m.authorRole === "ADMIN",
            fromAi: m.authorRole === "AI",
            aiConfidence: m.aiConfidence,
            createdAt: m.createdAt.toISOString(),
        })),
    });
}

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
    const admin = await requireFounder();
    if (!admin) return NextResponse.json({ error: "forbidden" }, { status: 403 });
    const { id } = await params;

    const body = await req.json().catch(() => null);
    const text = String(body?.body ?? "").trim().slice(0, 4000);
    if (text.length < 1) return NextResponse.json({ error: "body_required" }, { status: 400 });

    const ticket = await prisma.supportTicket.findUnique({
        where: { id }, select: { id: true, status: true },
    });
    if (!ticket) return NextResponse.json({ error: "not_found" }, { status: 404 });

    const msg = await prisma.supportMessage.create({
        data: {
            ticketId: id, authorRole: "ADMIN", authorId: admin.id,
            body: text, readByUser: false, readByAdmin: true,
        },
    });
    await prisma.supportTicket.update({
        where: { id }, data: { status: "pending", updatedAt: new Date() },
    });

    // @support_agent foydalanuvchi DM'iga xabar yuboradi
    after(() => triggerSupportAgentDM({ ticketId: id, kind: "admin-reply", adminReplyBody: text }));

    return NextResponse.json({
        ok: true,
        message: {
            id: msg.id, body: msg.body, fromAdmin: true,
            createdAt: msg.createdAt.toISOString(),
        },
    });
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
    const admin = await requireFounder();
    if (!admin) return NextResponse.json({ error: "forbidden" }, { status: 403 });
    const { id } = await params;

    const body = await req.json().catch(() => null);
    const status = String(body?.status ?? "").trim();
    if (!["open", "pending", "closed"].includes(status)) {
        return NextResponse.json({ error: "invalid_status" }, { status: 400 });
    }
    await prisma.supportTicket.update({ where: { id }, data: { status } });
    after(() => triggerSupportAgentDM({ ticketId: id, kind: "status-changed", newStatus: status }));
    return NextResponse.json({ ok: true, status });
}
