// Nexus Chat Folders (Telegram uslub) — foydalanuvchi o'z papkalarini yaratadi.
// Har papka: name + emoji + color + filtrlar (includeTypes/includeUnread/includeChatIds/excludeChatIds).
//
//   GET  /api/nexus/folders                 → { folders: [...] }
//   POST /api/nexus/folders                 body: { name, emoji?, color?, includeTypes?, includeUnread?, includeChatIds?, excludeChatIds? }
//   PATCH /api/nexus/folders (with id)      body: { id, ...fields }
//   DELETE /api/nexus/folders?id=X

import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const VALID_TYPES = new Set(["private", "channel", "group", "bot", "contacts", "noncontacts"]);
const VALID_COLORS = new Set(["red", "orange", "yellow", "green", "teal", "blue", "violet", "pink"]);

async function meId(email: string) {
    const me = await prisma.userProfile.findUnique({ where: { email }, select: { id: true } });
    return me?.id ?? null;
}

export async function GET() {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const me = await meId(session.user.email);
    if (!me) return NextResponse.json({ error: "Profil topilmadi" }, { status: 404 });
    const folders = await prisma.nexusChatFolder.findMany({
        where: { profileId: me }, orderBy: { sort: "asc" },
    });
    return NextResponse.json({ folders });
}

function sanitize(body: Record<string, unknown>) {
    const data: Record<string, unknown> = {};
    if (typeof body.name === "string" && body.name.trim()) data.name = body.name.trim().slice(0, 40);
    if (typeof body.emoji === "string") data.emoji = body.emoji.slice(0, 8) || null;
    if (typeof body.color === "string" && VALID_COLORS.has(body.color)) data.color = body.color;
    if (Array.isArray(body.includeTypes)) {
        data.includeTypes = body.includeTypes.filter((x): x is string => typeof x === "string" && VALID_TYPES.has(x));
    }
    if (typeof body.includeUnread === "boolean") data.includeUnread = body.includeUnread;
    if (Array.isArray(body.includeChatIds)) {
        data.includeChatIds = body.includeChatIds.filter((x): x is string => typeof x === "string").slice(0, 200);
    }
    if (Array.isArray(body.excludeChatIds)) {
        data.excludeChatIds = body.excludeChatIds.filter((x): x is string => typeof x === "string").slice(0, 200);
    }
    if (typeof body.sort === "number") data.sort = Math.floor(body.sort);
    return data;
}

export async function POST(req: Request) {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const me = await meId(session.user.email);
    if (!me) return NextResponse.json({ error: "Profil topilmadi" }, { status: 404 });
    const body = await req.json().catch(() => ({}));
    const data = sanitize(body);
    if (!data.name) return NextResponse.json({ error: "Nom kerak" }, { status: 400 });
    // Cheklov: har foydalanuvchi maks 20 papka
    const count = await prisma.nexusChatFolder.count({ where: { profileId: me } });
    if (count >= 20) return NextResponse.json({ error: "Maksimal 20 papka" }, { status: 400 });
    if (typeof data.sort !== "number") data.sort = count;
    const folder = await prisma.nexusChatFolder.create({
        data: { ...data, profileId: me, name: data.name as string },
    });
    return NextResponse.json({ folder });
}

export async function PATCH(req: Request) {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const me = await meId(session.user.email);
    if (!me) return NextResponse.json({ error: "Profil topilmadi" }, { status: 404 });
    const body = await req.json().catch(() => ({}));
    const id = String(body?.id ?? "");
    if (!id) return NextResponse.json({ error: "id kerak" }, { status: 400 });
    const existing = await prisma.nexusChatFolder.findUnique({ where: { id }, select: { profileId: true } });
    if (!existing || existing.profileId !== me) return NextResponse.json({ error: "not_found" }, { status: 404 });
    const data = sanitize(body);
    if (Object.keys(data).length === 0) return NextResponse.json({ ok: true, noChanges: true });
    const folder = await prisma.nexusChatFolder.update({ where: { id }, data });
    return NextResponse.json({ folder });
}

export async function DELETE(req: Request) {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const me = await meId(session.user.email);
    if (!me) return NextResponse.json({ error: "Profil topilmadi" }, { status: 404 });
    const url = new URL(req.url);
    const id = url.searchParams.get("id");
    if (!id) return NextResponse.json({ error: "id kerak" }, { status: 400 });
    const existing = await prisma.nexusChatFolder.findUnique({ where: { id }, select: { profileId: true } });
    if (!existing || existing.profileId !== me) return NextResponse.json({ error: "not_found" }, { status: 404 });
    await prisma.nexusChatFolder.delete({ where: { id } });
    return NextResponse.json({ ok: true });
}
