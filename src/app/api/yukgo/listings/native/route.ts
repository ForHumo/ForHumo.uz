// YukGo — native e'lon joylash (foydalanuvchi saytда o'z e'lonini to'g'ridan qo'yadi).
// Auth SHART (identity + rozilik + bog'lanish). Gemini chaqirilmaydi (strukturalangan).
// POST /api/yukgo/listings/native

import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";
import { createNativeListing, notifyNativeCargo } from "@/lib/yukgo-ingest";

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

    const weightRaw = Number(b.weightTons);
    const weightTons = isFinite(weightRaw) && weightRaw > 0 && weightRaw < 1000 ? weightRaw : null;
    const priceRaw = Number(b.priceAmount);
    const priceAmount = isFinite(priceRaw) && priceRaw > 0 ? priceRaw : null;
    const priceCurrency = CURRENCIES.has(b.priceCurrency) ? b.priceCurrency : null;
    const truckTypes = Array.isArray(b.truckTypes) ? b.truckTypes.filter((x: unknown) => typeof x === "string" && TRUCK_TYPES.has(x)).slice(0, 5) : [];

    const input = {
        type: type as "CARGO" | "TRUCK",
        fromCity: fromCity || null,
        toCity: toCity || null,
        cargo: String(b.cargo || "").trim().slice(0, 300) || null,
        weightTons,
        truckTypes,
        priceAmount,
        priceCurrency,
        priceNegotiable: !!b.priceNegotiable,
        phone,
    };

    // Kunlik limit — count+create ATOMIK (Serializable): bir vaqtда ko'p POST limitni
    // chetlab o'tolmaydi (ilgari count->create orasida race bor edi).
    const since = new Date(Date.now() - 24 * 60 * 60 * 1000);
    let listingId: string;
    try {
        const created = await prisma.$transaction(async (tx) => {
            const todayCount = await tx.yukListing.count({ where: { postedById: meId, createdAt: { gt: since } } });
            if (todayCount >= MAX_PER_DAY) return null;
            return await createNativeListing(input, meId, { db: tx, skipNotify: true });
        }, { isolationLevel: "Serializable" });
        if (!created) return NextResponse.json({ error: "daily_limit", limit: MAX_PER_DAY }, { status: 429 });
        listingId = created.id;
    } catch (e) {
        // Serializable konflikt (parallel POST) — kunlik limitga urinish deb hisoblaymiz
        if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2034") {
            return NextResponse.json({ error: "daily_limit", limit: MAX_PER_DAY }, { status: 429 });
        }
        throw e;
    }

    // Push — tranzaksiyadan TASHQARIDA (tarmoq side-effect tx'ni ushlab turmasin)
    if (type === "CARGO") await notifyNativeCargo(input);

    return NextResponse.json({ ok: true, id: listingId });
}
