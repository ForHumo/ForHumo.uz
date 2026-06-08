import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { aiAvailable, aiVisionJSON } from "@/lib/ai";

// POST /api/ai/listing — mahsulot uchun AI tavsif (rasm + nom dan)
export async function POST(req: Request) {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    if (!aiAvailable())
        return NextResponse.json({ error: "AI hali sozlanmagan (GEMINI_API_KEY kerak)", code: "AI_NO_KEY" }, { status: 503 });

    const { name, category, imageUrl, brief } = await req.json();
    if (!name?.trim() && !imageUrl)
        return NextResponse.json({ error: "Mahsulot nomi yoki rasmi kerak" }, { status: 400 });

    const prompt = `Sen O'zbekistondagi "Humo Market" onlayn-do'kon uchun mahsulot tavsifi yozuvchi yordamchisan.
Quyidagi mahsulot uchun JOZIBALI, sotuvni oshiradigan tavsif yoz.

Mahsulot nomi: ${name?.trim() || "(rasmga qarab aniqla)"}
Kategoriya: ${category || "(noma'lum)"}
Qo'shimcha: ${brief?.trim() || "yo'q"}
${imageUrl ? "Rasm berilgan — unga qarab xususiyatlarni aniqla." : ""}

Qoidalar:
- TILI: O'zbek tili (lotin).
- Tavsif: 2-4 qisqa jumla, real, ortiqcha va'dasiz.
- EMOJI ISHLATMA.
- "suggestedName": nomni yaxshilab, qisqa va tushunarli variant (agar nom yaxshi bo'lsa, o'zini qaytar).

Faqat JSON qaytar:
{"description": "...", "suggestedName": "..."}`;

    try {
        const result = await aiVisionJSON<{ description?: string; suggestedName?: string }>(
            prompt, typeof imageUrl === "string" ? imageUrl : null, { temperature: 0.8 }
        );
        if (!result?.description) return NextResponse.json({ error: "AI javob bermadi, qayta urinib ko'ring" }, { status: 502 });
        return NextResponse.json({
            description: result.description.trim(),
            suggestedName: result.suggestedName?.trim() || null,
        });
    } catch (e) {
        return NextResponse.json({ error: "AI xatosi: " + (e as Error).message.slice(0, 120) }, { status: 502 });
    }
}
