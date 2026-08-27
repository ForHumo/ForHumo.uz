// GET /api/nexus/ch/[handle]/rss — RSS 2.0 XML feed
// Public kanal uchun so'nggi 30 post. Auth talab qilinmaydi.
// Content-Type: application/rss+xml; charset=utf-8

import { prisma } from "@/lib/prisma";

function escapeXml(s: string): string {
    return s
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&apos;");
}

function cdata(s: string): string {
    // CDATA ichida ]]> ni buzamiz
    return `<![CDATA[${s.replace(/\]\]>/g, "]]]]><![CDATA[>")}]]>`;
}

export async function GET(req: Request, { params }: { params: Promise<{ handle: string }> }) {
    const { handle } = await params;
    const clean = handle.replace(/^@/, "").toLowerCase();
    const channel = await prisma.nexusChannel.findUnique({ where: { handle: clean } });
    if (!channel || channel.hidden || channel.isPrivate) {
        return new Response("<?xml version=\"1.0\"?><error>Kanal topilmadi yoki yopiq</error>", {
            status: 404, headers: { "Content-Type": "application/xml; charset=utf-8" },
        });
    }

    const msgs = await prisma.nexusChannelMessage.findMany({
        where: {
            channelId: channel.id, hidden: false,
            deletedForEveryoneAt: null, scheduledFor: null,
            topicId: null,
        },
        orderBy: { createdAt: "desc" }, take: 30,
        select: { id: true, text: true, media: true, createdAt: true, viewCount: true },
    });

    const url = new URL(req.url);
    const origin = url.origin;
    const chLink = `${origin}/nexus/ch/${encodeURIComponent(clean)}`;
    const feedLink = `${origin}/api/nexus/ch/${encodeURIComponent(clean)}/rss`;

    const items = msgs.map(m => {
        const link = `${origin}/nexus/ch/${encodeURIComponent(clean)}/msg/${encodeURIComponent(m.id)}`;
        const title = m.text ? m.text.slice(0, 80).replace(/\n/g, " ") : (m.media.length ? "Media" : "Xabar");
        const bodyHtml = [
            m.text ? `<p>${escapeXml(m.text)}</p>` : "",
            ...m.media.slice(0, 4).map(u => `<p><img src="${escapeXml(u)}" alt=""/></p>`),
        ].join("\n");
        return `    <item>
      <title>${escapeXml(title)}</title>
      <link>${escapeXml(link)}</link>
      <guid isPermaLink="true">${escapeXml(link)}</guid>
      <pubDate>${new Date(m.createdAt).toUTCString()}</pubDate>
      <description>${cdata(bodyHtml || title)}</description>
    </item>`;
    }).join("\n");

    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>${escapeXml(channel.name)}</title>
    <link>${escapeXml(chLink)}</link>
    <description>${escapeXml(channel.description ?? channel.name)}</description>
    <language>uz</language>
    <atom:link href="${escapeXml(feedLink)}" rel="self" type="application/rss+xml" />
    <lastBuildDate>${new Date().toUTCString()}</lastBuildDate>
${items}
  </channel>
</rss>`;

    return new Response(xml, {
        headers: {
            "Content-Type": "application/rss+xml; charset=utf-8",
            "Cache-Control": "public, max-age=600, s-maxage=600",
        },
    });
}
