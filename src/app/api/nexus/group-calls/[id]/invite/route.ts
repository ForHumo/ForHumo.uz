// Guruh chaqiruvga foydalanuvchilarni taklif qilish (Pusher event + Web Push).
// Ishtirokchi yozuvi kirganda (token endpoint) yaratiladi — taklif faqat xabar beradi.

import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getPusher, userChannel } from "@/lib/pusher-server";
import { sendPushToProfile } from "@/lib/push";
import { isBlockedBetween } from "@/lib/nexus-block";
import { after } from "next/server";

type Ctx = { params: Promise<{ id: string }> };

const MAX_INVITES = 20;

export async function POST(req: Request, { params }: Ctx) {
    const { id } = await params;
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) return NextResponse.json({ error: "Kirish talab" }, { status: 401 });
    const me = await prisma.userProfile.findUnique({
        where: { email: session.user.email },
        select: { id: true, name: true, username: true, image: true, humoId: true, verified: true },
    });
    if (!me) return NextResponse.json({ error: "Profil topilmadi" }, { status: 404 });

    const body = await req.json().catch(() => ({}));
    const raw: unknown = body?.profileIds;
    const profileIds: string[] = Array.isArray(raw)
        ? raw.filter((x): x is string => typeof x === "string").slice(0, MAX_INVITES)
        : [];
    if (!profileIds.length) return NextResponse.json({ error: "Ishtirokchi tanlanmagan" }, { status: 400 });

    const call = await prisma.nexusGroupCall.findUnique({
        where: { id },
        select: { id: true, roomName: true, title: true, hostId: true, status: true, participants: { select: { profileId: true } } },
    });
    if (!call) return NextResponse.json({ error: "Topilmadi" }, { status: 404 });
    if (call.status !== "ACTIVE") return NextResponse.json({ error: "Chaqiruv tugagan" }, { status: 409 });

    // Ruxsat: host yoki mavjud ishtirokchi taklif qila oladi
    const iAmParticipant = call.participants.some(p => p.profileId === me.id);
    if (!iAmParticipant && call.hostId !== me.id) {
        return NextResponse.json({ error: "Faqat ishtirokchi taklif qila oladi" }, { status: 403 });
    }

    // Bloklanganlarni filtrlash + o'zini istisno
    const filtered: string[] = [];
    for (const pid of profileIds) {
        if (pid === me.id) continue;
        if (await isBlockedBetween(me.id, pid)) continue;
        filtered.push(pid);
    }
    if (!filtered.length) return NextResponse.json({ error: "Ruxsat etilgan ishtirokchi topilmadi" }, { status: 400 });

    // Real profillarni tekshirib olamiz
    const profs = await prisma.userProfile.findMany({
        where: { id: { in: filtered } }, select: { id: true },
    });
    const validIds = profs.map(p => p.id);
    if (!validIds.length) return NextResponse.json({ error: "Profillar topilmadi" }, { status: 404 });

    const pusher = getPusher();
    const payload = {
        callId: call.id,
        roomName: call.roomName,
        title: call.title,
        inviter: me,
    };

    if (pusher) {
        for (const pid of validIds) {
            pusher.trigger(userChannel(pid), "group-call:invite", payload).catch(() => { });
        }
    }

    // Web push (fire-and-forget)
    after(async () => {
        const who = me.name || (me.username ? `@${me.username}` : "Kimdir");
        for (const pid of validIds) {
            await sendPushToProfile(pid, {
                title: "Guruh chaqiruv",
                body: `${who} sizni ${call.title || "guruh chaqiruvga"} taklif qilyapti`,
                url: `/nexus?join=${call.id}`,
                tag: `group-call-${call.id}`,
            }).catch(() => { });
        }
    });

    return NextResponse.json({ invited: validIds.length });
}
