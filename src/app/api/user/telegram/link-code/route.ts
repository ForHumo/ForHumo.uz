// Humo ID egasi Telegram bog'lash uchun 6-belgi kod oladi.
//   POST /api/user/telegram/link-code  → { code, expiresAt, botUsername, deepLink }
//   GET  /api/user/telegram/link-code  → shu bilan bir xil (yangilash)

import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { createLinkCode } from "@/lib/telegram-link";
import { BOTS } from "@/lib/telegram-bots";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

async function issue() {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

    const profile = await prisma.userProfile.findUnique({
        where: { email: session.user.email },
        select: { id: true },
    });
    if (!profile) return NextResponse.json({ error: "profile_not_found" }, { status: 404 });

    const { code, expiresAt } = await createLinkCode(profile.id);
    const botUsername = BOTS.humo_ai.username;
    return NextResponse.json({
        code,
        expiresAt: expiresAt.toISOString(),
        botUsername,
        deepLink: `https://t.me/${botUsername}?start=link_${code}`,
        bnBot: BOTS.bozor_narxida.username,
        bnDeepLink: `https://t.me/${BOTS.bozor_narxida.username}?start=link_${code}`,
    });
}

export const POST = issue;
export const GET = issue;
