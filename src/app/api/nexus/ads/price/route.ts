// Nexus reklama slot narx endpoint. BN AD bilan bir xil formula/kurs.
// GET /api/nexus/ads/price?days=1 → { grossUzsTotal, grossUsdTotal, usdUzsRate, ... }

import { NextResponse } from "next/server";
import { computeAdPrice } from "@/lib/bn-ad-pricing";

export const dynamic = "force-dynamic";
export const revalidate = 300;

export async function GET(req: Request) {
    const { searchParams } = new URL(req.url);
    const days = Math.max(1, Math.min(30, Math.floor(Number(searchParams.get("days") || "1"))));
    return NextResponse.json(await computeAdPrice(days));
}
