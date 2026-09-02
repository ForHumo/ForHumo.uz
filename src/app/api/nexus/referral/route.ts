// Nexus referral — mening ma'lumotim + kod.
// GET → { code, pending, rewarded, earned, inviteLink }
// POST { code } → attach referral (foydalanuvchi manual kiritganda)

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { attachNxReferral, getNxReferralStats } from "@/lib/nexus-referral";

export const dynamic = "force-dynamic";

export async function GET() {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) return NextResponse.json({ error: "auth_required" }, { status: 401 });
    const me = await prisma.userProfile.findUnique({
        where: { email: session.user.email },
        select: { id: true, username: true, humoId: true },
    });
    if (!me) return NextResponse.json({ error: "auth_required" }, { status: 401 });

    const code = me.username || me.humoId || null;
    const stats = await getNxReferralStats(me.id);
    return NextResponse.json({
        code,
        inviteLink: code ? `https://forhumo.uz/nexus?ref=${encodeURIComponent(code)}` : null,
        ...stats,
    });
}

export async function POST(req: Request) {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) return NextResponse.json({ error: "auth_required" }, { status: 401 });
    const me = await prisma.userProfile.findUnique({
        where: { email: session.user.email },
        select: { id: true },
    });
    if (!me) return NextResponse.json({ error: "auth_required" }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const code = String(body?.code ?? "").trim();
    if (!code) return NextResponse.json({ error: "invalid_code" }, { status: 400 });

    const ok = await attachNxReferral(me.id, code);
    if (!ok) return NextResponse.json({ error: "already_referred_or_invalid" }, { status: 409 });
    return NextResponse.json({ ok: true });
}
