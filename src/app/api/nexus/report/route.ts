import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { applyModeration, type ModTargetType } from "@/lib/moderation";

const TARGETS = ["POST", "COMMENT"] as const;
type Target = typeof TARGETS[number];

async function loadNexusTarget(t: Target, id: string): Promise<{ text: string; imageUrl: string | null } | null> {
    if (t === "POST") {
        const p = await prisma.nexusPost.findUnique({ where: { id }, select: { text: true, media: true } });
        return p ? { text: p.text || "", imageUrl: p.media[0] || null } : null;
    }
    const c = await prisma.nexusComment.findUnique({ where: { id }, select: { text: true } });
    return c ? { text: c.text, imageUrl: null } : null;
}

// POST /api/nexus/report — Nexus post/izohni shikoyat qilish (+ AI reaktiv tahlil)
export async function POST(req: Request) {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const profile = await prisma.userProfile.findUnique({ where: { email: session.user.email }, select: { id: true } });
    if (!profile) return NextResponse.json({ error: "Profil topilmadi" }, { status: 404 });

    const { targetType, targetId, reason } = await req.json();
    if (!TARGETS.includes(targetType) || !targetId)
        return NextResponse.json({ error: "Noto'g'ri so'rov" }, { status: 400 });

    const target = await loadNexusTarget(targetType as Target, targetId);
    if (!target) return NextResponse.json({ error: "Kontent topilmadi" }, { status: 404 });

    await applyModeration({
        module: "NEXUS",
        targetType: targetType as ModTargetType,
        targetId,
        text: target.text,
        imageUrl: target.imageUrl,
        kind: targetType === "POST" ? "post" : "izoh",
        reporterReason: reason ? String(reason).slice(0, 300) : "",
    });

    return NextResponse.json({ ok: true });
}
