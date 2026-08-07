// BN sotuvchi ariza — POST bilan yuboriladi.
// BnShop PENDING holatida yaratiladi. 1 profil = 1 do'kon (profileId @unique).
// OWNER admin panelida ko'radi va approve/reject qiladi.
//
// POST /api/bn/seller/apply
//   body: {
//     legalType: "YATT" | "MCHJ",
//     legalName: string,      // F.I.SH yoki MChJ nomi
//     innNumber: string,      // STIR/INN (unique)
//     phone: string,
//     shopName: string,
//     description?: string,
//     locationType: "IN_MARKET" | "STANDALONE" | "ONLINE",
//     marketSlug?: string,    // IN_MARKET uchun
//     marketSection?: string,
//     marketShopNo?: string,
//     address?: string,       // STANDALONE uchun
//     city?: string,
//     bankName?: string,
//     bankAccount?: string,
//     bankMfo?: string,
//   }
//
// GET /api/bn/seller/apply — mavjud ariza (agar bor bo'lsa) qaytadi.

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireBnAuth } from "@/lib/bn-auth";
import { uniqueSlug } from "@/lib/bn-slug";

export async function GET() {
    const auth = await requireBnAuth();
    if (auth instanceof NextResponse) return auth;
    const shop = await prisma.bnShop.findFirst({
        where: { profileId: auth.profileId },
        include: { market: { select: { slug: true, name: true } } },
    });
    return NextResponse.json({ shop });
}

export async function POST(req: Request) {
    const auth = await requireBnAuth();
    if (auth instanceof NextResponse) return auth;

    const body = await req.json().catch(() => ({}));

    const legalType = body?.legalType === "MCHJ" ? "MCHJ" : "YATT";
    const legalName = String(body?.legalName ?? "").trim();
    const innNumber = String(body?.innNumber ?? "").replace(/\D/g, "");
    const phone     = String(body?.phone ?? "").trim();
    const shopName  = String(body?.shopName ?? "").trim();
    const description = String(body?.description ?? "").trim().slice(0, 500) || null;
    const locationType = body?.locationType;
    const marketSlug   = body?.marketSlug ? String(body.marketSlug) : null;
    const marketSection = String(body?.marketSection ?? "").trim() || null;
    const marketShopNo  = String(body?.marketShopNo ?? "").trim() || null;
    const address = String(body?.address ?? "").trim() || null;
    const city    = String(body?.city ?? "Toshkent").trim() || "Toshkent";
    const bankName    = String(body?.bankName ?? "").trim() || null;
    const bankAccount = String(body?.bankAccount ?? "").replace(/\D/g, "") || null;
    const bankMfo     = String(body?.bankMfo ?? "").replace(/\D/g, "") || null;

    // Validatsiya
    if (legalName.length < 3) return NextResponse.json({ error: "legal_name_short" }, { status: 400 });
    if (innNumber.length < 9) return NextResponse.json({ error: "inn_invalid" }, { status: 400 });
    if (phone.replace(/\D/g, "").length < 9) return NextResponse.json({ error: "phone_invalid" }, { status: 400 });
    if (shopName.length < 2) return NextResponse.json({ error: "shop_name_short" }, { status: 400 });

    if (!["IN_MARKET", "STANDALONE", "ONLINE"].includes(locationType)) {
        return NextResponse.json({ error: "invalid_location_type" }, { status: 400 });
    }
    let marketId: string | null = null;
    if (locationType === "IN_MARKET") {
        if (!marketSlug) return NextResponse.json({ error: "market_required" }, { status: 400 });
        const m = await prisma.bnMarket.findUnique({ where: { slug: marketSlug }, select: { id: true } });
        if (!m) return NextResponse.json({ error: "market_not_found" }, { status: 404 });
        marketId = m.id;
        // Bir profil bitta bozorda faqat bitta do'kon ocha oladi
        const dupInMarket = await prisma.bnShop.findFirst({
            where: { profileId: auth.profileId, marketId }, select: { id: true },
        });
        if (dupInMarket) {
            return NextResponse.json({ error: "market_shop_taken" }, { status: 409 });
        }
    }
    if (locationType === "STANDALONE" && (!address || address.length < 5)) {
        return NextResponse.json({ error: "address_required" }, { status: 400 });
    }
    if (locationType === "ONLINE") {
        // Online do'kon — bir profilga bittasi. marketId null bo'lgani uchun composite unique ishlamaydi, qo'lda tekshiramiz.
        const dupOnline = await prisma.bnShop.findFirst({
            where: { profileId: auth.profileId, locationType: "ONLINE" }, select: { id: true },
        });
        if (dupOnline) {
            return NextResponse.json({ error: "online_shop_taken" }, { status: 409 });
        }
    }

    // INN dublikatini tekshirish (schema level unique bo'lsa ham, aniq xato beramiz)
    const innDup = await prisma.bnShop.findFirst({ where: { innNumber } });
    if (innDup) {
        return NextResponse.json({ error: "inn_taken" }, { status: 409 });
    }

    // Slug yaratamiz (do'kon nomidan)
    const slug = await uniqueSlug(shopName, async (s) => {
        const cnt = await prisma.bnShop.count({ where: { slug: s } });
        return cnt > 0;
    });

    try {
        const shop = await prisma.bnShop.create({
            data: {
                slug,
                profileId: auth.profileId,
                name: shopName,
                description,
                legalType,
                legalName,
                innNumber,
                phone,
                locationType,
                marketId,
                marketSection,
                marketShopNo,
                address,
                city,
                bankName,
                bankAccount,
                bankMfo,
                status: "PENDING",
                tier: "NEW",
            },
        });
        return NextResponse.json({ ok: true, shop });
    } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : String(e);
        if (msg.includes("P2002")) {
            return NextResponse.json({ error: "duplicate" }, { status: 409 });
        }
        return NextResponse.json({ error: "create_failed", detail: msg }, { status: 500 });
    }
}
