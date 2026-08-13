// Suhbatni HTML yoki JSON formatida eksport qilish.
//   GET /api/nexus/messages/[convId]/export?format=html|json  (default: html)

import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { otherId } from "@/lib/nexus-dm";

function escapeHtml(s: string): string {
    return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;").replace(/'/g, "&#39;");
}
function nl2br(s: string): string {
    return escapeHtml(s).replace(/\n/g, "<br>");
}

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id } = await params;
    const url = new URL(req.url);
    const format = url.searchParams.get("format") === "json" ? "json" : "html";

    const me = await prisma.userProfile.findUnique({
        where: { email: session.user.email }, select: { id: true, name: true, username: true },
    });
    if (!me) return NextResponse.json({ error: "Profil topilmadi" }, { status: 404 });

    const conv = await prisma.nexusConversation.findUnique({ where: { id } });
    if (!conv) return NextResponse.json({ error: "Suhbat topilmadi" }, { status: 404 });
    if (conv.user1Id !== me.id && conv.user2Id !== me.id) {
        return NextResponse.json({ error: "Ruxsat yo'q" }, { status: 403 });
    }

    const oid = otherId(conv, me.id);
    const peer = await prisma.userProfile.findUnique({
        where: { id: oid }, select: { name: true, username: true, image: true },
    });
    // Barcha xabarlar (chronologik tartibda)
    const msgs = await prisma.nexusMessage.findMany({
        where: { conversationId: id }, orderBy: { createdAt: "asc" }, take: 5000,
    });

    if (format === "json") {
        return NextResponse.json({
            conversation: { id, createdAt: conv.createdAt },
            me: { name: me.name, username: me.username },
            peer: peer ? { name: peer.name, username: peer.username } : null,
            messages: msgs.map(m => ({
                id: m.id,
                mine: m.senderId === me.id,
                createdAt: m.createdAt,
                text: m.text || null,
                mediaType: m.mediaType,
                mediaUrl: m.mediaUrl,
                mediaName: m.mediaName,
                mediaSize: m.mediaSize,
                editedAt: m.editedAt,
                pinnedAt: m.pinnedAt,
            })),
        }, {
            headers: {
                "Content-Disposition": `attachment; filename="chat-${peer?.username ?? "export"}.json"`,
            },
        });
    }

    const peerName = peer?.name ?? peer?.username ?? "Foydalanuvchi";
    const meName = me.name ?? me.username ?? "Siz";

    const parts: string[] = [];
    let prevDay = "";
    for (const m of msgs) {
        const d = new Date(m.createdAt);
        const dayKey = d.toDateString();
        if (dayKey !== prevDay) {
            parts.push(`<div class="daysep">${d.toLocaleDateString("uz-UZ", { day: "numeric", month: "long", year: "numeric" })}</div>`);
            prevDay = dayKey;
        }
        const mine = m.senderId === me.id;
        const time = d.toLocaleTimeString("uz-UZ", { hour: "2-digit", minute: "2-digit" });
        const bodyParts: string[] = [];
        if (m.mediaType === "image" && m.mediaUrl) {
            bodyParts.push(`<img src="${escapeHtml(m.mediaUrl)}" alt="rasm" style="max-width:280px;border-radius:8px;">`);
        } else if (m.mediaType === "video" && m.mediaUrl) {
            bodyParts.push(`<video src="${escapeHtml(m.mediaUrl)}" controls style="max-width:280px;border-radius:8px;"></video>`);
        } else if (m.mediaType === "audio" && m.mediaUrl) {
            bodyParts.push(`<audio src="${escapeHtml(m.mediaUrl)}" controls></audio>`);
        } else if (m.mediaType === "file" && m.mediaUrl) {
            bodyParts.push(`<a href="${escapeHtml(m.mediaUrl)}" download>${escapeHtml(m.mediaName ?? "Fayl")}</a>`);
        } else if (m.mediaType === "poll" && m.pollQuestion) {
            bodyParts.push(`<div class="poll"><b>${escapeHtml(m.pollQuestion)}</b><br>${(m.pollOptions ?? []).map(o => `• ${escapeHtml(o)}`).join("<br>")}</div>`);
        } else if (m.mediaType === "location") {
            bodyParts.push(`<a href="https://www.google.com/maps?q=${m.locLat},${m.locLng}" target="_blank">📍 Joylashuv</a>`);
        }
        if (m.text) bodyParts.push(`<div>${nl2br(m.text)}</div>`);
        if (m.pinnedAt) bodyParts.push(`<span class="pin">📌 Pinlangan</span>`);
        if (m.editedAt) bodyParts.push(`<span class="edit">(tahrirlangan)</span>`);
        parts.push(`
<div class="msg ${mine ? "mine" : "peer"}">
    <div class="bubble">
        <div class="who">${escapeHtml(mine ? meName : peerName)}</div>
        ${bodyParts.join("\n")}
        <div class="meta">${time}</div>
    </div>
</div>`);
    }

    const html = `<!doctype html>
<html lang="uz">
<head>
<meta charset="utf-8">
<title>Suhbat: ${escapeHtml(peerName)}</title>
<style>
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; background: #0B1228; color: #e5edff; margin: 0; padding: 24px; }
    .header { text-align: center; padding: 16px; border-bottom: 1px solid rgba(43,62,232,0.2); margin-bottom: 16px; }
    .header h1 { margin: 0; font-size: 20px; }
    .header p { margin: 4px 0 0; color: rgba(140,160,210,0.7); font-size: 13px; }
    .daysep { text-align: center; margin: 20px 0 12px; font-size: 11px; text-transform: uppercase;
        letter-spacing: 1px; color: rgba(140,160,210,0.6); }
    .msg { display: flex; margin-bottom: 8px; }
    .msg.mine { justify-content: flex-end; }
    .msg.peer { justify-content: flex-start; }
    .bubble { max-width: 70%; padding: 10px 14px; border-radius: 14px; font-size: 14px; }
    .msg.mine .bubble { background: linear-gradient(135deg, #2B3EE8, #1a6fcc); color: #fff; border-bottom-right-radius: 4px; }
    .msg.peer .bubble { background: rgba(43,62,232,0.12); border: 1px solid rgba(43,62,232,0.2); border-bottom-left-radius: 4px; }
    .who { font-size: 10px; font-weight: 700; opacity: 0.6; margin-bottom: 4px; }
    .meta { font-size: 10px; opacity: 0.5; margin-top: 4px; text-align: right; }
    .pin, .edit { font-size: 10px; opacity: 0.6; margin-left: 6px; }
    .poll { background: rgba(0,0,0,0.2); padding: 8px; border-radius: 6px; margin: 4px 0; }
    a { color: #00CEC8; }
    img, video { display: block; margin-bottom: 4px; }
    .footer { text-align: center; margin-top: 32px; padding-top: 16px; border-top: 1px solid rgba(43,62,232,0.15);
        color: rgba(140,160,210,0.5); font-size: 11px; }
</style>
</head>
<body>
<div class="header">
    <h1>Suhbat: ${escapeHtml(peerName)}</h1>
    <p>${msgs.length} ta xabar · Eksport: ${new Date().toLocaleString("uz-UZ")}</p>
</div>
${parts.join("\n")}
<div class="footer">ForHumo.uz Nexus DM eksporti</div>
</body>
</html>`;

    return new NextResponse(html, {
        headers: {
            "Content-Type": "text/html; charset=utf-8",
            "Content-Disposition": `attachment; filename="chat-${peer?.username ?? "export"}.html"`,
        },
    });
}
