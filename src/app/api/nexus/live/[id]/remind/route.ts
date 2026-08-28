import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// Batch N — Rejalashtirilgan efirga eslatma (viewer subscribe)
// POST → toggle: mavjud bo'lsa o'chiradi, yo'q bo'lsa qo'shadi
export async function POST(_: Request, { params }: { params: Promise<{ id: string }> }) {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const me = await prisma.userProfile.findUnique({ where: { email: session.user.email }, select: { id: true } });
    if (!me) return NextResponse.json({ error: "Profil topilmadi" }, { status: 404 });

    const { id } = await params;
    const stream = await prisma.nexusLiveStream.findUnique({ where: { id }, select: { status: true, profileId: true } });
    if (!stream) return NextResponse.json({ error: "Topilmadi" }, { status: 404 });
    if (stream.status !== "UPCOMING") return NextResponse.json({ error: "Faqat rejalashtirilgan efir" }, { status: 400 });
    if (stream.profileId === me.id) return NextResponse.json({ error: "O'z efiringiz" }, { status: 400 });

    const existing = await prisma.nexusLiveReminder.findUnique({
        where: { streamId_profileId: { streamId: id, profileId: me.id } },
        select: { id: true },
    });
    if (existing) {
        await prisma.nexusLiveReminder.delete({ where: { id: existing.id } });
        return NextResponse.json({ subscribed: false });
    } else {
        await prisma.nexusLiveReminder.create({ data: { streamId: id, profileId: me.id } });
        return NextResponse.json({ subscribed: true });
    }
}

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) return NextResponse.json({ subscribed: false });
    const me = await prisma.userProfile.findUnique({ where: { email: session.user.email }, select: { id: true } });
    if (!me) return NextResponse.json({ subscribed: false });
    const { id } = await params;
    const existing = await prisma.nexusLiveReminder.findUnique({
        where: { streamId_profileId: { streamId: id, profileId: me.id } },
        select: { id: true },
    });
    return NextResponse.json({ subscribed: !!existing });
}
