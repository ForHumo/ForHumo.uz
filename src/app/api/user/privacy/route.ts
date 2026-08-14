// Foydalanuvchi maxfiylik sozlamalari (kim menga xabar yozadi, last seen, avatar).
//
//   GET  /api/user/privacy
//   PATCH /api/user/privacy  body: { privacyDm?, privacyLastSeen?, privacyProfilePhoto? }
//
// Har biri: "all" | "contacts" | "none"

import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const VALID = new Set(["all", "contacts", "none"]);

export async function GET() {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const me = await prisma.userProfile.findUnique({
        where: { email: session.user.email },
        select: { privacyDm: true, privacyLastSeen: true, privacyProfilePhoto: true },
    });
    if (!me) return NextResponse.json({ error: "Profil topilmadi" }, { status: 404 });
    return NextResponse.json({
        privacyDm: me.privacyDm,
        privacyLastSeen: me.privacyLastSeen,
        privacyProfilePhoto: me.privacyProfilePhoto,
    });
}

export async function PATCH(req: Request) {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const data: any = {};
    if (typeof body.privacyDm === "string" && VALID.has(body.privacyDm)) data.privacyDm = body.privacyDm;
    if (typeof body.privacyLastSeen === "string" && VALID.has(body.privacyLastSeen)) data.privacyLastSeen = body.privacyLastSeen;
    if (typeof body.privacyProfilePhoto === "string" && VALID.has(body.privacyProfilePhoto)) data.privacyProfilePhoto = body.privacyProfilePhoto;

    if (Object.keys(data).length === 0) return NextResponse.json({ ok: true, noChanges: true });

    await prisma.userProfile.updateMany({
        where: { email: session.user.email }, data,
    });
    return NextResponse.json({ ok: true, ...data });
}
