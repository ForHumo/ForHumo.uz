import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { generateHumoId } from "@/lib/humo-id";

// POST /api/user/generate-humo-id
// Davlat-prefiks FAQAT IP geolokatsiyasidan (foydalanuvchi o'zgartira olmaydi).
export async function POST() {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    let country = "UZ";
    try {
        const h = await headers();
        country = (h.get("x-vercel-ip-country") || "UZ").toUpperCase();
    } catch { /* fallback UZ */ }

    const humoId = await generateHumoId(country);
    if (!humoId) return NextResponse.json({ error: "Could not generate unique ID" }, { status: 500 });
    return NextResponse.json({ humoId });
}
