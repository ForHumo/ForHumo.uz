// Yaqin atrofdagi foydalanuvchilarni topish.
//   GET /api/nexus/nearby?lat=&lng=&radius=5&limit=50
//   → { people: [{ profileId, username, name, image, distanceKm, distanceLabel, verified, lastSeenAt }] }
//
// Filtr:
//   - Faqat nearbyEnabled=true va nearbyUpdatedAt > now-24h
//   - O'zim va bloklangan/blocklaganlar chiqmaydi
//   - privacyDm != "none" — DM yoza olmaydiganlar chiqmaydi
//   - Bounding box + Haversine (aniqroq masofa)
//   - lastSeenAt DESC (oxirgi ko'rilgan avval)
//
// Koordinatalar QAYTMAYDI — faqat masofa (privacy).

import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { haversineKm, boundingBox, formatDistanceApprox } from "@/lib/geo-distance";
import { isVerifiedProfile } from "@/lib/nexus";

const MAX_RADIUS_KM = 50;
const DEFAULT_RADIUS_KM = 5;
const MAX_LIMIT = 200;
const NEARBY_TTL_MS = 24 * 3600 * 1000;

export async function GET(req: Request) {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const me = await prisma.userProfile.findUnique({
        where: { email: session.user.email }, select: { id: true, nearbyEnabled: true },
    });
    if (!me) return NextResponse.json({ error: "Profil topilmadi" }, { status: 404 });
    if (!me.nearbyEnabled) return NextResponse.json({ error: "Nearby yoqilmagan" }, { status: 403 });

    const url = new URL(req.url);
    const lat = parseFloat(url.searchParams.get("lat") || "");
    const lng = parseFloat(url.searchParams.get("lng") || "");
    const radiusKm = Math.min(MAX_RADIUS_KM, Math.max(0.5, parseFloat(url.searchParams.get("radius") || String(DEFAULT_RADIUS_KM))));
    const limit = Math.min(MAX_LIMIT, Math.max(1, parseInt(url.searchParams.get("limit") || "50", 10)));
    if (!Number.isFinite(lat) || lat < -90 || lat > 90) return NextResponse.json({ error: "Noto'g'ri lat" }, { status: 400 });
    if (!Number.isFinite(lng) || lng < -180 || lng > 180) return NextResponse.json({ error: "Noto'g'ri lng" }, { status: 400 });

    const bb = boundingBox(lat, lng, radiusKm);
    const since = new Date(Date.now() - NEARBY_TTL_MS);

    // Bloklangan/blocklaganlar ro'yxati — hech qaysisi chiqmaydi
    const [blocked, blockedMe] = await Promise.all([
        prisma.nexusBlock.findMany({ where: { blockerId: me.id }, select: { blockedId: true } }),
        prisma.nexusBlock.findMany({ where: { blockedId: me.id }, select: { blockerId: true } }),
    ]);
    const excludeIds = new Set<string>([me.id]);
    for (const b of blocked) excludeIds.add(b.blockedId);
    for (const b of blockedMe) excludeIds.add(b.blockerId);

    // Bounding box + oyna + opt-in + DM privacy filtri
    const candidates = await prisma.userProfile.findMany({
        where: {
            nearbyEnabled: true,
            nearbyUpdatedAt: { gt: since },
            nearbyLat: { gte: bb.minLat, lte: bb.maxLat },
            nearbyLng: { gte: bb.minLng, lte: bb.maxLng },
            id: { notIn: [...excludeIds] },
            privacyDm: { not: "none" },
            deletedAt: null,
        },
        select: {
            id: true, username: true, name: true, image: true, humoId: true,
            verified: true, verifiedCategory: true,
            nearbyLat: true, nearbyLng: true, lastSeenAt: true,
        },
        take: Math.min(500, limit * 4),   // ortiqcha olib Haversine filtratsiyasidan keyin qisqartiramiz
    });

    // Aniq masofa hisoblash + radiuscha kesish
    const withDist: Array<{ p: typeof candidates[number]; km: number }> = [];
    for (const p of candidates) {
        if (p.nearbyLat == null || p.nearbyLng == null) continue;
        const km = haversineKm(lat, lng, p.nearbyLat, p.nearbyLng);
        if (km <= radiusKm) withDist.push({ p, km });
    }
    withDist.sort((a, b) => a.km - b.km);
    const sliced = withDist.slice(0, limit);

    return NextResponse.json({
        radiusKm,
        people: sliced.map(({ p, km }) => ({
            profileId:     p.id,
            username:      p.username,
            name:          p.name,
            image:         p.image,
            humoId:        p.humoId,
            distanceKm:    Number(km.toFixed(2)),
            distanceLabel: formatDistanceApprox(km),
            verified:      isVerifiedProfile(p),
            lastSeenAt:    p.lastSeenAt?.toISOString() ?? null,
        })),
    });
}
