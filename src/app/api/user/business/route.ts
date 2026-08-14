// Mening business profilim — CRUD.
//   GET    /api/user/business       → { business: {...} | null }
//   POST   /api/user/business       Body: { category, subcategory?, address?, lat?, lng?, phone?, email?, website?, hours? }
//   PATCH  /api/user/business       (bir xil body — mavjud maydonlarni yangilaydi)
//   DELETE /api/user/business       → business statusini olib tashlash
//
// Validatsiya:
//   - category 2..60 belgi
//   - phone/email/website — ixtiyoriy, oddiy tekshiruv
//   - hours normalizeHours() orqali

import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { normalizeHours } from "@/lib/business-hours";

const CATEGORY_MIN = 2;
const CATEGORY_MAX = 60;

function coerce(body: Record<string, unknown>): Record<string, unknown> {
    const out: Record<string, unknown> = {};
    if (typeof body.category === "string") {
        const c = body.category.trim();
        if (c.length < CATEGORY_MIN || c.length > CATEGORY_MAX) throw new Error(`Kategoriya ${CATEGORY_MIN}-${CATEGORY_MAX} belgi bo'lsin`);
        out.category = c;
    }
    if (body.subcategory !== undefined) out.subcategory = typeof body.subcategory === "string" ? body.subcategory.trim().slice(0, 60) || null : null;
    if (body.address !== undefined)    out.address    = typeof body.address    === "string" ? body.address.trim().slice(0, 300) || null : null;
    if (body.phone !== undefined)      out.phone      = typeof body.phone      === "string" ? body.phone.trim().slice(0, 40)  || null : null;
    if (body.email !== undefined)      out.email      = typeof body.email      === "string" ? body.email.trim().slice(0, 120) || null : null;
    if (body.website !== undefined) {
        const w = typeof body.website === "string" ? body.website.trim() : "";
        if (w && !/^https?:\/\//.test(w)) throw new Error("Website http:// yoki https:// bilan boshlansin");
        out.website = w.slice(0, 200) || null;
    }
    if (body.lat !== undefined) {
        const v = typeof body.lat === "number" ? body.lat : parseFloat(String(body.lat));
        out.lat = Number.isFinite(v) && v >= -90 && v <= 90 ? v : null;
    }
    if (body.lng !== undefined) {
        const v = typeof body.lng === "number" ? body.lng : parseFloat(String(body.lng));
        out.lng = Number.isFinite(v) && v >= -180 && v <= 180 ? v : null;
    }
    if (body.hours !== undefined) out.hours = normalizeHours(body.hours);
    return out;
}

export async function GET() {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const me = await prisma.userProfile.findUnique({
        where: { email: session.user.email }, select: { id: true },
    });
    if (!me) return NextResponse.json({ error: "Profil topilmadi" }, { status: 404 });
    const business = await prisma.businessProfile.findUnique({ where: { profileId: me.id } });
    return NextResponse.json({ business });
}

export async function POST(req: Request) {
    return upsert(req);
}

export async function PATCH(req: Request) {
    return upsert(req);
}

async function upsert(req: Request) {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const me = await prisma.userProfile.findUnique({
        where: { email: session.user.email }, select: { id: true },
    });
    if (!me) return NextResponse.json({ error: "Profil topilmadi" }, { status: 404 });

    const body = await req.json().catch(() => ({}));
    let data: Record<string, unknown>;
    try { data = coerce(body); }
    catch (e) { return NextResponse.json({ error: (e as Error).message }, { status: 400 }); }

    // Yaratishda kategoriya majburiy
    const existing = await prisma.businessProfile.findUnique({ where: { profileId: me.id }, select: { id: true } });
    if (!existing && !data.category) return NextResponse.json({ error: "Kategoriya majburiy" }, { status: 400 });

    const business = await prisma.businessProfile.upsert({
        where: { profileId: me.id },
        create: {
            profileId:   me.id,
            category:    (data.category as string) ?? "Boshqa",
            subcategory: (data.subcategory as string | null) ?? null,
            address:     (data.address as string | null) ?? null,
            lat:         (data.lat as number | null) ?? null,
            lng:         (data.lng as number | null) ?? null,
            phone:       (data.phone as string | null) ?? null,
            email:       (data.email as string | null) ?? null,
            website:     (data.website as string | null) ?? null,
            hours:       (data.hours as unknown) ?? [],
        },
        update: data,
    });

    return NextResponse.json({ business });
}

export async function DELETE() {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const me = await prisma.userProfile.findUnique({
        where: { email: session.user.email }, select: { id: true },
    });
    if (!me) return NextResponse.json({ error: "Profil topilmadi" }, { status: 404 });
    await prisma.businessProfile.deleteMany({ where: { profileId: me.id } });
    return NextResponse.json({ ok: true });
}
