// BN admin — sotuvchi WAITLIST yozuvni yangilash (status + izoh).
//
// PATCH /api/bn/admin/waitlist/[id]
//   body: { status?, contactNote? }
//   Auth: OWNER/MODERATOR

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireBnAuth } from "@/lib/bn-auth";
import type { BnSellerWaitlistStatus } from "@prisma/client";

const ALLOWED_STATUS: BnSellerWaitlistStatus[] = ["PENDING", "CONTACTED", "CONVERTED", "REJECTED"];

async function requireBnAdmin(profileId: string): Promise<boolean> {
    const a = await prisma.bnAdmin.findUnique({
        where: { profileId }, select: { role: true },
    });
    return a?.role === "OWNER" || a?.role === "MODERATOR";
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
    const auth = await requireBnAuth();
    if (auth instanceof NextResponse) return auth;
    if (!(await requireBnAdmin(auth.profileId))) {
        return NextResponse.json({ error: "forbidden" }, { status: 403 });
    }

    const { id } = await params;
    const body = await req.json().catch(() => ({}));
    const nextStatus = body?.status as BnSellerWaitlistStatus | undefined;
    const contactNote = typeof body?.contactNote === "string"
        ? body.contactNote.trim().slice(0, 1000) || null
        : undefined;

    if (nextStatus && !ALLOWED_STATUS.includes(nextStatus)) {
        return NextResponse.json({ error: "invalid_status" }, { status: 400 });
    }

    const current = await prisma.bnSellerWaitlist.findUnique({ where: { id }, select: { status: true } });
    if (!current) return NextResponse.json({ error: "not_found" }, { status: 404 });

    // Har o'zgarishda: status PENDING'dan ko'chsa, contactedAt/By yozamiz
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const data: any = {};
    if (nextStatus) {
        data.status = nextStatus;
        if (nextStatus !== "PENDING" && current.status === "PENDING") {
            data.contactedAt = new Date();
            data.contactedById = auth.profileId;
        }
    }
    if (contactNote !== undefined) data.contactNote = contactNote;

    if (Object.keys(data).length === 0) {
        return NextResponse.json({ ok: true, unchanged: true });
    }

    const updated = await prisma.bnSellerWaitlist.update({ where: { id }, data });
    return NextResponse.json({
        ok: true,
        entry: {
            ...updated,
            createdAt: updated.createdAt.toISOString(),
            updatedAt: updated.updatedAt.toISOString(),
            contactedAt: updated.contactedAt?.toISOString() ?? null,
        },
    });
}
