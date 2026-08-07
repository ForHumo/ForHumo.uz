// BN admin: bittasini o'chirish yoki rolini o'zgartirish. Faqat OWNER.
//
//   DELETE /api/bn/admin/admins/:id       — adminni olib tashlash
//   PATCH  /api/bn/admin/admins/:id { role, note? }  — rolini yoki iznini o'zgartirish
//
// Qoidalar:
//   - Faqat OWNER
//   - OWNER boshqa OWNER'ni OLIB TASHLAY OLMAYDI (va rolini pasaytira olmaydi)
//   - O'zini o'zi olib tashlashi ham cheklangan (bir OWNER ham qolmasin)

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireBnAuth } from "@/lib/bn-auth";
import { isBnOwner } from "@/lib/bn-admin";

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
    const auth = await requireBnAuth();
    if (auth instanceof NextResponse) return auth;
    if (!(await isBnOwner(auth.profileId))) {
        return NextResponse.json({ error: "forbidden" }, { status: 403 });
    }
    const { id } = await params;

    const target = await prisma.bnAdmin.findUnique({ where: { id } });
    if (!target) return NextResponse.json({ error: "not_found" }, { status: 404 });

    // OWNER boshqa OWNER'ni olib tashlay olmaydi
    if (target.role === "OWNER") {
        return NextResponse.json({ error: "cannot_remove_owner" }, { status: 403 });
    }

    await prisma.bnAdmin.delete({ where: { id } });
    return NextResponse.json({ ok: true });
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
    const auth = await requireBnAuth();
    if (auth instanceof NextResponse) return auth;
    if (!(await isBnOwner(auth.profileId))) {
        return NextResponse.json({ error: "forbidden" }, { status: 403 });
    }
    const { id } = await params;
    const b = await req.json().catch(() => ({}));

    const target = await prisma.bnAdmin.findUnique({ where: { id } });
    if (!target) return NextResponse.json({ error: "not_found" }, { status: 404 });

    // OWNER'ni MODERATOR ga tushirib bo'lmaydi (bir-birini olib tashlay olmaslik qoidasi)
    const nextRole = b?.role === "OWNER" ? "OWNER" : "MODERATOR";
    if (target.role === "OWNER" && nextRole !== "OWNER") {
        return NextResponse.json({ error: "cannot_demote_owner" }, { status: 403 });
    }

    const updated = await prisma.bnAdmin.update({
        where: { id },
        data: {
            role: nextRole,
            note: typeof b?.note === "string" ? b.note.slice(0, 200) : target.note,
        },
    });
    return NextResponse.json({ ok: true, admin: updated });
}
