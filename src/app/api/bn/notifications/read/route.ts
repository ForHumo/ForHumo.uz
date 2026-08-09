import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireBnAuth } from "@/lib/bn-auth";

export async function POST(req: Request) {
    const auth = await requireBnAuth();
    if (auth instanceof NextResponse) return auth;

    const body = await req.json().catch(() => ({}));
    const id = typeof body?.id === "string" ? body.id : null;
    const all = body?.all === true;

    if (all) {
        await prisma.bnNotification.updateMany({
            where: { profileId: auth.profileId, read: false },
            data: { read: true },
        });
        return NextResponse.json({ ok: true });
    }

    if (id) {
        await prisma.bnNotification.updateMany({
            where: { id, profileId: auth.profileId },
            data: { read: true },
        });
        return NextResponse.json({ ok: true });
    }
    return NextResponse.json({ error: "id_or_all_required" }, { status: 400 });
}
