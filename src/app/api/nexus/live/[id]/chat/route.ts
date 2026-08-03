import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { isVerifiedProfile } from "@/lib/nexus";
import { nexusRateLimited, RATE_MSG } from "@/lib/nexus-rate";
import { banGuard } from "@/lib/moderation-guard";
import { moderateOnCreate } from "@/lib/moderation";
import { sendTip } from "@/lib/nexus-tip";
import { nexusNotify } from "@/lib/nexus-notify";
import { isBlockedBetween, getHiddenAuthorIds } from "@/lib/nexus-block";
import { after } from "next/server";

// GET /api/nexus/live/[id]/chat?since=<ISO> — chat xabarlari (polling)
export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    const { searchParams } = new URL(req.url);
    const since = searchParams.get("since");

    // Kirgan tomoshabin uchun bloklangan/mute mualliflar xabarlarini yashiramiz
    let myId: string | null = null;
    const session = await getServerSession(authOptions);
    if (session?.user?.email) {
        const p = await prisma.userProfile.findUnique({ where: { email: session.user.email }, select: { id: true } });
        myId = p?.id ?? null;
    }
    const hiddenIds = (await getHiddenAuthorIds(myId)).filter(x => x !== myId);

    const msgs = await prisma.nexusLiveMessage.findMany({
        where: {
            streamId: id, hidden: false,
            ...(since ? { createdAt: { gt: new Date(since) } } : {}),
            ...(hiddenIds.length ? { profileId: { notIn: hiddenIds } } : {}),
        },
        orderBy: { createdAt: "asc" },
        take: 100,
    });

    const ids = [...new Set(msgs.map(m => m.profileId))];
    const profs = ids.length
        ? await prisma.userProfile.findMany({ where: { id: { in: ids } }, select: { id: true, name: true, username: true, image: true, humoId: true, verified: true, verifiedCategory: true } })
        : [];
    const pMap = Object.fromEntries(profs.map(p => [p.id, p]));

    return NextResponse.json({
        messages: msgs.map(m => {
            const p = pMap[m.profileId];
            return {
                id: m.id, text: m.text, tipAmount: m.tipAmount, createdAt: m.createdAt,
                author: p ? { name: p.name, username: p.username, image: p.image, verified: isVerifiedProfile(p), verifiedCategory: isVerifiedProfile(p) ? (p.verifiedCategory || null) : null } : null,
            };
        }),
    });
}

// POST /api/nexus/live/[id]/chat — xabar yuborish
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const me = await prisma.userProfile.findUnique({
        where: { email: session.user.email },
        select: { id: true, name: true, username: true, image: true, humoId: true, verified: true, verifiedCategory: true },
    });
    if (!me) return NextResponse.json({ error: "Profil topilmadi" }, { status: 404 });

    const { id } = await params;
    const stream = await prisma.nexusLiveStream.findUnique({ where: { id }, select: { status: true, profileId: true } });
    if (!stream) return NextResponse.json({ error: "Topilmadi" }, { status: 404 });
    if (stream.status === "ENDED") return NextResponse.json({ error: "Efir tugagan" }, { status: 400 });

    const { text, tipAmount } = await req.json();
    const tip = Math.round(Number(tipAmount) || 0);
    const isSuperChat = tip > 0;
    // Oddiy xabarda matn shart; Super Chat'da matn ixtiyoriy
    if (!isSuperChat && !text?.trim()) return NextResponse.json({ error: "Matn kerak" }, { status: 400 });
    const banned = await banGuard(me.id); if (banned) return banned;
    if (await nexusRateLimited(me.id, "liveChat")) return NextResponse.json({ error: RATE_MSG }, { status: 429 });

    const cleanText = String(text || "").trim().slice(0, 500);

    // ── Super Chat: efir egasiga Zij tip + ajratilgan xabar ──
    if (isSuperChat) {
        if (stream.profileId === me.id) return NextResponse.json({ error: "O'z efiringizga tip yubora olmaysiz" }, { status: 400 });
        if (await isBlockedBetween(me.id, stream.profileId)) return NextResponse.json({ error: "Bu efirga tip yubora olmaysiz" }, { status: 403 });
        if (await nexusRateLimited(me.id, "tip")) return NextResponse.json({ error: RATE_MSG }, { status: 429 });

        const { result, received } = await sendTip({
            donorId: me.id, recipientId: stream.profileId, amount: tip,
            targetType: "LIVE", targetId: id, message: cleanText,
        });
        if (result === "no_funds") return NextResponse.json({ error: "Mablag' yetarli emas — ALKH Pay hamyoningizni to'ldiring" }, { status: 402 });
        if (result !== "ok") return NextResponse.json({ error: "Super Chat amalga oshmadi" }, { status: 400 });

        const sc = await prisma.nexusLiveMessage.create({
            data: { streamId: id, profileId: me.id, text: cleanText, tipAmount: tip },
        });
        after(() => nexusNotify({ recipientId: stream.profileId, actorId: me.id, type: "TIP", liveId: id, amount: received ?? null }));
        // Super Chat matni ham moderatsiya
        if (cleanText) after(() => moderateOnCreate({ module: "NEXUS", targetType: "LIVE_MESSAGE", targetId: sc.id, text: cleanText, kind: "jonli efir Super Chat", authorId: me.id }));

        return NextResponse.json({
            message: {
                id: sc.id, text: sc.text, tipAmount: sc.tipAmount, createdAt: sc.createdAt,
                author: { name: me.name, username: me.username, image: me.image, verified: isVerifiedProfile(me), verifiedCategory: isVerifiedProfile(me) ? (me.verifiedCategory || null) : null },
            },
        });
    }

    // ── Oddiy chat xabari ──
    const msg = await prisma.nexusLiveMessage.create({
        data: { streamId: id, profileId: me.id, text: cleanText },
    });

    // Chat xabarini moderatsiya (real-time — javobni kutib turmaymiz; nojo'ya bo'lsa keyingi pollingda yo'qoladi)
    after(() => moderateOnCreate({
        module: "NEXUS", targetType: "LIVE_MESSAGE", targetId: msg.id, text: msg.text, kind: "jonli efir chat xabari",
    }));

    return NextResponse.json({
        message: {
            id: msg.id, text: msg.text, tipAmount: 0, createdAt: msg.createdAt,
            author: { name: me.name, username: me.username, image: me.image, verified: isVerifiedProfile(me) },
        },
    });
}
