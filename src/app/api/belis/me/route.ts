// Belis — kirgan foydalanuvchi ma'lumotini olish (booking autofill uchun).
// Humo ID + username + name + phone + verified + image.
//
// GET /api/belis/me

import { NextResponse } from "next/server";
import { requireBelisAuth } from "@/lib/belis-auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET() {
    const auth = await requireBelisAuth();
    if (auth instanceof NextResponse) return auth;

    const p = await prisma.userProfile.findUnique({
        where: { id: auth.profileId },
        select: {
            id: true, email: true,
            username: true, humoId: true,
            name: true, firstName: true, lastName: true,
            phone: true, image: true,
            emailVerified: true,
        },
    });
    if (!p) return NextResponse.json({ error: "not_found" }, { status: 404 });

    return NextResponse.json({
        profileId: p.id,
        email: p.email,
        username: p.username,
        humoId: p.humoId,
        name: p.name || [p.firstName, p.lastName].filter(Boolean).join(" ").trim() || null,
        phone: p.phone,
        image: p.image,
        emailVerified: !!p.emailVerified,
        isAdmin: auth.isAdmin,
        hasHumoId: !!p.humoId,
    });
}
