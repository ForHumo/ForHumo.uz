// GET /api/bn/calls — foydalanuvchining BN qo'ng'iroqlari tarixi (mahsulot bo'yicha).
// Nexus qo'ng'iroqlaridan bnProductId != null bo'lganlari (BN kontekstidagilar).

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireBnAuth } from "@/lib/bn-auth";

export const dynamic = "force-dynamic";

export async function GET() {
    const auth = await requireBnAuth();
    if (auth instanceof NextResponse) return auth;
    const me = auth.profileId;

    const calls = await prisma.nexusCall.findMany({
        where: {
            bnProductId: { not: null },
            OR: [{ callerId: me }, { calleeId: me }],
        },
        orderBy: { createdAt: "desc" },
        take: 40,
        select: {
            id: true, kind: true, status: true, duration: true, createdAt: true,
            callerId: true, calleeId: true, bnProductId: true,
        },
    });
    if (calls.length === 0) return NextResponse.json({ calls: [] });

    const peerIds = [...new Set(calls.map(c => (c.callerId === me ? c.calleeId : c.callerId)))];
    const productIds = [...new Set(calls.map(c => c.bnProductId!).filter(Boolean))];
    const [profiles, products] = await Promise.all([
        prisma.userProfile.findMany({ where: { id: { in: peerIds } }, select: { id: true, name: true, username: true, image: true } }),
        prisma.bnProduct.findMany({ where: { id: { in: productIds } }, select: { id: true, title: true, images: true, slug: true, shop: { select: { slug: true } } } }),
    ]);
    const pById = new Map(profiles.map(p => [p.id, p]));
    const prodById = new Map(products.map(p => [p.id, p]));

    const out = calls.map(c => {
        const dir: "in" | "out" = c.callerId === me ? "out" : "in";
        const peer = pById.get(dir === "out" ? c.calleeId : c.callerId) ?? null;
        const prod = c.bnProductId ? prodById.get(c.bnProductId) : null;
        const missed = dir === "in" && (c.status === "MISSED" || c.status === "REJECTED");
        return {
            id: c.id,
            kind: c.kind,
            dir,
            missed,
            status: c.status,
            duration: c.duration,
            createdAt: c.createdAt,
            peer: peer ? { name: peer.name, username: peer.username, image: peer.image } : null,
            product: prod ? { title: prod.title, image: prod.images?.[0] ?? null, slug: prod.slug, shopSlug: prod.shop?.slug ?? null } : null,
        };
    });

    return NextResponse.json({ calls: out });
}
