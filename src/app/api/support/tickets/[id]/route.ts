// Bitta tiket — xabarlar oqimi + xabar yuborish + o'qildi belgilash.
//
//   GET    /api/support/tickets/[id]           → thread
//   POST   /api/support/tickets/[id]           → xabar yuborish  body:{ body }
//   PATCH  /api/support/tickets/[id]           → o'qildi (admin xabarlarini)
//   DELETE /api/support/tickets/[id]           → yopish (foydalanuvchi tomonidan)

import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

async function getProfile() {
    const s = await getServerSession(authOptions);
    if (!s?.user?.email) return null;
    return prisma.userProfile.findUnique({
        where: { email: s.user.email }, select: { id: true },
    });
}

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
    const p = await getProfile();
    if (!p) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    const { id } = await params;

    const ticket = await prisma.supportTicket.findUnique({
        where: { id },
        select: {
            id: true, subject: true, status: true, module: true,
            profileId: true, createdAt: true, updatedAt: true,
            messages: { orderBy: { createdAt: "asc" } },
        },
    });
    if (!ticket || ticket.profileId !== p.id) {
        return NextResponse.json({ error: "not_found" }, { status: 404 });
    }

    return NextResponse.json({
        ticket: {
            id: ticket.id, subject: ticket.subject, status: ticket.status,
            module: ticket.module,
            createdAt: ticket.createdAt.toISOString(),
            updatedAt: ticket.updatedAt.toISOString(),
        },
        messages: ticket.messages.map(m => ({
            id: m.id,
            body: m.body,
            fromAdmin: m.authorRole === "ADMIN" || m.authorRole === "AI",
            fromAi: m.authorRole === "AI",
            aiConfidence: m.aiConfidence,
            createdAt: m.createdAt.toISOString(),
        })),
    });
}

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
    const p = await getProfile();
    if (!p) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    const { id } = await params;

    const body = await req.json().catch(() => null);
    const text = String(body?.body ?? "").trim().slice(0, 2000);
    if (text.length < 1) return NextResponse.json({ error: "body_required" }, { status: 400 });

    const ticket = await prisma.supportTicket.findUnique({
        where: { id }, select: { id: true, profileId: true, status: true },
    });
    if (!ticket || ticket.profileId !== p.id) {
        return NextResponse.json({ error: "not_found" }, { status: 404 });
    }
    if (ticket.status === "closed") {
        return NextResponse.json({ error: "closed" }, { status: 409 });
    }

    const msg = await prisma.supportMessage.create({
        data: {
            ticketId: id, authorRole: "USER", authorId: p.id,
            body: text, readByUser: true, readByAdmin: false,
        },
    });
    await prisma.supportTicket.update({
        where: { id }, data: { status: "open", updatedAt: new Date() },
    });

    return NextResponse.json({
        ok: true,
        message: {
            id: msg.id, body: msg.body, fromAdmin: false,
            createdAt: msg.createdAt.toISOString(),
        },
    });
}

export async function PATCH(_req: Request, { params }: { params: Promise<{ id: string }> }) {
    const p = await getProfile();
    if (!p) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    const { id } = await params;

    const ticket = await prisma.supportTicket.findUnique({
        where: { id }, select: { profileId: true },
    });
    if (!ticket || ticket.profileId !== p.id) {
        return NextResponse.json({ error: "not_found" }, { status: 404 });
    }

    await prisma.supportMessage.updateMany({
        where: { ticketId: id, authorRole: "ADMIN", readByUser: false },
        data: { readByUser: true },
    });
    return NextResponse.json({ ok: true });
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
    const p = await getProfile();
    if (!p) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    const { id } = await params;

    const ticket = await prisma.supportTicket.findUnique({
        where: { id }, select: { profileId: true },
    });
    if (!ticket || ticket.profileId !== p.id) {
        return NextResponse.json({ error: "not_found" }, { status: 404 });
    }
    await prisma.supportTicket.update({
        where: { id }, data: { status: "closed" },
    });
    return NextResponse.json({ ok: true });
}
