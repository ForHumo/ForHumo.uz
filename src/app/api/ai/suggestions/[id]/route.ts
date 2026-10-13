// Ummi taklif holatini o'zgartirish (ko'rildi / rad etildi / ochildi). Faqat egasi.
// PATCH /api/ai/suggestions/[id]  { status: "SEEN" | "DISMISSED" | "ACTED" }

import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { setSuggestionStatus } from "@/lib/ummi-suggestions";

export const dynamic = "force-dynamic";

const ALLOWED = ["SEEN", "DISMISSED", "ACTED"] as const;
type Status = (typeof ALLOWED)[number];

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) return NextResponse.json({ error: "auth_required" }, { status: 401 });

    const me = await prisma.userProfile.findUnique({
        where: { email: session.user.email }, select: { id: true },
    });
    if (!me) return NextResponse.json({ error: "profile_not_found" }, { status: 404 });

    const { id } = await params;
    const body = await req.json().catch(() => ({}));
    const status = String(body?.status ?? "");
    if (!ALLOWED.includes(status as Status)) {
        return NextResponse.json({ error: "invalid_status" }, { status: 400 });
    }

    const ok = await setSuggestionStatus(id, me.id, status as Status);
    if (!ok) return NextResponse.json({ error: "not_found" }, { status: 404 });
    return NextResponse.json({ ok: true });
}
