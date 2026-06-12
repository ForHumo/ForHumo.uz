import { NextResponse, after } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { nexusNotify } from "@/lib/nexus-notify";
import { isBlockedBetween } from "@/lib/nexus-block";
import { sendTip, type TipTarget } from "@/lib/nexus-tip";
import { nexusRateLimited, RATE_MSG } from "@/lib/nexus-rate";

const VALID_TARGETS: TipTarget[] = ["PROFILE", "POST", "VIDEO", "LIVE"];

// POST /api/nexus/tip — ijodkorni qo'llab-quvvatlash (Zij donat)
// body: { recipientUsername|recipientId, amountZij, targetType?, targetId?, message? }
export async function POST(req: Request) {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const me = await prisma.userProfile.findUnique({ where: { email: session.user.email }, select: { id: true } });
    if (!me) return NextResponse.json({ error: "Profil topilmadi" }, { status: 404 });

    const body = await req.json();
    const { recipientUsername, recipientId, amountZij, targetType, targetId, message } = body;

    let recId: string | null = recipientId ?? null;
    if (!recId && recipientUsername) {
        const r = await prisma.userProfile.findUnique({ where: { username: recipientUsername }, select: { id: true } });
        recId = r?.id ?? null;
    }
    if (!recId) return NextResponse.json({ error: "Ijodkor topilmadi" }, { status: 404 });
    if (recId === me.id) return NextResponse.json({ error: "O'zingizga tip yubora olmaysiz" }, { status: 400 });
    if (await isBlockedBetween(me.id, recId)) return NextResponse.json({ error: "Bu ijodkorni qo'llab-quvvatlay olmaysiz" }, { status: 403 });
    if (await nexusRateLimited(me.id, "tip")) return NextResponse.json({ error: RATE_MSG }, { status: 429 });

    const tType: TipTarget = VALID_TARGETS.includes(targetType) ? targetType : "PROFILE";

    const { result, tipId } = await sendTip({
        donorId: me.id, recipientId: recId, amountZij,
        targetType: tType, targetId: typeof targetId === "string" ? targetId : null, message,
    });

    if (result === "no_funds") return NextResponse.json({ error: "Mablag' yetarli emas — ALKH Pay hamyoningizni to'ldiring" }, { status: 402 });
    if (result === "self") return NextResponse.json({ error: "O'zingizga tip yubora olmaysiz" }, { status: 400 });
    if (result !== "ok") return NextResponse.json({ error: "Noto'g'ri miqdor" }, { status: 400 });

    const amount = Math.round(Number(amountZij));
    after(() => nexusNotify({
        recipientId: recId, actorId: me.id, type: "TIP", amountZij: amount,
        postId: tType === "POST" ? targetId : null,
        videoId: tType === "VIDEO" ? targetId : null,
        liveId: tType === "LIVE" ? targetId : null,
    }));

    return NextResponse.json({ ok: true, tipId });
}
