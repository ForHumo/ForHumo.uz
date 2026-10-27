// YukGo — native e'lon joylash (foydalanuvchi saytда o'z e'lonini to'g'ridan qo'yadi).
// Auth SHART (identity + rozilik + bog'lanish). Gemini chaqirilmaydi (strukturalangan).
// POST /api/yukgo/listings/native

import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { createNativeListing } from "@/lib/yukgo-ingest";

export const dynamic = "force-dynamic";

const MAX_PER_DAY = Number(process.env.YUKGO_NATIVE_PER_DAY || 10);
const TRUCK_TYPES = new Set(["tent", "ref", "open_top", "fura", "isuzu"]);
const CURRENCIES = new Set(["UZS", "USD", "RUB"]);

export async function POST(req: Request) {
    const session = await getServerSession(authOptions);
    const meId = (session?.user as { profileId?: string } | undefined)?.profileId;
    if (!meId) return NextResponse.json({ error: "auth_required" }, { status: 401 });

    const b = await req.json().catch(() => ({}));

    const type = b.type === "TRUCK" ? "TRUCK" : b.type === "CARGO" ? "CARGO" : null;
    if (!type) return NextResponse.json({ error: "type_required" }, { status: 400 });

    const phone = String(b.phone || "").replace(/[^\d+]/g, "");
    if (phone.replace(/\D/g, "").length < 7) return NextResponse.json({ error: "phone_required" }, { status: 400 });

    const fromCity = String(b.fromCity || "").trim().slice(0, 80);
    const toCity = String(b.toCity || "").trim().slice(0, 80);
    if (!fromCity && !toCity) return NextResponse.json({ error: "route_required" }, { status: 400 });

    // Kunlik limit — spam/abuse oldini olish
    const since = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const todayCount = await prisma.yukListing.count({ where: { postedById: meId, createdAt: { gt: since } } });
    if (todayCount >= MAX_PER_DAY) return NextResponse.json({ error: "daily_limit", limit: MAX_PER_DAY }, { status: 429 });

    const weightRaw = Number(b.weightTons);
    const weightTons = isFinite(weightRaw) && weightRaw > 0 && weightRaw < 1000 ? weightRaw : null;
    const priceRaw = Number(b.priceAmount);
    const priceAmount = isFinite(priceRaw) && priceRaw > 0 ? priceRaw : null;
    const priceCurrency = CURRENCIES.has(b.priceCurrency) ? b.priceCurrency : null;
    const truckTypes = Array.isArray(b.truckTypes) ? b.truckTypes.filter((x: unknown) => typeof x === "string" && TRUCK_TYPES.has(x)).slice(0, 5) : [];

    const { id } = await createNativeListing({
        type,
        fromCity: fromCity || null,
        toCity: toCity || null,
        cargo: String(b.cargo || "").trim().slice(0, 300) || null,
        weightTons,
        truckTypes,
        priceAmount,
        priceCurrency,
        priceNegotiable: !!b.priceNegotiable,
        phone,
    }, meId);

    return NextResponse.json({ ok: true, id });
}
