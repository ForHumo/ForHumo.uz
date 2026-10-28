// Ummi takliflari accept-rate o'lchovi — FAQAT founder.
// GET /api/ai/suggestions/stats[?days=N] → { total, byKind } (actRate/dismissRate %).

import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { isFounderProfile } from "@/lib/founders";
import { getSuggestionStats } from "@/lib/ummi-suggestions";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) return NextResponse.json({ error: "auth_required" }, { status: 401 });

    const me = await prisma.userProfile.findUnique({
        where: { email: session.user.email }, select: { username: true, humoId: true },
    });
    if (!isFounderProfile(me)) return NextResponse.json({ error: "forbidden" }, { status: 403 });

    const daysParam = new URL(req.url).searchParams.get("days");
    const days = daysParam ? Math.max(1, Math.min(365, parseInt(daysParam))) : undefined;
    const stats = await getSuggestionStats({ days });
    return NextResponse.json(stats);
}
