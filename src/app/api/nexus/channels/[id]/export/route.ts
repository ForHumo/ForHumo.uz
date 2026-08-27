// GET /channels/[id]/export?format=json|csv
// Guruh/kanal xabarlarini eksport qiladi (OWNER only). Rate-limit: 5/soat.
// CSV: id,createdAt,sender,text,mediaType,mediaUrl,topicId,pinned

import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const MAX_MESSAGES = 5000;

function csvEscape(v: string | null | undefined): string {
    if (v == null) return "";
    const s = String(v).replace(/\r?\n/g, " ").replace(/"/g, '""');
    return /[",]/.test(s) ? `"${s}"` : s;
}

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const { id } = await params;
    const me = await prisma.userProfile.findUnique({ where: { email: session.user.email }, select: { id: true } });
    if (!me) return NextResponse.json({ error: "profile" }, { status: 404 });

    const channel = await prisma.nexusChannel.findUnique({ where: { id }, select: { ownerId: true, name: true } });
    if (!channel) return NextResponse.json({ error: "not_found" }, { status: 404 });
    if (channel.ownerId !== me.id) return NextResponse.json({ error: "Faqat egasi" }, { status: 403 });

    const url = new URL(req.url);
    const format = url.searchParams.get("format") === "csv" ? "csv" : "json";

    const msgs = await prisma.nexusChannelMessage.findMany({
        where: { channelId: id, hidden: false, deletedForEveryoneAt: null },
        orderBy: { createdAt: "asc" }, take: MAX_MESSAGES,
        select: {
            id: true, createdAt: true, senderId: true, text: true,
            media: true, mediaType: true, topicId: true, pinnedAt: true, editedAt: true,
        },
    });
    const senderIds = Array.from(new Set(msgs.map(m => m.senderId)));
    const senders = await prisma.userProfile.findMany({
        where: { id: { in: senderIds } }, select: { id: true, name: true, username: true },
    });
    const sMap = new Map(senders.map(s => [s.id, s.name ?? s.username ?? "?"]));

    const filename = `${channel.name.replace(/[^a-z0-9]/gi, "_")}-${new Date().toISOString().slice(0, 10)}`;

    if (format === "csv") {
        const header = "id,createdAt,sender,text,mediaType,mediaUrl,topicId,pinned,edited";
        const rows = msgs.map(m => [
            m.id,
            m.createdAt.toISOString(),
            sMap.get(m.senderId) ?? "",
            m.text ?? "",
            m.mediaType ?? "",
            m.media[0] ?? "",
            m.topicId ?? "",
            m.pinnedAt ? "1" : "0",
            m.editedAt ? "1" : "0",
        ].map(csvEscape).join(","));
        // UTF-8 BOM Excel uchun
        const csv = "﻿" + header + "\n" + rows.join("\n");
        return new NextResponse(csv, {
            headers: {
                "Content-Type": "text/csv; charset=utf-8",
                "Content-Disposition": `attachment; filename="${filename}.csv"`,
            },
        });
    }

    // JSON
    const body = JSON.stringify({
        channel: { id, name: channel.name },
        exportedAt: new Date().toISOString(),
        totalMessages: msgs.length,
        messages: msgs.map(m => ({
            id: m.id,
            createdAt: m.createdAt.toISOString(),
            sender: sMap.get(m.senderId) ?? "?",
            text: m.text,
            mediaType: m.mediaType,
            media: m.media,
            topicId: m.topicId,
            pinned: !!m.pinnedAt,
            edited: !!m.editedAt,
        })),
    }, null, 2);
    return new NextResponse(body, {
        headers: {
            "Content-Type": "application/json; charset=utf-8",
            "Content-Disposition": `attachment; filename="${filename}.json"`,
        },
    });
}
