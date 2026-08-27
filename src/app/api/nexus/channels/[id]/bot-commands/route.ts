// GET /channels/[id]/bot-commands?q=/pref
// Guruhdagi botlarning `commands` metadata'sini birlashtirib qaytaradi.
// Client'da `/` yozganda inline taklif ochish uchun.

import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) return NextResponse.json({ items: [] });
    const { id } = await params;
    const me = await prisma.userProfile.findUnique({ where: { email: session.user.email }, select: { id: true } });
    if (!me) return NextResponse.json({ items: [] });
    const member = await prisma.nexusChannelMember.findUnique({
        where: { channelId_profileId: { channelId: id, profileId: me.id } }, select: { id: true },
    });
    if (!member) return NextResponse.json({ items: [] });

    const url = new URL(req.url);
    const q = (url.searchParams.get("q") ?? "").replace(/^\//, "").toLowerCase();

    const bots = await prisma.nexusChannelBot.findMany({ where: { channelId: id } });
    if (bots.length === 0) return NextResponse.json({ items: [] });

    const agents = await prisma.nexusAgent.findMany({
        where: { id: { in: bots.map(b => b.agentId) } },
        select: { id: true, profileId: true, commands: true },
    });
    const profiles = agents.length ? await prisma.userProfile.findMany({
        where: { id: { in: agents.map(a => a.profileId) } },
        select: { id: true, name: true, username: true, image: true },
    }) : [];
    const pMap = new Map(profiles.map(p => [p.id, p]));

    const items: Array<{
        cmd: string; description: string;
        botName: string | null; botHandle: string | null; botImage: string | null;
    }> = [];
    for (const a of agents) {
        const p = pMap.get(a.profileId);
        const commands = Array.isArray(a.commands) ? (a.commands as Array<{ cmd?: string; description?: string }>) : [];
        for (const c of commands) {
            if (!c?.cmd) continue;
            const cmd = String(c.cmd).replace(/^\//, "").toLowerCase();
            if (q && !cmd.startsWith(q)) continue;
            items.push({
                cmd: `/${cmd}`,
                description: typeof c.description === "string" ? c.description.slice(0, 200) : "",
                botName: p?.name ?? null,
                botHandle: p?.username ?? null,
                botImage: p?.image ?? null,
            });
        }
    }
    return NextResponse.json({ items: items.slice(0, 8) });
}
