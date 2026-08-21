// Humo Media Packs — yaratish + o'zim yaratganlar ro'yxati.
//   POST /api/humo/packs  { kind, name }  → { pack }
//   GET  /api/humo/packs?kind=GIF          → mening yaratgan pack'larim

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireHumoAuth, slugifyPackName, USER_MAX_PACKS } from "@/lib/humo-media";
import type { HumoMediaKind } from "@prisma/client";

export const dynamic = "force-dynamic";

function normKind(raw: unknown): HumoMediaKind | null {
    return raw === "GIF" || raw === "STICKER" ? raw : null;
}

export async function GET(req: Request) {
    const auth = await requireHumoAuth();
    if (!auth) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

    const url = new URL(req.url);
    const kind = normKind(url.searchParams.get("kind"));

    const packs = await prisma.humoMediaPack.findMany({
        where: {
            ownerId: auth.profileId,
            ...(kind ? { kind } : {}),
        },
        orderBy: { createdAt: "desc" },
        include: {
            _count: { select: { items: true } },
        },
    });
    return NextResponse.json({ packs });
}

export async function POST(req: Request) {
    const auth = await requireHumoAuth();
    if (!auth) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

    const b = await req.json().catch(() => ({}));
    const kind = normKind(b?.kind);
    const name = typeof b?.name === "string" ? b.name.trim().slice(0, 60) : "";
    if (!kind) return NextResponse.json({ error: "invalid_kind" }, { status: 400 });
    if (name.length < 2) return NextResponse.json({ error: "invalid_name" }, { status: 400 });

    // Max pack limiti
    const count = await prisma.humoMediaPack.count({
        where: { ownerId: auth.profileId },
    });
    if (count >= USER_MAX_PACKS) {
        return NextResponse.json({ error: "too_many_packs", max: USER_MAX_PACKS }, { status: 400 });
    }

    // Owner handle (username) — slug uchun
    const owner = await prisma.userProfile.findUnique({
        where: { id: auth.profileId },
        select: { username: true, humoId: true },
    });
    const handle = owner?.username ?? owner?.humoId ?? "u";

    // Slug — nom + handle + noyob suffix (retry 3x agar collision bo'lsa)
    let slug = "";
    for (let i = 0; i < 3; i++) {
        slug = slugifyPackName(name, handle);
        const exists = await prisma.humoMediaPack.findUnique({ where: { slug }, select: { id: true } });
        if (!exists) break;
    }

    const pack = await prisma.humoMediaPack.create({
        data: {
            ownerId: auth.profileId,
            kind, name, slug,
            isPublic: true,
        },
    });

    return NextResponse.json({ pack });
}
