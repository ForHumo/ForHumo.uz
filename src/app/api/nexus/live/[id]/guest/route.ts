import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { isVerifiedProfile } from "@/lib/nexus";
import { after } from "next/server";
import { nexusNotify } from "@/lib/nexus-notify";
import { sendPushToProfile } from "@/lib/push";

// Batch H — Multi-guest co-host management
// GET  /guest — active guests (barcha)
// POST /guest { username } — streamer taklif qiladi (APPROVED darhol)
// DELETE /guest { profileId } — streamer kick / guest self-leave

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    const guests = await prisma.nexusLiveGuest.findMany({
        where: { streamId: id, status: "APPROVED" },
        select: { guestProfileId: true, invitedAt: true, joinedAt: true },
    });
    if (!guests.length) return NextResponse.json({ guests: [] });
    const profs = await prisma.userProfile.findMany({
        where: { id: { in: guests.map(g => g.guestProfileId) } },
        select: { id: true, name: true, username: true, image: true, humoId: true, verified: true, verifiedCategory: true },
    });
    const pMap = Object.fromEntries(profs.map(p => [p.id, p]));
    return NextResponse.json({
        guests: guests.map(g => {
            const p = pMap[g.guestProfileId];
            return {
                profileId: g.guestProfileId,
                invitedAt: g.invitedAt,
                joined: !!g.joinedAt,
                author: p ? { name: p.name, username: p.username, image: p.image, verified: isVerifiedProfile(p), verifiedCategory: isVerifiedProfile(p) ? (p.verifiedCategory || null) : null } : null,
            };
        }),
    });
}

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const me = await prisma.userProfile.findUnique({ where: { email: session.user.email }, select: { id: true, name: true, username: true } });
    if (!me) return NextResponse.json({ error: "Profil topilmadi" }, { status: 404 });

    const { id } = await params;
    const stream = await prisma.nexusLiveStream.findUnique({ where: { id }, select: { profileId: true, status: true, title: true } });
    if (!stream || stream.profileId !== me.id) return NextResponse.json({ error: "Faqat streamer" }, { status: 403 });
    if (stream.status !== "LIVE") return NextResponse.json({ error: "Faol emas" }, { status: 400 });

    const { username } = await req.json();
    const uname = String(username || "").trim().replace(/^@/, "").toLowerCase();
    if (!uname) return NextResponse.json({ error: "username kerak" }, { status: 400 });
    const target = await prisma.userProfile.findUnique({ where: { username: uname }, select: { id: true } });
    if (!target) return NextResponse.json({ error: "Foydalanuvchi topilmadi" }, { status: 404 });
    if (target.id === me.id) return NextResponse.json({ error: "O'zingizni taklif qila olmaysiz" }, { status: 400 });

    // Guest'ni APPROVED status bilan yaratish (yoki qayta faollashtirish)
    const guest = await prisma.nexusLiveGuest.upsert({
        where: { streamId_guestProfileId: { streamId: id, guestProfileId: target.id } },
        create: { streamId: id, guestProfileId: target.id, status: "APPROVED" },
        update: { status: "APPROVED", invitedAt: new Date(), leftAt: null },
    });

    // Push + system chat msg
    after(() => nexusNotify({ recipientId: target.id, actorId: me.id, type: "LIVE", liveId: id }));
    after(() => sendPushToProfile(target.id, {
        title: `${me.name || me.username || "Streamer"} sizni co-host qildi`,
        body: `"${stream.title}" efiriga qo'shiling`,
        url: `/nexus/live/${id}`, tag: `nx-guest-${id}`,
    }).catch(() => null));
    // System chat msg (efirda ko'rinadi)
    after(() => prisma.nexusLiveMessage.create({
        data: { streamId: id, profileId: me.id, text: `__nx_system:@${uname} co-host sifatida taklif qilindi` },
    }).catch(() => null));

    return NextResponse.json({ ok: true, guest });
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const me = await prisma.userProfile.findUnique({ where: { email: session.user.email }, select: { id: true } });
    if (!me) return NextResponse.json({ error: "Profil topilmadi" }, { status: 404 });

    const { id } = await params;
    const { profileId } = await req.json();
    const targetId = String(profileId || "");
    if (!targetId) return NextResponse.json({ error: "profileId kerak" }, { status: 400 });

    const stream = await prisma.nexusLiveStream.findUnique({ where: { id }, select: { profileId: true } });
    if (!stream) return NextResponse.json({ error: "Topilmadi" }, { status: 404 });
    // Streamer kick qila oladi, guest o'zi ham chiqishi mumkin
    const isOwner = stream.profileId === me.id;
    const isSelf = targetId === me.id;
    if (!isOwner && !isSelf) return NextResponse.json({ error: "Ruxsat yo'q" }, { status: 403 });

    await prisma.nexusLiveGuest.update({
        where: { streamId_guestProfileId: { streamId: id, guestProfileId: targetId } },
        data: { status: isOwner && !isSelf ? "KICKED" : "LEFT", leftAt: new Date() },
    }).catch(() => null);
    return NextResponse.json({ ok: true });
}
