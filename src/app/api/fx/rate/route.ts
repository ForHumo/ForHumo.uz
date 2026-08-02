// GET /api/fx/rate — hozirgi USD/UZS kursi (30 daq cache, CBU manba).
import { NextResponse } from "next/server";
import { getUsdUzsRate } from "@/lib/fx";

export async function GET() {
    const fx = await getUsdUzsRate();
    return NextResponse.json({
        rate: fx.rate,
        updatedAt: fx.updatedAt,
        source: fx.source,
    }, {
        headers: {
            // Client 5 daq'gacha eski javobni ishlata oladi (server 30 daq cache'ida)
            "Cache-Control": "public, max-age=300, stale-while-revalidate=1800",
        },
    });
}
