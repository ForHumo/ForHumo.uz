// Foydalanuvchi Support tiketlar: ro'yxat + yaratish.
//
//   GET  /api/support/tickets                  → mening tiketlarim
//   POST /api/support/tickets                  → yangi tiket
//     body: { subject, message, module? }

import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const MODULES = ["bn", "nexus", "market", "pay", "id", "esport", "ai", "support"] as const;

async function getProfile() {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) return null;
    return prisma.userProfile.findUnique({
        where: { email: session.user.email },
        select: { id: true, email: true },
    });
}

export async function GET() {
    const p = await getProfile();
    if (!p) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

    const tickets = await prisma.supportTicket.findMany({
        where: { profileId: p.id },
        orderBy: { updatedAt: "desc" },
        take: 30,
        select: {
            id: true, subject: true, status: true, module: true,
            createdAt: true, updatedAt: true,
            messages: {
                orderBy: { createdAt: "desc" },
                take: 1,
                select: { body: true, authorRole: true, readByUser: true, createdAt: true },
            },
        },
    });

    // Har tiketda o'qilmagan admin xabar bormi (badge uchun)
    const unreadCounts = await Promise.all(tickets.map(t =>
        prisma.supportMessage.count({
            where: { ticketId: t.id, authorRole: "ADMIN", readByUser: false },
        }),
    ));

    const items = tickets.map((t, i) => ({
        id: t.id,
        subject: t.subject,
        status: t.status,
        module: t.module,
        createdAt: t.createdAt.toISOString(),
        updatedAt: t.updatedAt.toISOString(),
        lastMessage: t.messages[0] ? {
            body: t.messages[0].body.slice(0, 140),
            fromAdmin: t.messages[0].authorRole === "ADMIN",
            createdAt: t.messages[0].createdAt.toISOString(),
        } : null,
        unread: unreadCounts[i],
    }));

    return NextResponse.json({ items });
}

export async function POST(req: Request) {
    const p = await getProfile();
    const session = await getServerSession(authOptions);

    const body = await req.json().catch(() => null);
    const subject = String(body?.subject ?? "").trim().slice(0, 100);
    const message = String(body?.message ?? "").trim().slice(0, 2000);
    const moduleRaw = String(body?.module ?? "").trim().toLowerCase();
    const module = (MODULES as readonly string[]).includes(moduleRaw) ? moduleRaw : null;
    const email = p?.email ?? String(body?.email ?? session?.user?.email ?? "").trim().slice(0, 200);

    if (!subject || subject.length < 3) return NextResponse.json({ error: "subject_required" }, { status: 400 });
    if (message.length < 5) return NextResponse.json({ error: "message_too_short" }, { status: 400 });
    if (!email.includes("@")) return NextResponse.json({ error: "email_required" }, { status: 400 });

    const ticket = await prisma.supportTicket.create({
        data: {
            profileId: p?.id ?? null,
            email, subject, message, module,
            status: "open",
            messages: {
                create: {
                    authorRole: "USER",
                    authorId: p?.id ?? null,
                    body: message,
                },
            },
        },
        select: { id: true, subject: true, status: true, module: true, createdAt: true, updatedAt: true },
    });

    return NextResponse.json({
        ok: true,
        ticket: {
            id: ticket.id,
            subject: ticket.subject,
            status: ticket.status,
            module: ticket.module,
            createdAt: ticket.createdAt.toISOString(),
            updatedAt: ticket.updatedAt.toISOString(),
            lastMessage: {
                body: message.slice(0, 140),
                fromAdmin: false,
                createdAt: new Date().toISOString(),
            },
            unread: 0,
        },
    });
}
