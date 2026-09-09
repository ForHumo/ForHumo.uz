// Telegram user'ni Humo profiliga bog'lash.
// Foydalanuvchi bot'ni Telegram'da Business akkauntga ulaganda `pending-<tgId>`
// yozuvi yaratiladi. Web'ga kelib o'z telegramUserId'ni yuborsa — bog'laymiz.

import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(req: Request) {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

    const profile = await prisma.userProfile.findUnique({
        where: { email: session.user.email },
        select: { id: true },
    });
    if (!profile) return NextResponse.json({ error: "profile_not_found" }, { status: 404 });

    const body = await req.json().catch(() => ({}));
    const telegramUserId = typeof body?.telegramUserId === "string"
        ? body.telegramUserId.trim() : "";
    if (!/^\d{5,20}$/.test(telegramUserId)) {
        return NextResponse.json({ error: "invalid_telegram_id" }, { status: 400 });
    }

    // Bu telegramUserId bilan pending ulanish topamiz
    const pending = await prisma.humoBotConnection.findFirst({
        where: {
            telegramUserId,
            profileId: { startsWith: "pending-" },
        },
    });
    if (!pending) {
        return NextResponse.json({
            error: "no_pending_connection",
            hint: "Botni avval Telegram'da Business akkauntingizga ulang: Sozlamalar → Автоматизация чатов → @ForHumo_AIBot",
        }, { status: 404 });
    }

    // Bu profil oldin bog'lanmaganini tekshiramiz
    const existing = await prisma.humoBotConnection.findUnique({
        where: { profileId: profile.id },
    });
    if (existing) {
        return NextResponse.json({
            error: "already_linked",
            hint: "Sizning hisobingiz allaqachon bir Telegram akkauntga bog'langan.",
        }, { status: 409 });
    }

    // Bog'laymiz
    await prisma.humoBotConnection.update({
        where: { id: pending.id },
        data: { profileId: profile.id },
    });

    // Default sozlamalarni yaratamiz
    await prisma.humoBotConfig.upsert({
        where: { profileId: profile.id },
        create: { profileId: profile.id },
        update: {},
    });
    await prisma.humoBotSubscription.upsert({
        where: { profileId: profile.id },
        create: { profileId: profile.id },
        update: {},
    });

    return NextResponse.json({ ok: true });
}
