// POST /api/nexus/geo/ai — foydalanuvchi ishorasini Gemini bilan 3 aniq joy variantiga aylantiradi
// body: { hint: string } → { candidates: string[] }  (har biri Nominatim'ga o'tkaziladi)
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { aiJSON, aiAvailable } from "@/lib/ai";

export async function POST(req: Request) {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) return NextResponse.json({ candidates: [] }, { status: 401 });
    if (!aiAvailable()) return NextResponse.json({ candidates: [] });

    const body = await req.json().catch(() => ({}));
    const hint = typeof body?.hint === "string" ? body.hint.trim().slice(0, 200) : "";
    if (!hint) return NextResponse.json({ candidates: [] });

    const sys = "Sen O'zbekiston joylashuv assistant'sen. Foydalanuvchi bergan qisqa ishoraga qarab, " +
                "OpenStreetMap Nominatim'da qidirish uchun 3 aniq to'liq nom variantini JSON qaytar. " +
                "Har bir variant \"joyning nomi, tuman, shahar\" formatida bo'lsin. Faqat O'zbekiston. " +
                "Agar aniq nom bo'lsa (masalan 'Chorsu bozori') — birinchi variant to'liq shu, boshqalari alternativalar. " +
                "Javob shaklda: { \"candidates\": [\"...\", \"...\", \"...\"] }";
    try {
        const d = await aiJSON<{ candidates?: string[] }>(hint, { system: sys, temperature: 0.4 });
        const arr = Array.isArray(d?.candidates) ? d.candidates.filter(x => typeof x === "string").slice(0, 3) : [];
        return NextResponse.json({ candidates: arr });
    } catch {
        return NextResponse.json({ candidates: [] });
    }
}
