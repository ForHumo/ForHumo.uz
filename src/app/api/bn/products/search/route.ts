// BN mahsulot qidiruv — pagination uchun client-side "Yana yuklash".
// SSR sahifa birinchi 60 tasini beradi, keyin client shu endpoint'ni chaqiradi.

import { NextResponse } from "next/server";
import { searchProducts } from "@/lib/bn-data";
import { getBnAuth } from "@/lib/bn-auth";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET(req: Request) {
    const url = new URL(req.url);
    const q = url.searchParams.get("q") ?? undefined;
    const categorySlug = url.searchParams.get("category") ?? undefined;
    const marketSlug = url.searchParams.get("market") ?? undefined;
    const sortRaw = url.searchParams.get("sort") ?? "new";
    const sort = (["cheap", "new", "rating", "seasonal"].includes(sortRaw) ? sortRaw : "new") as
        "cheap" | "new" | "rating" | "seasonal";
    const skip = Math.max(0, Number(url.searchParams.get("skip")) || 0);
    const limit = Math.min(60, Math.max(1, Number(url.searchParams.get("limit")) || 30));
    const wholesaleOnly = url.searchParams.get("wholesale") === "1";

    const auth = await getBnAuth().catch(() => null);
    const products = await searchProducts({
        q, categorySlug, marketSlug, sort, skip, limit,
        profileId: auth?.profileId ?? null,
        wholesaleOnly,
    });

    return NextResponse.json({
        products,
        hasMore: products.length === limit,   // to'liq oynaga tushdi => keyingi sahifa bor
        skip,
        limit,
    });
}
