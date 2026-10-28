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

    // Tilga mos shablon parametrlari (uz/ru/en) — komponent shular bilan render qiladi.
    const locale = new URL(req.url).searchParams.get("locale") || "uz";
    const params: Record<string, string> = {};
    if (s.kind === "nexus") {
        const m = s.url.match(/\/nexus\/u\/([^/?#]+)/);
        if (m) params.author = decodeURIComponent(m[1]);
    } else if (s.kind === "bn") {
        const m = s.url.match(/[?&]category=([^&]+)/);
        const slug = m ? decodeURIComponent(m[1]) : "";
        if (slug) {
            const cat = await prisma.bnCategory.findUnique({ where: { slug }, select: { name: true, nameRu: true } });
            params.category = cat ? (locale === "ru" ? (cat.nameRu || cat.name) : cat.name) : slug;
        }
    } else if (s.kind === "cart") {
        const n = await prisma.bnCartItem.count({ where: { profileId: me.id } });
        params.count = String(n || 1);
    } else if (s.kind === "pricedrop") {
        const pctM = s.url.match(/[?&]drop=(\d+)/);
        if (pctM) params.percent = pctM[1];
        const slugM = s.url.match(/\/p\/([^/?#]+)/);
        if (slugM) {
            const slug = decodeURIComponent(slugM[1]);
            const p = await prisma.bnProduct.findUnique({
                where: { slug }, select: { title: true, titleUz: true, titleRu: true, titleEn: true },
            });
            if (p) params.product = locale === "ru" ? (p.titleRu || p.title) : locale === "en" ? (p.titleEn || p.title) : (p.titleUz || p.title);
        }
    }

    return NextResponse.json({
        suggestion: { id: s.id, kind: s.kind, title: s.title, body: s.body, url: s.url, params },
    });
}
