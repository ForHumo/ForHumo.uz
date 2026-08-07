// BN INSPECT — "Ko'rib sotib olish" bandi (24 soat).
//
// BN'ning eng katta farqi: xaridor bozorga borib mahsulotni ko'rmoqchi.
// Do'kon mahsulotni 24 soatga band qiladi, boshqalarga sotmaydi. Xaridor kelib
// ko'radi — yoqsa kodni aytadi, sotuvchi sotadi.
//
//   POST /api/bn/inspect                 { productId, qty? }         yaratish
//     - Faqat p.allowInspect bo'lsa
//     - Stok atomik kamayadi (band qilinadi)
//     - Kod (BN-XXXX) va expiresAt (now+24h) qaytadi
//
//   POST /api/bn/inspect/[code]/confirm  (sotuvchi)                  tasdiqlash
//     - Kod kiritiladi, tegishli buyurtma yaratiladi (naqd, PICKUP)
//     - Hold "used" belgilanadi
//
//   POST /api/bn/inspect/[code]/cancel   (xaridor)                   bekor qilish (24 soat ichida)
//     - Stok tiklanadi

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireBnAuth } from "@/lib/bn-auth";

const HOLD_HOURS = 24;

function genHoldCode(): string {
    const r = Math.random().toString(36).slice(2, 6).toUpperCase();
    return `BN-${r}`;
}

/** Xaridor barcha faol holdlarni ko'radi. */
export async function GET() {
    const auth = await requireBnAuth();
    if (auth instanceof NextResponse) return auth;
    const holds = await prisma.bnInspectHold.findMany({
        where: {
            profileId: auth.profileId,
            usedAt: null, cancelledAt: null,
            expiresAt: { gt: new Date() },
        },
        orderBy: { createdAt: "desc" },
    });
    return NextResponse.json({ holds });
}

/** Yangi hold yaratish. Faqat allowInspect mahsulot uchun. */
export async function POST(req: Request) {
    const auth = await requireBnAuth();
    if (auth instanceof NextResponse) return auth;

    const body = await req.json().catch(() => ({}));
    const productId = String(body?.productId ?? "");
    const qty = Math.max(1, Math.min(3, Number(body?.qty) || 1));

    if (!productId) return NextResponse.json({ error: "productId_required" }, { status: 400 });

    const product = await prisma.bnProduct.findUnique({ where: { id: productId } });
    if (!product || !product.isActive || product.hidden) {
        return NextResponse.json({ error: "product_unavailable" }, { status: 404 });
    }
    if (!product.allowInspect) {
        return NextResponse.json({ error: "inspect_not_allowed" }, { status: 400 });
    }

    // Har bir xaridorda mahsulot bo'yicha 1 faol hold — dublikatni oldini olamiz
    const existing = await prisma.bnInspectHold.findFirst({
        where: {
            profileId: auth.profileId, productId,
            usedAt: null, cancelledAt: null, expiresAt: { gt: new Date() },
        },
    });
    if (existing) {
        return NextResponse.json({
            error: "already_held",
            hold: existing,
        }, { status: 409 });
    }

    const expiresAt = new Date(Date.now() + HOLD_HOURS * 3600_000);
    let code = "";

    try {
        await prisma.$transaction(async (tx) => {
            // Stokni band qilamiz — atomik
            const upd = await tx.bnProduct.updateMany({
                where: { id: productId, stock: { gte: qty } },
                data:  { stock: { decrement: qty } },
            });
            if (upd.count === 0) throw new Error("OVERSELL");

            // Yagona kod (band emasligini tekshirib)
            for (let i = 0; i < 5; i++) {
                const tryCode = genHoldCode();
                const exists = await tx.bnInspectHold.count({ where: { code: tryCode } });
                if (exists === 0) { code = tryCode; break; }
            }
            if (!code) throw new Error("CODE_COLLISION");

            await tx.bnInspectHold.create({
                data: {
                    code, productId, profileId: auth.profileId, qty, expiresAt,
                },
            });
        });
    } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : String(e);
        if (msg === "OVERSELL") return NextResponse.json({ error: "insufficient_stock" }, { status: 409 });
        return NextResponse.json({ error: "hold_failed", detail: msg }, { status: 500 });
    }

    return NextResponse.json({ ok: true, code, expiresAt, holdHours: HOLD_HOURS });
}
