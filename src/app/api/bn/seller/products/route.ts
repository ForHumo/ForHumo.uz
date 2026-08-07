// Sotuvchi o'z mahsulotlarini boshqaradi.
//
//   GET  /api/bn/seller/products             — do'kon mahsulotlari (barchasi, hidden ham)
//   POST /api/bn/seller/products             — yaratish
//     body: {
//       title, description?, price, oldPrice?, marketAvgPrice?,
//       categorySlug, images[], attributes{}, stock,
//       isNegotiable?, allowPickup?, allowDelivery?, allowInspect?,
//     }

import { NextResponse } from "next/server";
import { after } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireBnAuth } from "@/lib/bn-auth";
import { uniqueSlug } from "@/lib/bn-slug";
import { moderateOnCreate } from "@/lib/moderation";
import { checkForbiddenKeywords, moderateBnProduct } from "@/lib/bn-moderation";

async function requireSellerShop(profileId: string) {
    const shop = await prisma.bnShop.findFirst({
        where: { profileId },
        select: { id: true, status: true },
    });
    if (!shop) return { error: NextResponse.json({ error: "no_shop" }, { status: 404 }) };
    if (shop.status !== "APPROVED") {
        return { error: NextResponse.json({ error: "shop_not_approved", status: shop.status }, { status: 403 }) };
    }
    return { shop };
}

export async function GET() {
    const auth = await requireBnAuth();
    if (auth instanceof NextResponse) return auth;
    const shopRes = await requireSellerShop(auth.profileId);
    if ("error" in shopRes) return shopRes.error;

    const products = await prisma.bnProduct.findMany({
        where: { shopId: shopRes.shop.id },
        orderBy: { createdAt: "desc" },
        include: { category: { select: { slug: true, name: true } } },
    });
    return NextResponse.json({ products });
}

export async function POST(req: Request) {
    const auth = await requireBnAuth();
    if (auth instanceof NextResponse) return auth;
    const shopRes = await requireSellerShop(auth.profileId);
    if ("error" in shopRes) return shopRes.error;

    const body = await req.json().catch(() => ({}));
    const title = String(body?.title ?? "").trim();
    const description = String(body?.description ?? "").trim().slice(0, 2000) || null;
    const price = Math.max(0, Math.floor(Number(body?.price) || 0));
    const oldPrice = body?.oldPrice != null ? Math.max(0, Math.floor(Number(body.oldPrice))) : null;
    const marketAvgPrice = body?.marketAvgPrice != null ? Math.max(0, Math.floor(Number(body.marketAvgPrice))) : null;
    const categorySlug = String(body?.categorySlug ?? "").trim();
    const stock = Math.max(0, Math.floor(Number(body?.stock) || 0));

    if (title.length < 3) return NextResponse.json({ error: "title_short" }, { status: 400 });
    if (price < 1000) return NextResponse.json({ error: "price_too_low" }, { status: 400 });
    if (!categorySlug) return NextResponse.json({ error: "category_required" }, { status: 400 });

    // Kalit-so'z tekshiruvi — darhol bloklash (AI ga bormasdan)
    const forbidden = checkForbiddenKeywords(`${title} ${description ?? ""}`);
    if (forbidden) {
        return NextResponse.json({
            error: "forbidden_keyword",
            reason: `Taqiqlangan: ${forbidden.label}. BN'da bunday mahsulot sotib bo'lmaydi.`,
        }, { status: 422 });
    }

    const cat = await prisma.bnCategory.findUnique({ where: { slug: categorySlug }, select: { id: true } });
    if (!cat) return NextResponse.json({ error: "category_not_found" }, { status: 404 });

    const rawImages = Array.isArray(body?.images) ? body.images.slice(0, 10) : [];
    const images = rawImages.map((s: unknown) => String(s)).filter(Boolean);

    let attributes: Record<string, unknown> = {};
    if (body?.attributes && typeof body.attributes === "object") {
        attributes = body.attributes as Record<string, unknown>;
    }

    const slug = await uniqueSlug(title, async (s) => {
        const cnt = await prisma.bnProduct.count({ where: { slug: s } });
        return cnt > 0;
    });

    const product = await prisma.bnProduct.create({
        data: {
            slug,
            shopId: shopRes.shop.id,
            categoryId: cat.id,
            title, description,
            price, oldPrice, marketAvgPrice,
            images,
            attributes: attributes as never,
            stock,
            isNegotiable: !!body?.isNegotiable,
            allowPickup:  body?.allowPickup === false ? false : true,
            allowDelivery: !!body?.allowDelivery,
            allowInspect:  body?.allowInspect === false ? false : true,
            isActive: true,
            hidden: false,
        },
    });

    // Do'kon productCount denorm
    await prisma.bnShop.update({
        where: { id: shopRes.shop.id },
        data: { productCount: { increment: 1 } },
    });

    // Pre-publish AI moderatsiya — javobni kechiktirmaydi (after).
    // BN-spetsifik strict moderatsiya (rasm+matn birga).
    after(async () => {
        const bnRes = await moderateBnProduct({
            title: product.title,
            description: product.description,
            imageUrl: product.images?.[0] ?? null,
        });
        // BLOCK bo'lsa avtomatik yashirish
        if (bnRes && bnRes.verdict === "BLOCK") {
            await prisma.bnProduct.update({
                where: { id: product.id },
                data: { isActive: false, hidden: true },
            });
        }
        // Umumiy moderatsiya (ModerationFlag yozadi, admin ko'radi)
        await moderateOnCreate({
            module: "BN",
            targetType: "BN_PRODUCT",
            targetId: product.id,
            text: `${product.title}\n\n${product.description ?? ""}`,
            imageUrl: product.images?.[0] ?? null,
            kind: "mahsulot",
            authorId: auth.profileId,
        });
    });

    return NextResponse.json({ ok: true, product });
}
