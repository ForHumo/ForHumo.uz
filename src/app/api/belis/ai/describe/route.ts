// Belis AI — komplekt/quti uchun tavsif generatsiya.
// Admin only (@sevinch + founder). Gemini orqali.
//
// POST /api/belis/ai/describe
//   body: {
//     type: "komplekt" | "item",
//     name: string,
//     kind?: string,          // FOTIHA / BESHIK_TOY / TOGORA / SANDIQ va h.k.
//     itemsCount?: number,    // faqat komplekt
//   }
// Javob: { uz: string, ru: string }

import { NextResponse } from "next/server";
import { requireBelisAdmin } from "@/lib/belis-auth";
import { aiJSON, aiAvailable } from "@/lib/ai";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

interface Describe { uz: string; ru: string }

export async function POST(req: Request) {
    const auth = await requireBelisAdmin();
    if (auth instanceof NextResponse) return auth;

    if (!aiAvailable()) {
        return NextResponse.json({ error: "ai_unavailable" }, { status: 503 });
    }

    const body = await req.json().catch(() => ({}));
    const type = String(body?.type ?? "").toLowerCase();
    const name = String(body?.name ?? "").trim().slice(0, 200);
    const kind = String(body?.kind ?? "").trim().slice(0, 50);
    const itemsCount = Number(body?.itemsCount) || 0;

    if (!name) return NextResponse.json({ error: "name_required" }, { status: 400 });
    if (type !== "komplekt" && type !== "item") {
        return NextResponse.json({ error: "invalid_type" }, { status: 400 });
    }

    const prompt = type === "komplekt"
        ? `Sen "Belis" nomli sarpo qutilarini IJARAGA beruvchi studiya uchun tavsif yozasan.
Bu Fotiha va Beshik to'y marosimlariga qutilar to'plami. Sotib olinmaydi — ijaraga olinadi.

Komplekt ma'lumoti:
- Nomi: ${name}
- Turi: ${kind || "FOTIHA"}
- Ichidagi qutilar soni: ${itemsCount || 14}

Vazifa: 2-3 gap tavsif yoz. Marosim uchun mos, oddiy va aniq.
Kim uchun mos, nima uchun yaxshi, qanday sifatda ekanini qisqa ayt.
Hech qanday reklama so'z ("eng zo'r", "ajoyib") ishlatma — halol.
Uzbek va rus tillarida qaytar.

JSON qaytar: { "uz": "...", "ru": "..." }`
        : `Sen "Belis" nomli sarpo qutilarini IJARAGA beruvchi studiya uchun tavsif yozasan.

Quti ma'lumoti:
- Nomi: ${name}
- Turi: ${kind || "BOSHQA"}

Vazifa: 1-2 gap qisqa tavsif yoz. Ishlatilishi va dizayni haqida.
Reklama so'z ishlatma. Uzbek va rus tillarida qaytar.

JSON qaytar: { "uz": "...", "ru": "..." }`;

    const result = await aiJSON<Describe>(prompt, { temperature: 0.7 });
    if (!result || !result.uz) {
        return NextResponse.json({ error: "ai_failed" }, { status: 502 });
    }

    return NextResponse.json({
        uz: result.uz.trim().slice(0, 2000),
        ru: (result.ru ?? "").trim().slice(0, 2000),
    });
}
