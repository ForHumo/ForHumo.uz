// GET/PATCH /api/nexus/peer-label/[peerId]
// Owner uchun peer nickname/color/wallpaper. Faqat owner'ga ko'rinadi (private).

import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const COLORS = ["red", "orange", "green", "blue", "purple", "teal", "pink", "gray"];

export async function GET(_req: Request, { params }: { params: Promise<{ peerId: string }> }) {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const { peerId } = await params;
    const me = await prisma.userProfile.findUnique({
        where: { email: session.user.email }, select: { id: true },
    });
    if (!me) return NextResponse.json({ error: "profile" }, { status: 404 });

    const label = await prisma.nexusPeerLabel.findUnique({
        where: { ownerId_peerId: { ownerId: me.id, peerId } },
    });
    return NextResponse.json({
        nickname: label?.nickname ?? null,
        color: label?.color ?? null,
        wallpaper: label?.wallpaper ?? null,
    });
}

export async function PATCH(req: Request, { params }: { params: Promise<{ peerId: string }> }) {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const { peerId } = await params;
    const me = await prisma.userProfile.findUnique({
        where: { email: session.user.email }, select: { id: true },
    });
    if (!me) return NextResponse.json({ error: "profile" }, { status: 404 });

    const body = await req.json().catch(() => ({}));
    const nickname = typeof body?.nickname === "string"
        ? body.nickname.trim().slice(0, 40) || null
        : undefined;
    const color = typeof body?.color === "string" && COLORS.includes(body.color)
        ? body.color
        : (body?.color === null ? null : undefined);
    const wallpaper = typeof body?.wallpaper === "string"
        ? body.wallpaper.trim().slice(0, 500) || null
        : (body?.wallpaper === null ? null : undefined);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const data: any = {};
    if (nickname !== undefined) data.nickname = nickname;
    if (color !== undefined) data.color = color;
    if (wallpaper !== undefined) data.wallpaper = wallpaper;

    // Barcha maydonlar null bo'lsa — yozuvni o'chirish (foydalanuvchi barchasini bekor qilgan)
    const existing = await prisma.nexusPeerLabel.findUnique({
        where: { ownerId_peerId: { ownerId: me.id, peerId } },
    });
    const finalNickname = nickname !== undefined ? nickname : existing?.nickname ?? null;
    const finalColor = color !== undefined ? color : existing?.color ?? null;
    const finalWallpaper = wallpaper !== undefined ? wallpaper : existing?.wallpaper ?? null;

    if (!finalNickname && !finalColor && !finalWallpaper) {
        if (existing) await prisma.nexusPeerLabel.delete({ where: { id: existing.id } });
        return NextResponse.json({ nickname: null, color: null, wallpaper: null });
    }

    const updated = await prisma.nexusPeerLabel.upsert({
        where: { ownerId_peerId: { ownerId: me.id, peerId } },
        create: { ownerId: me.id, peerId, ...data },
        update: data,
    });
    return NextResponse.json({
        nickname: updated.nickname,
        color: updated.color,
        wallpaper: updated.wallpaper,
    });
}
