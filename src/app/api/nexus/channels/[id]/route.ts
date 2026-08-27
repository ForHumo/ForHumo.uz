import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// GET /api/nexus/channels/[id] — tafsilot + mening a'zoligim
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const me = await prisma.userProfile.findUnique({ where: { email: session.user.email }, select: { id: true } });
    if (!me) return NextResponse.json({ error: "Profil topilmadi" }, { status: 404 });

    const { id } = await params;
    const channel = await prisma.nexusChannel.findUnique({ where: { id } });
    if (!channel || channel.hidden) return NextResponse.json({ error: "Topilmadi" }, { status: 404 });

    const membership = await prisma.nexusChannelMember.findUnique({
        where: { channelId_profileId: { channelId: id, profileId: me.id } },
    });
    if (channel.isPrivate && !membership) return NextResponse.json({ error: "Yopiq kanal" }, { status: 403 });

    const canPost = channel.type === "GROUP" ? !!membership : (membership?.role === "OWNER" || membership?.role === "ADMIN");
    return NextResponse.json({
        channel: {
            id: channel.id, type: channel.type, name: channel.name, handle: channel.handle,
            description: channel.description, avatarUrl: channel.avatarUrl, isPrivate: channel.isPrivate,
            memberCount: channel.memberCount, isOwner: channel.ownerId === me.id,
            isMember: !!membership, role: membership?.role ?? null, canPost,
            slowModeSeconds: channel.slowModeSeconds,
            defaultPermissions: channel.defaultPermissions,
            myIsAnonymous: membership?.isAnonymous ?? false,
            rules: channel.rules,
            coverUrl: channel.coverUrl,
            allowComments: channel.allowComments,
            autoDeleteAfterSeconds: channel.autoDeleteAfterSeconds,
            restrictForwarding: channel.restrictForwarding,
            aiModerator: channel.aiModerator,
            autoTranslate: channel.autoTranslate,
            esTeamId: channel.esTeamId,
            systemOwned: channel.systemOwned,
            signaturesEnabled: channel.signaturesEnabled,
            allowedReactions: channel.allowedReactions,
            createdAt: channel.createdAt,
            myMutedUntil: membership?.mutedUntil ?? null,
        },
    });
}

