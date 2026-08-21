// Humo Media Pack — egalik huquqini boshqa foydalanuvchiga o'tkazish.
//   POST /api/humo/packs/[slug]/transfer  { username: string }
//
// - Faqat joriy egasi chaqira oladi
// - Yangi username @ bilan yoki @siz — mustaqil
// - Sticker/GIF pack'ining barcha item'lari ham yangi egaga o'tadi (relation orqali)
// - Yangi egaga bu haqda bildirishnoma yuborish keyingi commit'da

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireHumoAuth } from "@/lib/humo-media";

export const dynamic = "force-dynamic";

export async function POST(req: Request, { params }: { params: Promise<{ slug: string }> }) {
    const auth = await requireHumoAuth();
    if (!auth) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

    const { slug } = await params;
    const body = await req.json().catch(() => ({}));
    const rawUsername = typeof body?.username === "string" ? body.username.trim() : "";
    const targetUsername = rawUsername.replace(/^@+/, "").toLowerCase();
    if (!targetUsername || targetUsername.length < 3) {
        return NextResponse.json({ error: "invalid_username" }, { status: 400 });
    }

    const pack = await prisma.humoMediaPack.findUnique({
        where: { slug },
        select: { id: true, ownerId: true, name: true },
    });
    if (!pack) return NextResponse.json({ error: "not_found" }, { status: 404 });
    if (pack.ownerId !== auth.profileId) {
        return NextResponse.json({ error: "forbidden" }, { status: 403 });
    }

    const newOwner = await prisma.userProfile.findUnique({
        where: { username: targetUsername },
        select: { id: true, name: true, username: true },
    });
    if (!newOwner) return NextResponse.json({ error: "user_not_found" }, { status: 404 });
    if (newOwner.id === auth.profileId) {
        return NextResponse.json({ error: "self_transfer" }, { status: 400 });
    }

    // Agar yangi egasi allaqachon obuna bo'lgan bo'lsa — subscription o'chirilib egalikka o'tkaziladi
    // (aks holda unique constraint xato beradi kelajakda)
    await prisma.$transaction([
        prisma.humoMediaSubscription.deleteMany({
            where: { packId: pack.id, profileId: newOwner.id },
        }),
        prisma.humoMediaPack.update({
            where: { id: pack.id },
            data: { ownerId: newOwner.id },
        }),
    ]);

    return NextResponse.json({
        ok: true,
        newOwner: { username: newOwner.username, name: newOwner.name },
    });
}
