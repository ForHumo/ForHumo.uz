// Foydalanuvchi kirgandan keyin (client-side) sessionStorage'dagi ref kodni
// jo'natadi. attachReferralOnSignup PENDING BnReferral yaratadi.
//
//   POST /api/bn/referral/attach   body: { code }
//   Auth required. Fail-safe: attach bo'lmasa ham 200 qaytaramiz.

import { NextResponse } from "next/server";
import { getBnAuth } from "@/lib/bn-auth";
import { attachReferralOnSignup } from "@/lib/bn-referral";

export async function POST(req: Request) {
    const auth = await getBnAuth();
    if (!auth) return NextResponse.json({ ok: false, reason: "unauthorized" }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const code = typeof body?.code === "string" ? body.code : null;
    if (!code) return NextResponse.json({ ok: false, reason: "no-code" });

    const ok = await attachReferralOnSignup(auth.profileId, code);
    return NextResponse.json({ ok });
}
