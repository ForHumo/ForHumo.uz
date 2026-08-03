import { NextResponse } from "next/server";
import { requireFounder } from "@/lib/admin-guard";
import { prisma } from "@/lib/prisma";
import { invalidateReservedCache } from "@/lib/reserved-username";

// Founder-only zaxira usernamelar boshqaruvi.

// GET /api/admin/reserved-usernames?category=&q=&page=
export async function GET(req: Request) {
    const founder = await requireFounder();
    if (!founder) return NextResponse.json({ error: "Ruxsat yo'q" }, { status: 403 });

    const { searchParams } = new URL(req.url);
    const category = searchParams.get("category") || undefined;
    const q = searchParams.get("q")?.trim().toLowerCase() || "";
    const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
    const take = 50;

    const where: Record<string, unknown> = {};
    if (category) where.category = category;
    if (q) where.username = { contains: q };

    const [rows, total, counts] = await Promise.all([
        prisma.reservedUsername.findMany({
            where, orderBy: { username: "asc" }, take, skip: (page - 1) * take,
        }),
        prisma.reservedUsername.count({ where }),
        prisma.reservedUsername.groupBy({ by: ["category"], _count: true }),
    ]);

    return NextResponse.json({
        items: rows, total, page, pageSize: take,
        counts: Object.fromEntries(counts.map(c => [c.category, c._count])),
    });
}

// POST /api/admin/reserved-usernames  — yangi qo'shish (bir nechta bo'lishi mumkin)
// body: { usernames: string[] | string, category, note?, priceUzs?, assignedToId? }
export async function POST(req: Request) {
    const founder = await requireFounder();
    if (!founder) return NextResponse.json({ error: "Ruxsat yo'q" }, { status: 403 });

    const body = await req.json() as {
        usernames?: string[] | string;
        category?: string;
        note?: string | null;
        priceUzs?: number | null;
        assignedToId?: string | null;
    };
    const cats = new Set(["SYSTEM", "VIP", "CELEBRITY", "BRAND", "COUNTRY", "GOVERNMENT", "PERSONAL"]);
    if (!body.category || !cats.has(body.category)) {
        return NextResponse.json({ error: "Toifa noto'g'ri" }, { status: 400 });
    }
    const list = Array.isArray(body.usernames)
        ? body.usernames
        : String(body.usernames || "").split(/[\s,;]+/);
    const cleanList = [...new Set(list
        .map(u => String(u).trim().replace(/^@/, "").toLowerCase().replace(/[^a-z0-9_]/g, ""))
        .filter(u => u.length >= 2 && u.length <= 30))];
    if (cleanList.length === 0) return NextResponse.json({ error: "Bo'sh ro'yxat" }, { status: 400 });

    let added = 0, skipped = 0;
    for (const username of cleanList) {
        try {
            await prisma.reservedUsername.create({
                data: {
                    username,
                    category: body.category as never,
                    note: body.note || null,
                    priceUzs: typeof body.priceUzs === "number" ? Math.max(0, Math.floor(body.priceUzs)) : null,
                    assignedToId: body.assignedToId || null,
                    reservedById: founder.id,
                },
            });
            added++;
        } catch { skipped++; /* allaqachon bor */ }
    }
    invalidateReservedCache();
    return NextResponse.json({ ok: true, added, skipped, total: cleanList.length });
}

// PATCH /api/admin/reserved-usernames — yangilash
// body: { id, category?, note?, priceUzs?, assignedToId? }
export async function PATCH(req: Request) {
    const founder = await requireFounder();
    if (!founder) return NextResponse.json({ error: "Ruxsat yo'q" }, { status: 403 });

    const body = await req.json() as {
        id?: string; category?: string; note?: string | null;
        priceUzs?: number | null; assignedToId?: string | null;
    };
    if (!body.id) return NextResponse.json({ error: "id kerak" }, { status: 400 });

    const data: Record<string, unknown> = {};
    if (body.category) {
        const cats = new Set(["SYSTEM", "VIP", "CELEBRITY", "BRAND", "COUNTRY", "GOVERNMENT", "PERSONAL"]);
        if (!cats.has(body.category)) return NextResponse.json({ error: "Toifa noto'g'ri" }, { status: 400 });
        data.category = body.category;
    }
    if (body.note !== undefined) data.note = body.note || null;
    if (body.priceUzs !== undefined) data.priceUzs = body.priceUzs === null ? null : Math.max(0, Math.floor(body.priceUzs));
    if (body.assignedToId !== undefined) data.assignedToId = body.assignedToId || null;

    await prisma.reservedUsername.update({ where: { id: body.id }, data });
    invalidateReservedCache();
    return NextResponse.json({ ok: true });
}

// DELETE /api/admin/reserved-usernames?id=xxx
export async function DELETE(req: Request) {
    const founder = await requireFounder();
    if (!founder) return NextResponse.json({ error: "Ruxsat yo'q" }, { status: 403 });

    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    if (!id) return NextResponse.json({ error: "id kerak" }, { status: 400 });

    await prisma.reservedUsername.delete({ where: { id } });
    invalidateReservedCache();
    return NextResponse.json({ ok: true });
}
