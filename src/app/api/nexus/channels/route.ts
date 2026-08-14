import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { nexusRateLimited, RATE_MSG } from "@/lib/nexus-rate";
import { banGuard } from "@/lib/moderation-guard";
import { moderateOnCreate } from "@/lib/moderation";
import { after } from "next/server";

// GET /api/nexus/channels?scope=mine|discover&type=CHANNEL|GROUP
export async function GET(req: Request) {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) return NextResponse.json({ channels: [] });
    const me = await prisma.userProfile.findUnique({ where: { email: session.user.email }, select: { id: true } });
    if (!me) return NextResponse.json({ channels: [] });

    const { searchParams } = new URL(req.url);
    const scope = searchParams.get("scope") || "mine";
    const typeParam = searchParams.get("type");
    const type = typeParam === "GROUP" ? "GROUP" : typeParam === "CHANNEL" ? "CHANNEL" : undefined;

    if (scope === "mine") {
        const memberships = await prisma.nexusChannelMember.findMany({
            where: { profileId: me.id, channel: { hidden: false, ...(type ? { type } : {}) } },
            include: { channel: true },
            orderBy: { joinedAt: "desc" },
        });
        const channels = memberships.map(m => ({
            id: m.channel.id, type: m.channel.type, name: m.channel.name, handle: m.channel.handle,
            avatarUrl: m.channel.avatarUrl, memberCount: m.channel.memberCount, role: m.role, isMember: true,
        }));
        return NextResponse.json({ channels });
    }

    // discover — ommaviy, men a'zo bo'lmaganlar
    const myIds = (await prisma.nexusChannelMember.findMany({ where: { profileId: me.id }, select: { channelId: true } })).map(c => c.channelId);
    const rows = await prisma.nexusChannel.findMany({
        where: { isPrivate: false, hidden: false, ...(type ? { type } : {}), id: { notIn: myIds } },
        orderBy: { memberCount: "desc" }, take: 30,
    });
    return NextResponse.json({
        channels: rows.map(c => ({
            id: c.id, type: c.type, name: c.name, handle: c.handle, description: c.description,
            avatarUrl: c.avatarUrl, memberCount: c.memberCount, isMember: false,
        })),
    });
}

// POST /api/nexus/channels — yangi kanal/guruh ({ type, name, handle?, description?, isPrivate? })
export async function POST(req: Request) {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const me = await prisma.userProfile.findUnique({ where: { email: session.user.email }, select: { id: true, humoId: true, username: true } });
    if (!me) return NextResponse.json({ error: "Profil topilmadi" }, { status: 404 });
    if (!me.humoId || !me.username) return NextResponse.json({ error: "Humo ID kerak" }, { status: 403 });
    const banned = await banGuard(me.id); if (banned) return banned;
    if (await nexusRateLimited(me.id, "channel")) return NextResponse.json({ error: RATE_MSG }, { status: 429 });

    const { type, name, handle, description, isPrivate, avatarUrl, memberIds } = await req.json();
    if (!name?.trim()) return NextResponse.json({ error: "Nom kerak" }, { status: 400 });
    const t = type === "GROUP" ? "GROUP" : "CHANNEL";

    // GROUP uchun — yaratuvchi tanlagan a'zolarni darhol qo'shish (multi-select do'stlar oqimi).
    // Faqat GROUP + isPrivate=true bilan ishlaydi; jami 20 kishidan oshmasin.
    let initialMemberIds: string[] = [];
    if (t === "GROUP" && Array.isArray(memberIds)) {
        const clean = [...new Set(
            (memberIds as unknown[]).filter((x): x is string => typeof x === "string" && x !== me.id)
        )];
        if (clean.length > 499) return NextResponse.json({ error: "Guruhda maksimal 500 kishi" }, { status: 400 });
        if (clean.length > 0) {
            const found = await prisma.userProfile.findMany({
                where: { id: { in: clean } }, select: { id: true },
            });
            initialMemberIds = found.map(f => f.id);
        }
    }

    // handle — ixtiyoriy, noyob, [a-z0-9_]{3,20}
    let cleanHandle: string | null = null;
    if (typeof handle === "string" && handle.trim()) {
        const h = handle.trim().toLowerCase().replace(/^@/, "");
        if (!/^[a-z0-9_]{3,20}$/.test(h)) return NextResponse.json({ error: "Noto'g'ri handle (3-20: a-z, 0-9, _)" }, { status: 400 });
        const [exists, userClash] = await Promise.all([
            prisma.nexusChannel.findUnique({ where: { handle: h }, select: { id: true } }),
            prisma.userProfile.findUnique({ where: { username: h }, select: { id: true } }),
        ]);
        if (exists || userClash) return NextResponse.json({ error: "Bu handle band" }, { status: 409 });
        cleanHandle = h;
    }

    const channel = await prisma.nexusChannel.create({
        data: {
            ownerId: me.id, type: t, name: String(name).trim().slice(0, 80),
            handle: cleanHandle, description: typeof description === "string" ? description.trim().slice(0, 500) : null,
            avatarUrl: typeof avatarUrl === "string" && avatarUrl ? avatarUrl : null,
            isPrivate: isPrivate === true, memberCount: 1 + initialMemberIds.length,
            members: {
                create: [
                    { profileId: me.id, role: "OWNER" },
                    ...initialMemberIds.map(profileId => ({ profileId, role: "MEMBER" as const })),
                ],
            },
        },
    });

    // Moderatsiya — nom + tavsif + avatar. Zararli kanal nomlari (masalan porno/tarafkash) auto-hide.
    after(() => moderateOnCreate({
        module: "NEXUS", targetType: "CHANNEL_MESSAGE",   // Alohida "CHANNEL" target yo'q, message-level'da yashiramiz
        targetId: channel.id,
        text: `${channel.name}\n${channel.description || ""}\n${channel.handle || ""}`,
        imageUrl: channel.avatarUrl,
        kind: t === "GROUP" ? "guruh" : "kanal",
        authorId: me.id,
    }));

    return NextResponse.json({ channel: { id: channel.id, type: channel.type, name: channel.name, handle: channel.handle } });
}
