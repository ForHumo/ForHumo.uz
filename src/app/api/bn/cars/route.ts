// GET /api/bn/cars — mashina katalogi (marka + model).
// Ochiq, cache'langan (1 soat). Sotuvchi moslik tanlagichi + xaridor garaj uchun.

import { NextResponse } from "next/server";
import { getCarCatalog } from "@/lib/bn-cars";

export async function GET() {
    try {
        const makes = await getCarCatalog();
        return NextResponse.json({ makes }, {
            headers: { "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=86400" },
        });
    } catch {
        return NextResponse.json({ makes: [] }, { status: 200 });
    }
}
