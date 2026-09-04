// Bitta AI suhbat: xabarlar + o'chirish + arxivlash + sarlavha o'zgartirish.
// GET    /api/ai/conversations/[id]      — suhbat + barcha xabarlar
// PATCH  /api/ai/conversations/[id]      — { title?, archived? }
// DELETE /api/ai/conversations/[id]

import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

async function requireOwnership(id: string, email: string) {
    const me = await prisma.userProfile.findUnique({ where: { email }, select: { id: true } });
    if (!me) return null;
    const conv = await prisma.aiConversation.findFirst({
        where: { id, profileId: me.id },
    });
    return conv ? { me, conv } : null;
}

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) return NextResponse.json({ error: "auth_required" }, { status: 401 });
    const { id } = await params;
    const ctx = await requireOwnership(id, session.user.email);
    if (!ctx) return NextResponse.json({ error: "not_found" }, { status: 404 });

    const messages = await prisma.aiMessage.findMany({
        where: { conversationId: id },
        orderBy: { createdAt: "asc" },
        take: 500,
        select: {
            id: true, role: true, body: true, audioUrl: true, attachmentUrl: true,
            attachmentType: true, aiModel: true, createdAt: true,
        },
    });

    return NextResponse.json({
        conversation: {
            id: ctx.conv.id,
            title: ctx.conv.title,
            topic: ctx.conv.topic,
            moduleOrigin: ctx.conv.moduleOrigin,
            createdAt: ctx.conv.createdAt.toISOString(),
            lastMsgAt: ctx.conv.lastMsgAt.toISOString(),
            archived: ctx.conv.archived,
        },
        messages: messages.map(m => ({
            id: m.id,
            role: m.role,
            body: m.body,
            audioUrl: m.audioUrl,
            attachmentUrl: m.attachmentUrl,
            attachmentType: m.attachmentType,
            aiModel: m.aiModel,
            createdAt: m.createdAt.toISOString(),
        })),
    });
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) return NextResponse.json({ error: "auth_required" }, { status: 401 });
    const { id } = await params;
    const ctx = await requireOwnership(id, session.user.email);
    if (!ctx) return NextResponse.json({ error: "not_found" }, { status: 404 });

    const body = await req.json().catch(() => ({}));
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const data: any = {};
    if (typeof body?.title === "string") data.title = body.title.trim().slice(0, 60);
    if (typeof body?.archived === "boolean") data.archived = body.archived;
    if (Object.keys(data).length === 0) return NextResponse.json({ error: "nothing_to_update" }, { status: 400 });

    await prisma.aiConversation.update({ where: { id }, data });
    return NextResponse.json({ ok: true });
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) return NextResponse.json({ error: "auth_required" }, { status: 401 });
    const { id } = await params;
    const ctx = await requireOwnership(id, session.user.email);
    if (!ctx) return NextResponse.json({ error: "not_found" }, { status: 404 });

    await prisma.aiConversation.delete({ where: { id } });
    return NextResponse.json({ ok: true });
}
