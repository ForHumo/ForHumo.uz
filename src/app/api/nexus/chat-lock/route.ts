// GET/POST/DELETE /api/nexus/chat-lock
// Foydalanuvchining global PIN sozlamasi.
//   GET   → { hasLock: bool, hintText: string|null }
//   POST  → { pin: string(4-8 digit), hint?: string } — birinchi marta yoki almashtirish
//   PATCH → { oldPin, newPin } — PIN o'zgartirish
//   DELETE → { pin } — PIN'ni butunlay olib tashlash (locked chatlar ham tozalanadi)

import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { hashPin, isPinValid } from "@/lib/nexus-chat-lock";

async function me() {
    const s = await getServerSession(authOptions);
    if (!s?.user?.email) return null;
    return prisma.userProfile.findUnique({ where: { email: s.user.email }, select: { id: true } });
}

export async function GET() {
    const owner = await me();
    if (!owner) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const lock = await prisma.nexusChatLock.findUnique({ where: { ownerId: owner.id } });
    return NextResponse.json({ hasLock: !!lock, hintText: lock?.hintText ?? null });
}

export async function POST(req: Request) {
    const owner = await me();
    if (!owner) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const body = await req.json().catch(() => ({}));
    const pin = String(body?.pin ?? "");
    const hint = typeof body?.hint === "string" ? body.hint.trim().slice(0, 80) : null;
    if (!isPinValid(pin)) return NextResponse.json({ error: "PIN 4-8 raqam bo'lishi kerak" }, { status: 400 });

    const pinHash = hashPin(pin, owner.id);
    const existing = await prisma.nexusChatLock.findUnique({ where: { ownerId: owner.id } });
    if (existing) return NextResponse.json({ error: "PIN allaqachon sozlangan. O'zgartirish uchun PATCH ishlating" }, { status: 400 });

    await prisma.nexusChatLock.create({
        data: { ownerId: owner.id, pinHash, hintText: hint },
    });
    return NextResponse.json({ ok: true });
}

export async function PATCH(req: Request) {
    const owner = await me();
    if (!owner) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const body = await req.json().catch(() => ({}));
    const oldPin = String(body?.oldPin ?? "");
    const newPin = String(body?.newPin ?? "");
    if (!isPinValid(newPin)) return NextResponse.json({ error: "Yangi PIN 4-8 raqam" }, { status: 400 });

    const lock = await prisma.nexusChatLock.findUnique({ where: { ownerId: owner.id } });
    if (!lock) return NextResponse.json({ error: "PIN sozlanmagan" }, { status: 400 });
    if (lock.pinHash !== hashPin(oldPin, owner.id)) {
        return NextResponse.json({ error: "Eski PIN noto'g'ri" }, { status: 400 });
    }
    await prisma.nexusChatLock.update({
        where: { ownerId: owner.id },
        data: { pinHash: hashPin(newPin, owner.id) },
    });
    return NextResponse.json({ ok: true });
}

export async function DELETE(req: Request) {
    const owner = await me();
    if (!owner) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const body = await req.json().catch(() => ({}));
    const pin = String(body?.pin ?? "");

    const lock = await prisma.nexusChatLock.findUnique({ where: { ownerId: owner.id } });
    if (!lock) return NextResponse.json({ ok: true });
    if (lock.pinHash !== hashPin(pin, owner.id)) {
        return NextResponse.json({ error: "PIN noto'g'ri" }, { status: 400 });
    }
    await prisma.$transaction([
        prisma.nexusLockedChat.deleteMany({ where: { ownerId: owner.id } }),
        prisma.nexusChatLock.delete({ where: { ownerId: owner.id } }),
    ]);
    return NextResponse.json({ ok: true });
}
