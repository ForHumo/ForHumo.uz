// Papka tahrirlash / o'chirish.
//   PATCH  /api/nexus/folders/[id]     body: { name?, emoji?, color?, includeTypes?, includeUnread?, sort? }
//   DELETE /api/nexus/folders/[id]

import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const VALID_TYPES = new Set(["private", "channel", "group", "bot", "contacts", "noncontacts"]);

async function meAndFolder(id: string) {
    const s = await getServerSession(authOptions);
    if (!s?.user?.email) return { me: null, folder: null };
    const me = await prisma.userProfile.findUnique({ where: { email: s.user.email }, select: { id: true } });
    if (!me) return { me: null, folder: null };
    const folder = await prisma.nexusChatFolder.findUnique({ where: { id } });
    return { me, folder };
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    const { me, folder } = await meAndFolder(id);
    if (!me) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (!folder || folder.profileId !== me.id) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const body = await req.json().catch(() => ({}));
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const data: any = {};
    if (typeof body?.name === "string") data.name = body.name.trim().slice(0, 30);
    if (typeof body?.emoji === "string") data.emoji = body.emoji.trim().slice(0, 4) || null;
    if (typeof body?.color === "string") data.color = body.color.trim().slice(0, 20) || null;
    if (Array.isArray(body?.includeTypes)) {
        data.includeTypes = [...new Set(body.includeTypes.filter((t: unknown) => typeof t === "string" && VALID_TYPES.has(t as string)) as string[])];
    }
    if (typeof body?.includeUnread === "boolean") data.includeUnread = body.includeUnread;
    if (typeof body?.sort === "number") data.sort = Math.max(0, Math.floor(body.sort));

    // addChatId / removeChatId — includeChatIds ro'yxatiga qo'shish/olib tashlash (kanal ID, guruh ID, profile ID)
    const addId = typeof body?.addChatId === "string" ? body.addChatId.trim() : null;
    const removeId = typeof body?.removeChatId === "string" ? body.removeChatId.trim() : null;
    if (addId || removeId) {
        let list = [...folder.includeChatIds];
        if (addId && !list.includes(addId)) list.push(addId);
        if (removeId) list = list.filter(x => x !== removeId);
        data.includeChatIds = list.slice(0, 200);      // sanity cap
    }

    await prisma.nexusChatFolder.update({ where: { id }, data });
    return NextResponse.json({ ok: true });
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    const { me, folder } = await meAndFolder(id);
    if (!me) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (!folder || folder.profileId !== me.id) return NextResponse.json({ error: "Not found" }, { status: 404 });

    await prisma.nexusChatFolder.delete({ where: { id } });
    return NextResponse.json({ ok: true });
}
