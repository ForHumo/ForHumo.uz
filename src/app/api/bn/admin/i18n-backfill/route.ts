// Mavjud BN mahsulotlarni 3 tilga tarjima + searchIndex qayta qurish.
// Founder-only. Bir chaqiruv 20 tagacha qilar (rate-limit'ga qarshi).
//
//   POST /api/bn/admin/i18n-backfill
//     { limit?: 20 }
//   → { processed: number, remaining: number }

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireFounder } from "@/lib/admin-guard";
import { translateAndIndexProduct } from "@/lib/bn-i18n-product";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function POST(req: Request) {
    // requireFounder() founder profil'ni yoki null qaytaradi (hech qachon NextResponse emas).
    // Ilgari `instanceof NextResponse` tekshiruvi HECH QACHON true bo'lmasdi — anonim
    // POST endpoint'ga kirar edi (aslida Gemini xarajatini sarflaydigan xavf).
    const founder = await requireFounder();
    if (!founder) return NextResponse.json({ error: "founder_required" }, { status: 403 });

    const body = await req.json().catch(() => ({}));
    const limit = Math.min(50, Math.max(1, Number(body?.limit) || 20));

    // searchIndex bo'sh yoki juda qisqa mahsulotlarni tanlaymiz (eski yozuvlar)
    const targets = await prisma.bnProduct.findMany({
        where: {
            isActive: true,
            OR: [
                { searchIndex: null },
                { searchIndex: "" },
            ],
        },
        select: { id: true },
        take: limit,
    });

    for (const t of targets) {
        // Ketma-ket (Gemini rate-limit'ga qarshi) — parallel bo'lmasin
        await translateAndIndexProduct(t.id);
    }

    const remaining = await prisma.bnProduct.count({
        where: {
            isActive: true,
            OR: [{ searchIndex: null }, { searchIndex: "" }],
        },
    });

    return NextResponse.json({ processed: targets.length, remaining });
}
