// Kanal xabarini tahrirlash yoki o'chirish.
//   PATCH  /api/nexus/channels/[id]/messages/[messageId]  { text }   — o'z xabarini tahrirlash
//   DELETE /api/nexus/channels/[id]/messages/[messageId]              — o'z xabari yoki admin/owner

import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const MAX_TEXT = 4000;

async function meAndMsg(email: string, channelId: string, messageId: string) {
    const me = await prisma.userProfile.findUnique({ where: { email }, select: { id: true } });
    if (!me) return { error: "profile", status: 404 as const };
    const msg = await prisma.nexusChannelMessage.findUnique({
        where: { id: messageId }, select: { id: true, channelId: true, senderId: true, hidden: true },
    });
    if (!msg || msg.channelId !== channelId) return { error: "not_found", status: 404 as const };
    return { me, msg };
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string; messageId: string }> }) {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const { id, messageId } = await params;
    const r = await meAndMsg(session.user.email, id, messageId);
    if ("error" in r) return NextResponse.json({ error: r.error }, { status: r.status });
    if (r.msg.senderId !== r.me.id) return NextResponse.json({ error: "Faqat o'z xabaringizni tahrirlaysiz" }, { status: 403 });

    const body = await req.json().catch(() => ({}));
    const text = String(body?.text ?? "").trim().slice(0, MAX_TEXT);
    if (!text) return NextResponse.json({ error: "Matn bo'sh bo'lmasin" }, { status: 400 });

    const updated = await prisma.nexusChannelMessage.update({
        where: { id: messageId },
        data: { text, editedAt: new Date() },
    });
    return NextResponse.json({ ok: true, text: updated.text, editedAt: updated.editedAt });
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string; messageId: string }> }) {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const { id, messageId } = await params;
    const r = await meAndMsg(session.user.email, id, messageId);
    if ("error" in r) return NextResponse.json({ error: r.error }, { status: r.status });

    // Ega yoki admin yoki xabar egasi o'chira oladi
    const isOwn = r.msg.senderId === r.me.id;
    if (!isOwn) {
        const member = await prisma.nexusChannelMember.findUnique({
            where: { channelId_profileId: { channelId: id, profileId: r.me.id } }, select: { role: true },
        });
        if (!member || (member.role !== "OWNER" && member.role !== "ADMIN")) {
            return NextResponse.json({ error: "Ruxsat yo'q" }, { status: 403 });
        }
    }

    await prisma.nexusChannelMessage.delete({ where: { id: messageId } });
    return NextResponse.json({ ok: true });
}
