// GET /api/nexus/channels/[id]/mention-suggest?q=abc
// Guruh a'zolari orasidan @username tanlash uchun autocomplete taklif.
// Faqat guruh a'zolari qaytariladi (privacy — begona a'zolarni ko'rmaydi).

import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const MAX = 8;

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const { id } = await params;
    const me = await prisma.userProfile.findUnique({ where: { email: session.user.email }, select: { id: true } });
    if (!me) return NextResponse.json({ error: "profile" }, { status: 404 });

    const member = await prisma.nexusChannelMember.findUnique({
        where: { channelId_profileId: { channelId: id, profileId: me.id } },
        select: { id: true },
    });
    if (!member) return NextResponse.json({ items: [] });

    const url = new URL(req.url);
    const q = (url.searchParams.get("q") ?? "").trim().toLowerCase().replace(/^@/, "").slice(0, 32);

    const members = await prisma.nexusChannelMember.findMany({
        where: { channelId: id },
        select: { profileId: true },
        take: 500,
    });
    const ids = members.map(m => m.profileId).filter(pid => pid !== me.id);

    const profiles = await prisma.userProfile.findMany({
        where: {
            id: { in: ids },
            ...(q ? {
                OR: [
                    { username: { contains: q, mode: "insensitive" } },
                    { name: { contains: q, mode: "insensitive" } },
                ],
            } : {}),
            username: { not: null },
        },
        select: { id: true, name: true, username: true, image: true },
        take: MAX,
        orderBy: { username: "asc" },
    });

    return NextResponse.json({
        items: profiles.map(p => ({
            id: p.id, name: p.name, username: p.username, image: p.image,
        })),
    });
}