// PATCH /api/nexus/channels/[id] — tahrir (owner/admin) { name?, description?, avatarUrl? }
export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const me = await prisma.userProfile.findUnique({ where: { email: session.user.email }, select: { id: true } });
    if (!me) return NextResponse.json({ error: "Profil topilmadi" }, { status: 404 });

    const { id } = await params;
    const m = await prisma.nexusChannelMember.findUnique({ where: { channelId_profileId: { channelId: id, profileId: me.id } } });
    if (!m || (m.role !== "OWNER" && m.role !== "ADMIN")) return NextResponse.json({ error: "Ruxsat yo'q" }, { status: 403 });

    const body = await req.json();
    const { name, description, avatarUrl, coverUrl, rules, slowModeSeconds, defaultPermissions, allowComments,
        autoDeleteAfterSeconds, restrictForwarding, aiModerator, autoTranslate,
        signaturesEnabled, allowedReactions } = body as {
        name?: string; description?: string; avatarUrl?: string;
        coverUrl?: string; rules?: string;
        slowModeSeconds?: number;
        defaultPermissions?: Record<string, boolean>;
        allowComments?: boolean;
        autoDeleteAfterSeconds?: number;
        restrictForwarding?: boolean;
        aiModerator?: boolean;
        autoTranslate?: boolean;
        signaturesEnabled?: boolean;
        allowedReactions?: string[];
    };
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const data: any = {};
    if (typeof name === "string" && name.trim()) data.name = name.trim().slice(0, 80);
    if (typeof description === "string") data.description = description.trim().slice(0, 500) || null;
    if (typeof avatarUrl === "string") data.avatarUrl = avatarUrl || null;
    if (typeof coverUrl === "string") data.coverUrl = coverUrl || null;
    if (typeof rules === "string") data.rules = rules.trim().slice(0, 4000) || null;
    if (typeof allowComments === "boolean") data.allowComments = allowComments;
    // Slow mode — 0..3600 sekund (0 = o'chirilgan, max 1 soat)
    if (typeof slowModeSeconds === "number") {
        data.slowModeSeconds = Math.max(0, Math.min(3600, Math.floor(slowModeSeconds)));
    }
    // Default permissions — faqat ma'lum flag'lar (owner tomonidan)
    if (defaultPermissions && typeof defaultPermissions === "object" && m.role === "OWNER") {
        const allowed = ["sendMessages", "sendMedia", "sendLinks", "embedLinks", "addMembers", "pinMessages", "changeInfo"];
        const cleaned: Record<string, boolean> = {};
        for (const k of allowed) {
            if (typeof defaultPermissions[k] === "boolean") cleaned[k] = defaultPermissions[k];
        }
        data.defaultPermissions = cleaned;
    }
    // Auto-delete: 0..30 kun (sekundlarda), 0 = o'chirilgan
    if (typeof autoDeleteAfterSeconds === "number") {
        data.autoDeleteAfterSeconds = Math.max(0, Math.min(30 * 86400, Math.floor(autoDeleteAfterSeconds)));
    }
    // Restrict forwarding — faqat owner sozlaydi
    if (typeof restrictForwarding === "boolean" && m.role === "OWNER") {
        data.restrictForwarding = restrictForwarding;
    }
    if (typeof aiModerator === "boolean" && m.role === "OWNER") {
        data.aiModerator = aiModerator;
    }
    if (typeof autoTranslate === "boolean" && m.role === "OWNER") {
        data.autoTranslate = autoTranslate;
    }
    // Post signature (faqat CHANNEL uchun mazmunli, owner sozlaydi)
    if (typeof signaturesEnabled === "boolean" && m.role === "OWNER") {
        data.signaturesEnabled = signaturesEnabled;
    }
    // Ruxsat etilgan reaksiyalar to'plami (owner)
    if (Array.isArray(allowedReactions) && m.role === "OWNER") {
        const cleaned = allowedReactions
            .filter(e => typeof e === "string" && e.length > 0 && e.length <= 8)
            .slice(0, 16);
        data.allowedReactions = cleaned;
    }
    const updated = await prisma.nexusChannel.update({ where: { id }, data });
    return NextResponse.json({
        ok: true,
        channel: {
            id: updated.id, name: updated.name, description: updated.description, avatarUrl: updated.avatarUrl,
            slowModeSeconds: updated.slowModeSeconds, defaultPermissions: updated.defaultPermissions,
        },
    });
}

// DELETE /api/nexus/channels/[id] — o'chirish (faqat owner)
export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const me = await prisma.userProfile.findUnique({ where: { email: session.user.email }, select: { id: true } });
    if (!me) return NextResponse.json({ error: "Profil topilmadi" }, { status: 404 });
    const { id } = await params;

    // Rasmiy tizim kanal/guruhini o'chirish taqiq (faqat mute mumkin)
    const ch = await prisma.nexusChannel.findUnique({ where: { id }, select: { isSystem: true, ownerId: true } });
    if (!ch) return NextResponse.json({ error: "Topilmadi" }, { status: 404 });
    if (ch.isSystem) {
        return NextResponse.json({
            error: "Rasmiy For Humo kanal/guruhi o'chirilmaydi. Ovozsizlantirish (mute) uchun sozlamalardan foydalaning.",
        }, { status: 403 });
    }
    if (ch.ownerId !== me.id) return NextResponse.json({ error: "Ruxsat yo'q" }, { status: 403 });

    await prisma.nexusChannel.delete({ where: { id } });
    return NextResponse.json({ ok: true });
}
