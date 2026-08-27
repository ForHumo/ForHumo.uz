// POST /api/nexus/channels/[id]/broadcast
// Owner uchun urgent broadcast — barcha a'zolarga xabar + PUSH (hattoki muted a'zolarga).
// Odatiy xabardan farqi: mute chekloviga qaramay push yuboriladi (kanal owner e'loni).
// Rate-limit: 3 broadcast / 24 soat / kanal.

import { NextResponse } from "next/server";
import { after } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { sendPushToProfile, pushAvailable } from "@/lib/push";

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const { id } = await params;
    const me = await prisma.userProfile.findUnique({ where: { email: session.user.email }, select: { id: true, name: true, username: true } });
    if (!me) return NextResponse.json({ error: "profile" }, { status: 404 });

    const channel = await prisma.nexusChannel.findUnique({ where: { id } });
    if (!channel || channel.hidden) return NextResponse.json({ error: "not_found" }, { status: 404 });
    if (channel.ownerId !== me.id) return NextResponse.json({ error: "Faqat egasi" }, { status: 403 });

    // Rate-limit: kanal bo'yicha 24s ichida 3 marta
    const since = new Date(Date.now() - 24 * 3600 * 1000);
    const recent = await prisma.nexusChannelAudit.count({
        where: { channelId: id, action: "broadcast", createdAt: { gte: since } },
    });
    if (recent >= 3) return NextResponse.json({ error: "Kunlik 3 broadcast limitiga yetdingiz" }, { status: 429 });

    const body = await req.json();
    const text = typeof body?.text === "string" ? body.text.trim().slice(0, 2000) : "";
    if (!text) return NextResponse.json({ error: "Matn bo'sh bo'lmasin" }, { status: 400 });

    const msg = await prisma.nexusChannelMessage.create({
        data: {
            channelId: id, senderId: me.id, text,
            signaturePosted: channel.signaturesEnabled,
        },
    });

    // Audit
    after(() => prisma.nexusChannelAudit.create({
        data: { channelId: id, actorId: me.id, action: "broadcast", detail: text.slice(0, 200) },
    }).catch(() => {}));

    // Push — mute chegarasiga qaramay hammaga
    if (pushAvailable()) {
        after(async () => {
            const members = await prisma.nexusChannelMember.findMany({
                where: { channelId: id, profileId: { not: me.id } },
                select: { profileId: true }, take: 1000,
            });
            const senderName = me.name ?? me.username ?? "Kanal egasi";
            const url = channel.handle ? `/nexus?channel=${channel.handle}` : "/nexus";
            await Promise.all(members.map(m =>
                sendPushToProfile(m.profileId, {
                    title: `${channel.name} · Muhim e'lon`,
                    body: `${senderName}: ${text.slice(0, 120)}`,
                    url,
                    tag: `ch-broadcast-${id}-${msg.id}`,
                }).catch(() => {}),
            ));
        });
    }

    return NextResponse.json({ ok: true, messageId: msg.id, recipients: channel.memberCount });
}

// GET — rate-limit holati
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const { id } = await params;
    const me = await prisma.userProfile.findUnique({ where: { email: session.user.email }, select: { id: true } });
    if (!me) return NextResponse.json({ error: "profile" }, { status: 404 });

    const ch = await prisma.nexusChannel.findUnique({ where: { id }, select: { ownerId: true, memberCount: true } });
    if (!ch || ch.ownerId !== me.id) return NextResponse.json({ error: "forbidden" }, { status: 403 });

    const since = new Date(Date.now() - 24 * 3600 * 1000);
    const used = await prisma.nexusChannelAudit.count({
        where: { channelId: id, action: "broadcast", createdAt: { gte: since } },
    });
    return NextResponse.json({ used, remaining: Math.max(0, 3 - used), memberCount: ch.memberCount });
}
