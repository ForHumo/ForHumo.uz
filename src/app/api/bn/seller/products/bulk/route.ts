// Bulk product import — sotuvchi Excel/TSV orqali 100+ mahsulot yuklaydi.
//
// POST /api/bn/seller/products/bulk
//   body: {
//     mode: "validate" | "commit",
//     rows: Array<{ title, price, stock?, description?, categorySlug, oldPrice?, images? }>,
//     defaultCategorySlug?: string  // agar row'da yo'q bo'lsa
//   }
//
// Chegara: 200 qator/so'rov.
// Validate: har rowga { ok, errors[], product? } qaytadi.
// Commit: create atomic (bittasi xato bo'lsa ham qolganlari yaratiladi;
//         faqat WITH ATOMIC ITEM (row bo'yicha) — batch to'liq atomik emas).

import { NextResponse } from "next/server";
import { after } from "next/server";
import { revalidateTag } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireBnAuth } from "@/lib/bn-auth";
import { uniqueSlug } from "@/lib/bn-slug";
import { checkForbiddenKeywords } from "@/lib/bn-moderation";
import { checkBoycott } from "@/lib/bn-boycott";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const MAX_ROWS = 200;

interface RowInput {
    title?: string;
    price?: number | string;
    stock?: number | string;
    description?: string;
    categorySlug?: string;
    oldPrice?: number | string;
    images?: string; // space or | separated URL list
    // Avto import (AI import'dan keladi)
    partNumber?: string | null;
    oemNumbers?: string[];
    universalFit?: boolean;
    fits?: string[];   // BnCarModel id'lari
}

interface RowResult {
    index: number;
    title: string;
    ok: boolean;
    errors: string[];
    warnings: string[];
    productId?: string;
    slug?: string;
}

function parseInt0(v: unknown): number {
    if (v == null || v === "") return 0;
    const n = Number(String(v).replace(/[^\d.-]/g, ""));
    return Number.isFinite(n) ? Math.max(0, Math.floor(n)) : 0;
}

