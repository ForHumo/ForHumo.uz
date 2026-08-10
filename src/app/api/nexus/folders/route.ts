// Foydalanuvchining Nexus chat papkalari (Telegram uslubidagi custom folders).
//
//   GET  /api/nexus/folders           → mening papkalarim (tartiblangan)
//   POST /api/nexus/folders           → yangi papka
//     body: { name, emoji?, color?, includeTypes[], includeUnread?, includeChatIds[]?, excludeChatIds[]? }

import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const MAX_FOLDERS = 10;
const VALID_TYPES = new Set(["private", "channel", "group", "bot", "contacts", "noncontacts"]);

async function me() {
    const s = await getServerSession(authOptions);
    if (!s?.user?.email) return null;
    return prisma.userProfile.findUnique({ where: { email: s.user.email }, select: { id: true } });
}

export async function GET() {
    const p = await me();
    if (!p) return NextResponse.json({ items: [] });
    const items = await prisma.nexusChatFolder.findMany({
        where: { profileId: p.id },
        orderBy: [{ sort: "asc" }, { createdAt: "asc" }],
    });
    return NextResponse.json({
        max: MAX_FOLDERS,
        items: items.map(f => ({
            id: f.id,
            name: f.name,
            emoji: f.emoji,
            color: f.color,
            includeTypes: f.includeTypes,
            includeUnread: f.includeUnread,
            includeChatIds: f.includeChatIds,
            excludeChatIds: f.excludeChatIds,
            sort: f.sort,
        })),
    });
}

export async function POST(req: Request) {
    const p = await me();
    if (!p) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const name = String(body?.name ?? "").trim().slice(0, 30);
    if (name.length < 1) return NextResponse.json({ error: "Nom kiriting" }, { status: 400 });

    const count = await prisma.nexusChatFolder.count({ where: { profileId: p.id } });
    if (count >= MAX_FOLDERS) {
        return NextResponse.json({ error: `Maks ${MAX_FOLDERS} ta papka` }, { status: 400 });
    }

    const emoji = typeof body?.emoji === "string" ? body.emoji.trim().slice(0, 4) : null;
    const color = typeof body?.color === "string" ? body.color.trim().slice(0, 20) : null;
    const includeTypes: string[] = Array.isArray(body?.includeTypes)
        ? [...new Set(body.includeTypes.filter((t: unknown) => typeof t === "string" && VALID_TYPES.has(t as string)) as string[])]
        : [];
    const includeUnread = !!body?.includeUnread;

    const folder = await prisma.nexusChatFolder.create({
        data: {
            profileId: p.id,
            name, emoji, color,
            includeTypes, includeUnread,
            includeChatIds: [], excludeChatIds: [],
            sort: count,
        },
    });

    return NextResponse.json({
        ok: true,
        folder: {
            id: folder.id, name: folder.name, emoji: folder.emoji, color: folder.color,
            includeTypes: folder.includeTypes, includeUnread: folder.includeUnread,
            includeChatIds: folder.includeChatIds, excludeChatIds: folder.excludeChatIds,
            sort: folder.sort,
        },
    });
}
