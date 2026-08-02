import { NextResponse } from "next/server";
import { getDeliveryQuote } from "@/lib/delivery";

// GET /api/market/delivery-quote?address=...&subtotal=...
// Ommaviy: xaridor manzilni kiritganda yetkazib berish narxi darrov ko'rinsin.
export async function GET(req: Request) {
    const url = new URL(req.url);
    const address = url.searchParams.get("address") ?? "";
    const subtotal = Number(url.searchParams.get("subtotal") ?? 0);
    if (!address.trim()) return NextResponse.json({ error: "Manzil kiritilmadi" }, { status: 400 });
    const q = await getDeliveryQuote(address, subtotal);
    return NextResponse.json(q);
}
