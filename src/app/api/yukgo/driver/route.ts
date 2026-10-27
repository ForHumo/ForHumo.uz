// YukGo — haydovchi profili (GET o'zimniki / PUT saqlash). Login SHART.
// Mos e'lon push'i uchun yo'nalish afzalligi shu yerda.

import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

async function meId(): Promise<string | null> {
    const session = await getServerSession(authOptions);
    return (session?.user as { profileId?: string } | undefined)?.profileId ?? null;
}

export async function GET() {
    const id = await meId();
    if (!id) return NextResponse.json({ error: "auth_required" }, { status: 401 });
    const driver = await prisma.yukDriver.findUnique({ where: { profileId: id } });
    return NextResponse.json({ driver });
}

export async function PUT(req: Request) {
    const id = await meId();
    if (!id) return NextResponse.json({ error: "auth_required" }, { status: 401 });
    const b = await req.json().catch(() => ({}));

    const vehicleType = typeof b.vehicleType === "string" ? b.vehicleType.slice(0, 30) || null : null;
    const capacityTons = typeof b.capacityTons === "number" && isFinite(b.capacityTons) ? Math.max(0, Math.min(200, b.capacityTons)) : null;
    const routeFromCity = typeof b.routeFromCity === "string" ? b.routeFromCity.trim().slice(0, 60) || null : null;
    const routeToCity = typeof b.routeToCity === "string" ? b.routeToCity.trim().slice(0, 60) || null : null;
    const phone = typeof b.phone === "string" ? b.phone.replace(/[^\d+]/g, "").slice(0, 20) || null : null;
    const notifyOnMatch = b.notifyOnMatch !== false;
    const lang = b.lang === "ru" || b.lang === "en" || b.lang === "uz" ? b.lang : undefined;  // push tili

    const data = { vehicleType, capacityTons, routeFromCity, routeToCity, phone, notifyOnMatch, ...(lang ? { lang } : {}) };
    const driver = await prisma.yukDriver.upsert({
        where: { profileId: id },
        update: data,
        create: { profileId: id, ...data },
    });
    return NextResponse.json({ driver });
}
