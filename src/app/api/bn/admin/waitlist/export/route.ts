// BN admin — sotuvchi WAITLIST'ni CSV eksport qilish (Excel ochadi).
// Jalol qo'ng'iroq qilishi uchun offline qatnov ro'yxatini ola oladi.
//
// GET /api/bn/admin/waitlist/export?status=PENDING
// Faylnomi: bn-waitlist-<status|all>-YYYY-MM-DD.csv
// Kodlash: UTF-8 BOM bilan (Excel kirill/lotin harflarni to'g'ri ochsin).

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireBnAuth } from "@/lib/bn-auth";
import type { BnSellerWaitlistStatus } from "@prisma/client";

export const dynamic = "force-dynamic";

async function requireBnAdmin(profileId: string): Promise<boolean> {
    const a = await prisma.bnAdmin.findUnique({
        where: { profileId }, select: { role: true },
    });
    return a?.role === "OWNER" || a?.role === "MODERATOR";
}

/** RFC 4180: qo'shtirnoq/vergul/yangi qator bo'lsa "..." bilan o'raymiz va "" ni ""-lash. */
function csvCell(v: string | number | null | undefined): string {
    if (v === null || v === undefined) return "";
    const s = String(v);
    if (/[",\r\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
    return s;
}

function csvRow(cells: (string | number | null | undefined)[]): string {
    return cells.map(csvCell).join(",");
}

export async function GET(req: Request) {
    const auth = await requireBnAuth();
    if (auth instanceof NextResponse) return auth;
    if (!(await requireBnAdmin(auth.profileId))) {
        return NextResponse.json({ error: "forbidden" }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const status = searchParams.get("status") as BnSellerWaitlistStatus | null;

    const entries = await prisma.bnSellerWaitlist.findMany({
        where: status ? { status } : {},
        orderBy: { createdAt: "desc" },
        take: 5000,   // himoya (real hajm hech qachon bunchalik bo'lmaydi)
    });

    // Bozor nomi + kontakt qilgan admin — bir marta lookup
    const marketSlugs = [...new Set(entries.map(e => e.marketSlug).filter(Boolean) as string[])];
    const contactedIds = [...new Set(entries.map(e => e.contactedById).filter(Boolean) as string[])];

    const [markets, profs] = await Promise.all([
        marketSlugs.length ? prisma.bnMarket.findMany({
            where: { slug: { in: marketSlugs } },
            select: { slug: true, name: true },
        }) : Promise.resolve([]),
        contactedIds.length ? prisma.userProfile.findMany({
            where: { id: { in: contactedIds } },
            select: { id: true, name: true, username: true },
        }) : Promise.resolve([]),
    ]);
    const marketByName = new Map(markets.map(m => [m.slug, m.name]));
    const profById = new Map(profs.map(p => [p.id, p.username || p.name || p.id]));

    // CSV — sarlavha + qatorlar
    const header = [
        "id", "createdAt", "status",
        "name", "phone", "city",
        "marketSlug", "marketName", "category",
        "note", "source", "ref",
        "contactedAt", "contactedBy", "contactNote",
        "convertedShopId",
    ];

    const rows: string[] = [csvRow(header)];
    for (const e of entries) {
        rows.push(csvRow([
            e.id,
            e.createdAt.toISOString(),
            e.status,
            e.name,
            e.phone,
            e.city,
            e.marketSlug,
            e.marketSlug ? marketByName.get(e.marketSlug) ?? "" : "",
            e.category,
            e.note,
            e.source,
            e.ref,
            e.contactedAt?.toISOString() ?? "",
            e.contactedById ? profById.get(e.contactedById) ?? e.contactedById : "",
            e.contactNote,
            e.convertedShopId,
        ]));
    }

    // Excel UTF-8 sezgir emas — BOM ("﻿") bilan boshlaymiz
    const body = "﻿" + rows.join("\r\n") + "\r\n";

    const today = new Date().toISOString().slice(0, 10);
    const filename = `bn-waitlist-${(status ?? "all").toLowerCase()}-${today}.csv`;

    return new NextResponse(body, {
        status: 200,
        headers: {
            "Content-Type": "text/csv; charset=utf-8",
            "Content-Disposition": `attachment; filename="${filename}"`,
            "Cache-Control": "no-store",
        },
    });
}
