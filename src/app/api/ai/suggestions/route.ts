// Ummi takliflari — in-app yuza uchun joriy faol taklif.
// GET /api/ai/suggestions → { suggestion: {id,kind,title,body,url} | null }
// Kirmagan / toggle o'chiq / taklif yo'q → { suggestion: null } (401 emas — yuza jim yashirinadi).

import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getActiveSuggestion } from "@/lib/ummi-suggestions";

export const dynamic = "force-dynamic";

export async function GET() {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) return NextResponse.json({ suggestion: null });

    const me = await prisma.userProfile.findUnique({
        where: { email: session.user.email }, select: { id: true },
    });
    if (!me) return NextResponse.json({ suggestion: null });

    const s = await getActiveSuggestion(me.id);
    if (!s) return NextResponse.json({ suggestion: null });

    return NextResponse.json({
        suggestion: { id: s.id, kind: s.kind, title: s.title, body: s.body, url: s.url },
    });
}
