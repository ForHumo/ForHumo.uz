// BN Reklama banner narx endpoint. Live USD/UZS kursi + soliq stavkasi bilan.
// GET /api/bn/ads/price?days=1 → { grossUzsTotal, grossUsdTotal, usdUzsRate, ... }

import { NextResponse } from "next/server";
import { computeAdPrice } from "@/lib/bn-ad-pricing";

export const dynamic = "force-dynamic";
export const revalidate = 300; // 5 daq

export async function GET(req: Request) {
    const { searchParams } = new URL(req.url);
    const days = Math.max(1, Math.min(30, Math.floor(Number(searchParams.get("days") || "1"))));
    const price = await computeAdPrice(days);
    return NextResponse.json(price);
}
