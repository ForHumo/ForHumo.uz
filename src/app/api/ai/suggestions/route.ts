// Ummi takliflari — in-app yuza uchun joriy faol taklif.
// GET /api/ai/suggestions → { suggestion: {id,kind,title,body,url} | null }
// Kirmagan / toggle o'chiq / taklif yo'q → { suggestion: null } (401 emas — yuza jim yashirinadi).

import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getActiveSuggestion } from "@/lib/ummi-suggestions";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) return NextResponse.json({ suggestion: null });

    const me = await prisma.userProfile.findUnique({
        where: { email: session.user.email }, select: { id: true },
    });
    if (!me) return NextResponse.json({ suggestion: null });

    const s = await getActiveSuggestion(me.id);
    if (!s) return NextResponse.json({ suggestion: null });

    // Tilga mos "label" — slug o'rniga kategoriya nomi (uz/ru). Faqat bn kind'да.
    const locale = new URL(req.url).searchParams.get("locale") || "uz";
    let label: string | undefined;
    if (s.kind === "bn") {
        const m = s.url.match(/[?&]category=([^&]+)/);
        const slug = m ? decodeURIComponent(m[1]) : "";
        if (slug) {
            const cat = await prisma.bnCategory.findUnique({
                where: { slug }, select: { name: true, nameRu: true },
            });
            if (cat) label = locale === "ru" ? (cat.nameRu || cat.name) : cat.name;
        }
    }

    return NextResponse.json({
        suggestion: { id: s.id, kind: s.kind, title: s.title, body: s.body, url: s.url, ...(label ? { label } : {}) },
    });
}
