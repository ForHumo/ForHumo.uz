// Client uchun: joriy foydalanuvchining staff huquqi.
// Aynan navbar Admin havolasini shartli ko'rsatish uchun.

import { NextResponse } from "next/server";
import { getMarketStaff } from "@/lib/market-staff";

export async function GET() {
    const staff = await getMarketStaff();
    if (!staff) return NextResponse.json({ isOwner: false, isWorker: false });
    return NextResponse.json({ isOwner: staff.isOwner, isWorker: staff.isWorker });
}
