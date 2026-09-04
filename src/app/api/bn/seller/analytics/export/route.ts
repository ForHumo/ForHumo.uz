// Sotuvchi reyting/sotilmagan ma'lumotlarini CSV eksport.
//
//   GET /api/bn/seller/analytics/export?type=topSold|topRevenue|lowSold|lowRevenue|unsold&from=&to=

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireBnAuth } from "@/lib/bn-auth";

export const dynamic = "force-dynamic";

type ExportType = "topSold" | "topRevenue" | "lowSold" | "lowRevenue" | "unsold" | "all";

function csvEsc(v: string | number | null | undefined): string {
    if (v === null || v === undefined) return "";
    const s = String(v);
    if (s.includes(",") || s.includes("\"") || s.includes("\n")) {
        return `"${s.replace(/"/g, "\"\"")}"`;
    }
    return s;
}

function parseDate(s: string | null, fallback: Date): Date {
    if (!s) return fallback;
    const d = new Date(s + "T00:00:00.000Z");
    return isNaN(d.getTime()) ? fallback : d;
}

export async function GET(req: Request) {
    const auth = await requireBnAuth();
    if (auth instanceof NextResponse) return auth;

    const shop = await prisma.bnShop.findFirst({
        where: { profileId: auth.profileId },
        select: { id: true, name: true, status: true },
    });
    if (!shop || shop.status !== "APPROVED") {
        return NextResponse.json({ error: "no_shop" }, { status: 404 });
    }

    const { searchParams } = new URL(req.url);
    const type = (searchParams.get("type") as ExportType) || "all";
    const now = new Date();
    const monthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
    const from = parseDate(searchParams.get("from"), monthStart);
    const to = parseDate(searchParams.get("to"), new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 23, 59, 59)));

    // Data yig'ish
    const items = await prisma.bnOrderItem.findMany({
        where: {
            order: { shopId: shop.id, status: "COMPLETED", completedAt: { gte: from, lte: to } },
        },
        select: { productId: true, title: true, price: true, qty: true },
    });
    interface Row { productId: string; title: string; soldQty: number; revenue: number; orders: number }
    const rowMap = new Map<string, Row>();
    for (const it of items) {
        const r = rowMap.get(it.productId) || { productId: it.productId, title: it.title, soldQty: 0, revenue: 0, orders: 0 };
        r.soldQty += it.qty; r.revenue += it.price * it.qty; r.orders += 1;
        rowMap.set(it.productId, r);
    }
    const sold = [...rowMap.values()];
    const soldIds = new Set(sold.map(r => r.productId));
    const unsold = await prisma.bnProduct.findMany({
        where: {
            shopId: shop.id, isActive: true, hidden: false,
            id: { notIn: [...soldIds].length > 0 ? [...soldIds] : ["_none_"] },
        },
        select: { title: true, price: true, stock: true, views: true, createdAt: true },
        take: 500,
        orderBy: { createdAt: "asc" },
    });

    // CSV yig'ish
    const bom = "﻿";
    let csv = bom;
    const filename = `bn-tahlil-${type}-${from.toISOString().slice(0, 10)}-${to.toISOString().slice(0, 10)}.csv`;

    if (type === "unsold") {
        csv += "Nomi,Narx (so'm),Zaxira,Ko'rishlar,Yaratilgan sana\n";
        for (const p of unsold) {
            csv += [csvEsc(p.title), csvEsc(p.price), csvEsc(p.stock), csvEsc(p.views), csvEsc(p.createdAt.toISOString().slice(0, 10))].join(",") + "\n";
        }
    } else if (type === "all") {
        csv += `Do'kon: ${shop.name}\nDavr: ${from.toISOString().slice(0, 10)} — ${to.toISOString().slice(0, 10)}\n\n`;
        csv += "═══ SOTILGAN MAHSULOTLAR ═══\nNomi,Sotilgan dona,Tushum (so'm),Buyurtma\n";
        for (const r of [...sold].sort((a, b) => b.revenue - a.revenue)) {
            csv += [csvEsc(r.title), csvEsc(r.soldQty), csvEsc(r.revenue), csvEsc(r.orders)].join(",") + "\n";
        }
        csv += `\n═══ UMUMAN SOTILMAGAN (${unsold.length}) ═══\nNomi,Narx,Zaxira,Ko'rishlar,Yaratilgan\n`;
        for (const p of unsold) {
            csv += [csvEsc(p.title), csvEsc(p.price), csvEsc(p.stock), csvEsc(p.views), csvEsc(p.createdAt.toISOString().slice(0, 10))].join(",") + "\n";
        }
    } else {
        const rows = type === "topSold" ? [...sold].sort((a, b) => b.soldQty - a.soldQty)
                   : type === "topRevenue" ? [...sold].sort((a, b) => b.revenue - a.revenue)
                   : type === "lowSold" ? [...sold].filter(r => r.soldQty > 0).sort((a, b) => a.soldQty - b.soldQty)
                   : [...sold].filter(r => r.revenue > 0).sort((a, b) => a.revenue - b.revenue);
        csv += "O'rin,Nomi,Sotilgan dona,Tushum (so'm),Buyurtma\n";
        rows.slice(0, 200).forEach((r, i) => {
            csv += [i + 1, csvEsc(r.title), csvEsc(r.soldQty), csvEsc(r.revenue), csvEsc(r.orders)].join(",") + "\n";
        });
    }

    return new NextResponse(csv, {
        headers: {
            "Content-Type": "text/csv; charset=utf-8",
            "Content-Disposition": `attachment; filename="${filename}"`,
            "Cache-Control": "no-store",
        },
    });
}
