// YukGo — e'lonlar lentasi (public GET). Telefon QAYTMAYDI (gated — contact endpointda).
// GET /api/yukgo/listings?type=CARGO|TRUCK&from=&to=&limit=&offset=

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import type { Prisma } from "@prisma/client";
import { cityVariants } from "@/lib/yukgo-cities";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
    const { searchParams } = new URL(req.url);
    const typeParam = (searchParams.get("type") || "").toUpperCase();
    const type = typeParam === "CARGO" || typeParam === "TRUCK" ? typeParam : null;
    const from = (searchParams.get("from") || "").trim();
    const to = (searchParams.get("to") || "").trim();
    const limit = Math.min(Number(searchParams.get("limit") ?? 24), 50);
    const offset = Math.max(0, Number(searchParams.get("offset") ?? 0));

    const now = new Date();
    // from/to filtrlarini AND bilan birlashtiramiz (har biri shahar/matn OR'i)
    const and: Prisma.YukListingWhereInput[] = [];
    // Shahar variantlari bilan kengaytiramiz: "Toshkent" → "Тошкент"/"Ташкент" ham topiladi
    if (from) {
        const vs = cityVariants(from);
        and.push({ OR: vs.flatMap(v => [{ fromCity: { contains: v, mode: "insensitive" as const } }, { fromText: { contains: v, mode: "insensitive" as const } }]) });
    }
    if (to) {
        const vs = cityVariants(to);
        and.push({ OR: vs.flatMap(v => [{ toCity: { contains: v, mode: "insensitive" as const } }, { toText: { contains: v, mode: "insensitive" as const } }]) });
    }
    const finalWhere: Prisma.YukListingWhereInput = {
        status: "ACTIVE",
        AND: [{ OR: [{ expiresAt: null }, { expiresAt: { gt: now } }] }, ...and],
        ...(type ? { type } : { type: { in: ["CARGO", "TRUCK"] } }),
    };

    const rows = await prisma.yukListing.findMany({
        where: finalWhere,
        orderBy: [{ boostedUntil: { sort: "desc", nulls: "last" } }, { createdAt: "desc" }],
        take: limit, skip: offset,
        include: { source: { select: { kind: true, title: true, username: true } } },
    });

    const listings = rows.map(r => ({
        id: r.id,
        type: r.type,
        fromText: r.fromText, fromCity: r.fromCity, fromCountry: r.fromCountry,
        toText: r.toText, toCity: r.toCity, toCountry: r.toCountry,
        cargo: r.cargo,
        weightTons: r.weightTons,
        truckTypes: r.truckTypes,
        quantityTrucks: r.quantityTrucks,
        price: r.priceAmount != null || r.priceNegotiable
            ? { amount: r.priceAmount != null ? Number(r.priceAmount) : null, currency: r.priceCurrency, negotiable: r.priceNegotiable }
            : null,
        lang: r.lang,
        createdAt: r.createdAt,
        boosted: !!(r.boostedUntil && r.boostedUntil > now),
        isNative: !!r.postedById,   // saytда o'zi joylagan (tasdiqlangan tier)
        hasContact: (r.phones?.length ?? 0) > 0 || !!r.sourceLink,
        sourceKind: r.source?.kind ?? "NATIVE",
        sourceTitle: r.source?.title ?? null,
        // ⚠️ phones / sourceLink QAYTMAYDI — gated (contact endpoint)
    }));

    return NextResponse.json({ listings, hasMore: rows.length === limit });
}
