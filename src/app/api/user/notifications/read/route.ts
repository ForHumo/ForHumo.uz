// Notification'ni o'qildi belgilash.
//
//   POST /api/user/notifications/read
//     { id: "nx-abc" | "bn-xyz" }   — bittasini
//     { all: true }                 — hammasini

import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(req: Request) {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) return NextResponse.json({ error: "auth_required" }, { status: 401 });

    const profile = await prisma.userProfile.findUnique({
        where: { email: session.user.email }, select: { id: true },
    });
    if (!profile) return NextResponse.json({ error: "profile_not_found" }, { status: 404 });

    const body = await req.json().catch(() => ({}));

    if (body?.all) {
        const [n, b] = await Promise.all([
            prisma.nexusNotification.updateMany({
                where: { recipientId: profile.id, read: false }, data: { read: true },
            }).catch(() => ({ count: 0 })),
            prisma.bnNotification.updateMany({
                where: { profileId: profile.id, read: false }, data: { read: true },
            }).catch(() => ({ count: 0 })),
        ]);
        return NextResponse.json({ ok: true, updated: n.count + b.count });
    }

    const id = typeof body?.id === "string" ? body.id : null;
    if (!id) return NextResponse.json({ error: "id_required" }, { status: 400 });

    // Prefix ajratish
    if (id.startsWith("nx-")) {
        const nid = id.slice(3);
        await prisma.nexusNotification.updateMany({
            where: { id: nid, recipientId: profile.id }, data: { read: true },
        }).catch(() => {});
        return NextResponse.json({ ok: true });
    }
    if (id.startsWith("bn-")) {
        const nid = id.slice(3);
        await prisma.bnNotification.updateMany({
            where: { id: nid, profileId: profile.id }, data: { read: true },
        }).catch(() => {});
        return NextResponse.json({ ok: true });
    }

    return NextResponse.json({ ok: true, skipped: "unsupported_prefix" });
}
