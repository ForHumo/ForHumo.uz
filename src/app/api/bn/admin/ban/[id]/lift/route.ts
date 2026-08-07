// BN admin: ban ni bekor qilish (lift). OWNER va MODERATOR ikkalasi ham qila oladi.
//
//   POST /api/bn/admin/ban/:id/lift  { reason? }

import { NextResponse } from "next/server";
import { requireBnAuth } from "@/lib/bn-auth";
import { isBnAdmin } from "@/lib/bn-admin";
import { liftBan } from "@/lib/bn-ban";

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
    const auth = await requireBnAuth();
    if (auth instanceof NextResponse) return auth;
    if (!(await isBnAdmin(auth.profileId))) {
        return NextResponse.json({ error: "forbidden" }, { status: 403 });
    }
    const { id } = await params;
    const b = await req.json().catch(() => ({}));
    try {
        await liftBan(id, {
            liftedById: auth.profileId,
            liftReason: typeof b?.reason === "string" ? b.reason.trim() : undefined,
        });
        return NextResponse.json({ ok: true });
    } catch (e) {
        return NextResponse.json({ error: (e as Error).message || "server" }, { status: 500 });
    }
}
