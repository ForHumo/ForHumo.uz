// BN boykot brendlar — GET public (foydalanuvchilar ro'yxatni ko'radi),
// POST/PATCH/DELETE faqat OWNER.

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireBnAuth } from "@/lib/bn-auth";
import { isBnOwner } from "@/lib/bn-admin";

export async function GET() {
    const brands = await prisma.bnBoycottBrand.findMany({
        orderBy: [{ addedAt: "desc" }],
    });
    return NextResponse.json({ brands });
}

export async function POST(req: Request) {
    const auth = await requireBnAuth();
    if (auth instanceof NextResponse) return auth;
    if (!(await isBnOwner(auth.profileId))) {
        return NextResponse.json({ error: "owner_only" }, { status: 403 });
    }

    const body = await req.json().catch(() => ({}));
    const name = String(body?.name ?? "").trim();
    const reason = String(body?.reason ?? "").trim();
    if (name.length < 2) return NextResponse.json({ error: "name_short" }, { status: 400 });
    if (reason.length < 5) return NextResponse.json({ error: "reason_short" }, { status: 400 });

    const aliases = Array.isArray(body?.aliases)
        ? body.aliases.map((s: unknown) => String(s).trim().toLowerCase()).filter(Boolean).slice(0, 20)
        : [];
    const categories = Array.isArray(body?.categories)
        ? body.categories.map((s: unknown) => String(s).trim().toLowerCase()).filter(Boolean).slice(0, 10)
        : [];
    const detail = typeof body?.detail === "string" ? body.detail.slice(0, 2000) : null;

    try {
        const created = await prisma.bnBoycottBrand.create({
            data: {
                name, aliases, reason, detail, categories,
                addedById: auth.profileId,
            },
        });
        return NextResponse.json({ ok: true, brand: created });
    } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : String(e);
        if (msg.includes("Unique")) {
            return NextResponse.json({ error: "duplicate" }, { status: 409 });
        }
        return NextResponse.json({ error: "create_failed" }, { status: 500 });
    }
}
