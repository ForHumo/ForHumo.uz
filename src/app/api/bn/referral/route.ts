// BN referral API — o'z linkim + statistika (kabinet ekrani uchun).
//
//   GET /api/bn/referral
//     Auth required. Qaytaradi:
//       { code, url, pending, rewarded, totalEarned }
//     - code: null bo'lsa foydalanuvchining username/humoId yo'q
//     - url: to'liq share URL (UTM'siz — client UTM qo'shadi)

import { NextResponse } from "next/server";
import { getBnAuth } from "@/lib/bn-auth";
import {
    getReferralStats,
    buildReferralUrl,
    REFERRAL_INVITER_BONUS,
    REFERRAL_INVITEE_BONUS,
} from "@/lib/bn-referral";

export async function GET() {
    const auth = await getBnAuth();
    if (!auth) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

    const stats = await getReferralStats(auth.profileId);
    return NextResponse.json({
        code: stats.code,
        url: stats.code ? buildReferralUrl(stats.code, "copy") : null,
        pending: stats.pending,
        rewarded: stats.rewarded,
        totalEarned: stats.totalEarned,
        inviterBonus: REFERRAL_INVITER_BONUS,
        inviteeBonus: REFERRAL_INVITEE_BONUS,
    });
}
