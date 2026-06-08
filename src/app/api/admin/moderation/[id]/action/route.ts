import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireFounder } from "@/lib/admin-guard";
import { hideTarget, type ModTargetType } from "@/lib/moderation";

// POST /api/admin/moderation/[id]/action  body: { action: "keep" | "hide" }
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
    const founder = await requireFounder();
    if (!founder) return NextResponse.json({ error: "Ruxsat yo'q" }, { status: 403 });

    const { id } = await params;
    const { action } = await req.json() as { action: "keep" | "hide" };
    if (action !== "keep" && action !== "hide")
        return NextResponse.json({ error: "Noto'g'ri harakat" }, { status: 400 });

    const flag = await prisma.moderationFlag.findUnique({ where: { id } });
    if (!flag) return NextResponse.json({ error: "Topilmadi" }, { status: 404 });

    const hidden = action === "hide";
    // Kontentni yashiramiz yoki tiklaymiz (auto-hidden bo'lgan bo'lsa "keep" tiklaydi)
    await hideTarget(flag.targetType as ModTargetType, flag.targetId, hidden);

    await prisma.moderationFlag.update({
        where: { id },
        data: {
            status: hidden ? "HIDDEN" : "KEPT",
            reviewedById: founder.id,
            reviewedAt: new Date(),
        },
    });

    return NextResponse.json({ ok: true, status: hidden ? "HIDDEN" : "KEPT" });
}
