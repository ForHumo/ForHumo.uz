// BN admin boshqaruv — faqat OWNER huquqi.
//
//   GET  /api/bn/admin/admins         — ro'yxat (OWNER va MODERATOR)
//   POST /api/bn/admin/admins         — yangi admin qo'shish { humoId, role: OWNER|MODERATOR, note? }
//                                       OWNER faqat OWNER qo'sha oladi; MODERATOR qo'shish ham OWNER
//
// Xavfsizlik qoidalari:
//   - Faqat OWNER bu endpointga kirish
//   - Foydalanuvchi topilmasa 404
//   - Allaqachon admin bo'lsa 409

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireBnAuth } from "@/lib/bn-auth";
import { isBnOwner } from "@/lib/bn-admin";

export async function GET() {
    const auth = await requireBnAuth();
    if (auth instanceof NextResponse) return auth;
    if (!(await isBnOwner(auth.profileId))) {
        return NextResponse.json({ error: "forbidden" }, { status: 403 });
    }

    const admins = await prisma.bnAdmin.findMany({ orderBy: { createdAt: "asc" } });
    const profiles = await prisma.userProfile.findMany({
        where: { id: { in: admins.map(a => a.profileId) } },
        select: { id: true, username: true, humoId: true, name: true, image: true, email: true },
    });
    const byId = new Map(profiles.map(p => [p.id, p]));
    return NextResponse.json({
        admins: admins.map(a => ({
            id: a.id,
            role: a.role,
            note: a.note,
            createdAt: a.createdAt,
            addedById: a.addedById,
            profile: byId.get(a.profileId) ?? null,
        })),
    });
}

export async function POST(req: Request) {
    const auth = await requireBnAuth();
    if (auth instanceof NextResponse) return auth;
    if (!(await isBnOwner(auth.profileId))) {
        return NextResponse.json({ error: "forbidden" }, { status: 403 });
    }

    const b = await req.json().catch(() => ({}));
    const humoId = typeof b?.humoId === "string" ? b.humoId.trim().toUpperCase() : "";
    const role = b?.role === "OWNER" ? "OWNER" : "MODERATOR";
    const note = typeof b?.note === "string" ? b.note.slice(0, 200) : null;

    if (!/^UZ\d{7}$/.test(humoId)) {
        return NextResponse.json({ error: "bad_humo_id" }, { status: 400 });
    }

    const profile = await prisma.userProfile.findFirst({
        where: { humoId }, select: { id: true },
    });
    if (!profile) return NextResponse.json({ error: "user_not_found" }, { status: 404 });

    const existing = await prisma.bnAdmin.findUnique({ where: { profileId: profile.id } });
    if (existing) return NextResponse.json({ error: "already_admin" }, { status: 409 });

    const created = await prisma.bnAdmin.create({
        data: { profileId: profile.id, role, note, addedById: auth.profileId },
    });
    return NextResponse.json({ ok: true, admin: created });
}
