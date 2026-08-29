import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// Batch CR — Custom chat commands (per-streamer)
// GET ?username=X — public list (chat resolve uchun)
// POST { name, response } — o'zi qo'shadi
// DELETE ?id=X

const NAME_RX = /^[a-z0-9_]{2,20}$/;

export async function GET(req: Request) {
    const { searchParams } = new URL(req.url);
    const username = searchParams.get("username");
    if (!username) return NextResponse.json({ commands: [] });
    const p = await prisma.userProfile.findUnique({ where: { username }, select: { id: true } });
    if (!p) return NextResponse.json({ commands: [] });
    const commands = await prisma.nexusLiveCommand.findMany({
        where: { profileId: p.id },
        orderBy: [{ usedCount: "desc" }, { createdAt: "asc" }],
        take: 50,
    });
    return NextResponse.json({ commands });
}

export async function POST(req: Request) {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const me = await prisma.userProfile.findUnique({ where: { email: session.user.email }, select: { id: true } });
    if (!me) return NextResponse.json({ error: "Profil topilmadi" }, { status: 404 });

    const count = await prisma.nexusLiveCommand.count({ where: { profileId: me.id } });
    if (count >= 50) return NextResponse.json({ error: "Max 50 buyruq" }, { status: 400 });

    const body = await req.json();
    const name = String(body.name || "").trim().toLowerCase().replace(/^!/, "");
    if (!NAME_RX.test(name)) return NextResponse.json({ error: "Nom faqat a-z, 0-9, _ (2-20 char)" }, { status: 400 });
    const response = String(body.response || "").trim().slice(0, 300);
    if (!response) return NextResponse.json({ error: "Javob kerak" }, { status: 400 });

    try {
        const cmd = await prisma.nexusLiveCommand.create({
            data: { profileId: me.id, name, response },
        });
        return NextResponse.json({ command: cmd });
    } catch {
        return NextResponse.json({ error: "Bu nom band" }, { status: 400 });
    }
}

export async function DELETE(req: Request) {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const me = await prisma.userProfile.findUnique({ where: { email: session.user.email }, select: { id: true } });
    if (!me) return NextResponse.json({ error: "Profil topilmadi" }, { status: 404 });
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    if (!id) return NextResponse.json({ error: "id kerak" }, { status: 400 });
    const c = await prisma.nexusLiveCommand.findUnique({ where: { id }, select: { profileId: true } });
    if (!c || c.profileId !== me.id) return NextResponse.json({ error: "Ruxsat yo'q" }, { status: 403 });
    await prisma.nexusLiveCommand.delete({ where: { id } });
    return NextResponse.json({ ok: true });
}
