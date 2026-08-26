// Per-user mute for a channel/group.
//   POST /api/nexus/channels/[id]/mute   { duration: "1h"|"8h"|"1d"|"forever"|"off" }
//   GET  /api/nexus/channels/[id]/mute   → { mutedUntil, muted }

import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const DURATIONS: Record<string, number | "forever" | "off"> = {
    "1h": 60 * 60 * 1000,
    "8h": 8 * 60 * 60 * 1000,
    "1d": 24 * 60 * 60 * 1000,
    "forever": "forever",
    "off": "off",
};

async function meAndMember(email: string, channelId: string) {
    const me = await prisma.userProfile.findUnique({ where: { email }, select: { id: true } });
    if (!me) return null;
    const member = await prisma.nexusChannelMember.findUnique({
        where: { channelId_profileId: { channelId, profileId: me.id } },
        select: { id: true, mutedUntil: true },
    });
    return { me, member };
}

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const { id } = await params;
    const r = await meAndMember(session.user.email, id);
    if (!r || !r.member) return NextResponse.json({ error: "not_member" }, { status: 403 });
    const now = Date.now();
    const muted = !!(r.member.mutedUntil && r.member.mutedUntil.getTime() > now);
    return NextResponse.json({ mutedUntil: r.member.mutedUntil, muted });
}

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const { id } = await params;
    const r = await meAndMember(session.user.email, id);
    if (!r || !r.member) return NextResponse.json({ error: "not_member" }, { status: 403 });

    const body = await req.json().catch(() => ({}));
    const duration = String(body?.duration ?? "1h");
    const map = DURATIONS[duration];
    if (map === undefined) return NextResponse.json({ error: "Noto'g'ri muddat" }, { status: 400 });

    let mutedUntil: Date | null;
    if (map === "off") mutedUntil = null;
    else if (map === "forever") mutedUntil = new Date(Date.now() + 100 * 365 * 24 * 60 * 60 * 1000); // 100 yil
    else mutedUntil = new Date(Date.now() + map);

    await prisma.nexusChannelMember.update({
        where: { id: r.member.id },
        data: { mutedUntil },
    });
    return NextResponse.json({ ok: true, mutedUntil, muted: mutedUntil !== null });
}
