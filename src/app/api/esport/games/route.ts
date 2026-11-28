import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// GET /api/esport/games — ommaviy faol o'yinlar ro'yxati (mobil ilova standings
// pickeri uchun). Auth talab qilmaydi (faqat o'yin nomlari).
export async function GET() {
    const games = await prisma.esGame.findMany({
        where: { active: true },
        orderBy: { name: "asc" },
        select: { id: true, slug: true, name: true },
    });
    return NextResponse.json({ games });
}
