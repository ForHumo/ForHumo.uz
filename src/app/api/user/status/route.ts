// Foydalanuvchi maxsus statusi (emoji + matn + ixtiyoriy amal muddati).
//   POST /api/user/status  { emoji?, text?, expiresInMinutes? }
//   DELETE /api/user/status  — statusni tozalash

import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const MAX_EMOJI = 8;
const MAX_TEXT = 60;

export async function POST(req: Request) {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const emoji = typeof body?.emoji === "string" ? body.emoji.trim().slice(0, MAX_EMOJI) : null;
    const text = typeof body?.text === "string" ? body.text.trim().slice(0, MAX_TEXT) : null;
    const mins = typeof body?.expiresInMinutes === "number" ? Math.max(0, Math.min(24 * 60 * 30, Math.floor(body.expiresInMinutes))) : 0;

    if (!emoji && !text) return NextResponse.json({ error: "emoji yoki text kerak" }, { status: 400 });

    const expiresAt = mins > 0 ? new Date(Date.now() + mins * 60 * 1000) : null;

    await prisma.userProfile.update({
        where: { email: session.user.email },
        data: {
            statusEmoji: emoji || null,
            statusText: text || null,
            statusExpiresAt: expiresAt,
        },
    });
    return NextResponse.json({ ok: true, statusEmoji: emoji || null, statusText: text || null, statusExpiresAt: expiresAt });
}

export async function DELETE() {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    await prisma.userProfile.update({
        where: { email: session.user.email },
        data: { statusEmoji: null, statusText: null, statusExpiresAt: null },
    });
    return NextResponse.json({ ok: true });
}
