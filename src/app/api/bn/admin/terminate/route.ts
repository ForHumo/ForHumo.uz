// BN admin: do'konni chiqarib yuborish (TERMINATE).
// Faqat OWNER (yoki AI ichki chaqiruv orqali) qila oladi.
//
//   POST /api/bn/admin/terminate  { shopId, reason }

import { NextResponse } from "next/server";
import { requireBnAuth } from "@/lib/bn-auth";
import { isBnOwner } from "@/lib/bn-admin";
import { terminateShop } from "@/lib/bn-ban";

export async function POST(req: Request) {
    const auth = await requireBnAuth();
    if (auth instanceof NextResponse) return auth;
    if (!(await isBnOwner(auth.profileId))) {
        return NextResponse.json({ error: "forbidden" }, { status: 403 });
    }
    const b = await req.json().catch(() => ({}));
    const shopId = typeof b?.shopId === "string" ? b.shopId : "";
    const reason = typeof b?.reason === "string" ? b.reason.trim() : "";
    if (!shopId) return NextResponse.json({ error: "shop_required" }, { status: 400 });
    if (reason.length < 3) return NextResponse.json({ error: "reason_required" }, { status: 400 });

    try {
        await terminateShop(shopId, { reason, decidedBy: "OWNER", decidedById: auth.profileId });
        return NextResponse.json({ ok: true });
    } catch (e) {
        return NextResponse.json({ error: (e as Error).message || "server" }, { status: 500 });
    }
}