export async function POST(req: Request) {
    const auth = await requireBnAuth();
    if (auth instanceof NextResponse) return auth;

    const shop = await prisma.bnShop.findFirst({
        where: { profileId: auth.profileId },
        select: { id: true, status: true },
    });
    if (!shop) return NextResponse.json({ error: "no_shop" }, { status: 403 });
    if (shop.status !== "APPROVED") return NextResponse.json({ error: "not_approved" }, { status: 403 });

    const body = await req.json().catch(() => ({}));
    const mode: "validate" | "commit" = body?.mode === "commit" ? "commit" : "validate";
    const rows: RowInput[] = Array.isArray(body?.rows) ? body.rows : [];
    const defaultCategorySlug = String(body?.defaultCategorySlug ?? "").trim() || null;

    if (rows.length === 0) return NextResponse.json({ error: "no_rows" }, { status: 400 });
    if (rows.length > MAX_ROWS) return NextResponse.json({ error: "too_many_rows", max: MAX_ROWS }, { status: 400 });

    // Kategoriya slug'larni oldindan yuklaymiz — har row uchun DB'ga bormaslik
    const usedSlugs = new Set<string>();
    for (const r of rows) {
        const s = String(r.categorySlug ?? "").trim() || defaultCategorySlug;
        if (s) usedSlugs.add(s);
    }
    const categories = await prisma.bnCategory.findMany({
        where: { slug: { in: [...usedSlugs] } },
        select: { id: true, slug: true },
    });
    const catMap = new Map(categories.map(c => [c.slug, c.id]));

    // Avto moslik — barcha row'lardagi modelId'larni oldindan yig'ib validatsiya
    const allFitIds = new Set<string>();
    for (const r of rows) {
        if (Array.isArray(r.fits)) for (const id of r.fits) if (id) allFitIds.add(String(id));
    }
    const validFitIds = allFitIds.size
        ? new Set((await prisma.bnCarModel.findMany({ where: { id: { in: [...allFitIds] }, isActive: true }, select: { id: true } })).map(m => m.id))
        : new Set<string>();

    const { buildSearchIndex, translateAndIndexProduct } = await import("@/lib/bn-i18n-product");

    const results: RowResult[] = [];

    for (let i = 0; i < rows.length; i++) {
        const r = rows[i];
        const errors: string[] = [];
        const warnings: string[] = [];
        const title = String(r.title ?? "").trim();
        const description = String(r.description ?? "").trim().slice(0, 2000) || null;
        const price = parseInt0(r.price);
        const oldPrice = r.oldPrice != null && r.oldPrice !== "" ? parseInt0(r.oldPrice) : null;
        const stock = r.stock != null && r.stock !== "" ? parseInt0(r.stock) : 1;
        const categorySlug = String(r.categorySlug ?? "").trim() || defaultCategorySlug || "";
        const imagesRaw = String(r.images ?? "").trim();
        const images = imagesRaw
            ? imagesRaw.split(/[|\s]+/).map(s => s.trim()).filter(s => /^https?:\/\//.test(s)).slice(0, 10)
            : [];
        // Avto moslik maydonlari
        const partNumber = r.partNumber ? (String(r.partNumber).trim().slice(0, 64) || null) : null;
        const oemNumbers = Array.isArray(r.oemNumbers)
            ? [...new Set(r.oemNumbers.map(s => String(s).trim()).filter(Boolean))].slice(0, 20)
            : [];
        const universalFit = !!r.universalFit;
        const rowFitIds = Array.isArray(r.fits)
            ? [...new Set(r.fits.map(String).filter(id => validFitIds.has(id)))].slice(0, 60)
            : [];

        // Validatsiya
        if (title.length < 3) errors.push("title_short");
        if (price < 1000) errors.push("price_too_low");
        if (!categorySlug) errors.push("category_required");
        else if (!catMap.has(categorySlug)) errors.push(`category_not_found:${categorySlug}`);

        // Kalit-so'z va boykot — inline
        if (title || description) {
            const kw = checkForbiddenKeywords(`${title} ${description ?? ""}`);
            if (kw) errors.push(`forbidden_keyword:${kw.label}`);
        }

        if (errors.length === 0) {
            // Ogohlantirishlar (block emas)
            if (images.length === 0) warnings.push("no_images");
            if (!description) warnings.push("no_description");
            if (oldPrice != null && oldPrice <= price) warnings.push("old_price_not_greater");
        }

        const row: RowResult = {
            index: i,
            title: title || `#${i + 1}`,
            ok: errors.length === 0,
            errors,
            warnings,
        };

        // Commit rejimida — yaratamiz
        if (row.ok && mode === "commit") {
            try {
                // Boykot — DB call, faqat commit paytida
                const boycott = await checkBoycott(`${title} ${description ?? ""}`);
                if (boycott) {
                    row.ok = false;
                    row.errors.push(`boycott_brand:${boycott.name}`);
                } else {
                    const slug = await uniqueSlug(title, async (s) => {
                        const cnt = await prisma.bnProduct.count({ where: { slug: s } });
                        return cnt > 0;
                    });
                    // Qism raqami (dashsiz variant ham) qidiruv indeksiga
                    const partTokens: string[] = [];
                    if (partNumber) partTokens.push(partNumber, partNumber.replace(/[^a-z0-9]/gi, ""));
                    for (const o of oemNumbers) partTokens.push(o, o.replace(/[^a-z0-9]/gi, ""));
                    const baseIndex = buildSearchIndex({ title, description });
                    const searchIndex = partTokens.length
                        ? `${baseIndex} ${partTokens.join(" ").toLowerCase()}`
                        : baseIndex;

                    const created = await prisma.bnProduct.create({
                        data: {
                            slug,
                            shopId: shop.id,
                            categoryId: catMap.get(categorySlug)!,
                            title,
                            description,
                            searchIndex,
                            price,
                            oldPrice,
                            images,
                            attributes: {} as never,
                            stock,
                            isNegotiable: false,
                            allowPickup: true,
                            allowDelivery: false,
                            allowInspect: true,
                            partNumber,
                            oemNumbers,
                            universalFit,
                            isActive: true,
                            hidden: false,
                        },
                        select: { id: true, slug: true },
                    });
                    row.productId = created.id;
                    row.slug = created.slug;

                    // Moslik yozuvlari
                    if (!universalFit && rowFitIds.length) {
                        await prisma.bnProductFit.createMany({
                            data: rowFitIds.map(modelId => ({ productId: created.id, modelId })),
                            skipDuplicates: true,
                        });
                    }
                    // 3-til tarjima + indeks (fon; javobni kechiktirmaydi)
                    after(() => translateAndIndexProduct(created.id));
                }
            } catch (e) {
                row.ok = false;
                row.errors.push(`db_error:${e instanceof Error ? e.message.slice(0, 100) : "unknown"}`);
            }
        }

        results.push(row);
    }

    const okCount = results.filter(r => r.ok).length;
    const errCount = results.length - okCount;

    // Commit muvaffaqiyatli bo'lsa — productCount denorm yangilash
    if (mode === "commit" && okCount > 0) {
        await prisma.bnShop.update({
            where: { id: shop.id },
            data: { productCount: { increment: okCount } },
        });
        try { revalidateTag("bn-products"); revalidateTag("bn-shops"); } catch { /* fail-safe */ }
    }

    return NextResponse.json({
        mode,
        total: results.length,
        okCount,
        errCount,
        results,
    });
}
