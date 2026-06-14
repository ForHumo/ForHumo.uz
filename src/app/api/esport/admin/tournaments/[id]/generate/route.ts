import { NextResponse } from "next/server";
import { getEsportAdmin } from "@/lib/esport";
import { generateBracket } from "@/lib/esport-bracket";

// POST /api/esport/admin/tournaments/[id]/generate — Elo seeding bilan setka tuzadi
export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
    if (!await getEsportAdmin()) return NextResponse.json({ error: "Ruxsat yo'q" }, { status: 403 });
    const { id } = await params;
    const r = await generateBracket(id);
    if (!r.ok) return NextResponse.json({ error: r.error }, { status: 400 });
    return NextResponse.json({ ok: true });
}
