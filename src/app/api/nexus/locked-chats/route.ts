// GET/POST/DELETE /api/nexus/locked-chats
// Owner uchun locked (yashirin) chatlar ro'yxati.
//   GET    → { peerIds: string[] }
//   POST   { peerId } — chatni lock'ga qo'shish
//   DELETE { peerId } — lock'dan olib tashlash (PIN talab qilinmaydi bu erda; verify avval bo'lgan)

import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

async function me() {
    const s = await getServerSession(authOptions);
    if (!s?.user?.email) return null;
    return prisma.userProfile.findUnique({ where: { email: s.user.email }, select: { id: true } });
}

export async function GET() {
    const owner = await me();
    if (!owner) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const items = await prisma.nexusLockedChat.findMany({
        where: { ownerId: owner.id }, select: { peerId: true },
    });
    return NextResponse.json({ peerIds: items.map(i => i.peerId) });
}

export async function POST(req: Request) {
    const owner = await me();
    if (!owner) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const body = await req.json().catch(() => ({}));
    const peerId = String(body?.peerId ?? "");
    if (!peerId) return NextResponse.json({ error: "peerId kerak" }, { status: 400 });

    // Chat lock PIN sozlanganmi tekshirish
    const lock = await prisma.nexusChatLock.findUnique({ where: { ownerId: owner.id } });
    if (!lock) return NextResponse.json({ error: "Avval PIN sozlang" }, { status: 400 });

    await prisma.nexusLockedChat.upsert({
        where: { ownerId_peerId: { ownerId: owner.id, peerId } },
        create: { ownerId: owner.id, peerId },
        update: {},
    });
    return NextResponse.json({ ok: true });
}

export async function DELETE(req: Request) {
    const owner = await me();
    if (!owner) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const body = await req.json().catch(() => ({}));
    const peerId = String(body?.peerId ?? "");
    if (!peerId) return NextResponse.json({ error: "peerId kerak" }, { status: 400 });
    await prisma.nexusLockedChat.deleteMany({ where: { ownerId: owner.id, peerId } });
    return NextResponse.json({ ok: true });
}
