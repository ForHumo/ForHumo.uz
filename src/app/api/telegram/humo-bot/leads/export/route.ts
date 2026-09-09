// Leads CSV eksport (RFC 4180 + UTF-8 BOM Excel uchun).
//   GET /api/telegram/humo-bot/leads/export?status=OPEN → CSV

import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const MAX_ROWS = 5000;

export async function GET(req: Request) {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

    const profile = await prisma.userProfile.findUnique({
        where: { email: session.user.email },
        select: { id: true },
    });
    if (!profile) return NextResponse.json({ error: "profile_not_found" }, { status: 404 });

    const url = new URL(req.url);
    const status = url.searchParams.get("status");
    const where: { profileId: string; status?: string } = { profileId: profile.id };
    if (status && ["OPEN", "CONTACTED", "WON", "LOST"].includes(status)) where.status = status;

    const leads = await prisma.humoBotLead.findMany({
        where,
        orderBy: { createdAt: "desc" },
        take: MAX_ROWS,
    });

    const headers = [
        "created_at", "status", "product", "customer_name", "customer_phone", "customer_address",
        "customer_telegram", "customer_tg_id", "won_amount_uzs", "owner_note", "contacted_at", "id",
    ];
    const rows = leads.map(l => [
        l.createdAt.toISOString(),
        l.status,
        l.productMention ?? "",
        l.customerName ?? "",
        l.customerPhone ?? "",
        l.customerAddress ?? "",
        l.customerTgUsername ? `@${l.customerTgUsername}` : "",
        l.customerTgId ?? "",
        l.wonAmountUzs?.toString() ?? "",
        l.ownerNote ?? "",
        l.contactedAt ? l.contactedAt.toISOString() : "",
        l.id,
    ]);

    // RFC 4180 escape: qo'shtirnoq, vergul, yangi qatorlar bo'lsa "qo'shtirnoq" bilan o'raladi
    const escape = (v: string) => {
        if (/[",\n\r]/.test(v)) {
            return `"${v.replace(/"/g, '""')}"`;
        }
        return v;
    };

    const csv = [
        headers.map(escape).join(","),
        ...rows.map(r => r.map(escape).join(",")),
    ].join("\r\n");

    // UTF-8 BOM
    const bom = "﻿";
    const body = bom + csv;

    const today = new Date().toISOString().slice(0, 10);
    const filename = `humo-bot-leads-${status ?? "all"}-${today}.csv`;

    return new Response(body, {
        headers: {
            "Content-Type": "text/csv; charset=utf-8",
            "Content-Disposition": `attachment; filename="${filename}"`,
        },
    });
}
