// Kontakt sinxronizatsiya — foydalanuvchi telefondagi kontaktlarini yuboradi,
// server ForHumo'da mos kelganlarini qaytaradi.
//
//   POST /api/nexus/contacts/sync   Body: { contacts: [{ phone, name? }] }
//   → { synced, matches: [{ profileId, username, name, image, phoneHash, nameHint? }] }
//
// Xavfsizlik:
//   - Raw raqam serverda saqlanmaydi (faqat SHA-256 hash pepper bilan).
//   - Foydalanuvchi 500 dan ortiq kontakt yubora olmaydi (bir marta).
//   - Kunlik jami 5000 dan ortiq (batching cheklovi).
//   - Maxfiylik: match ro'yxatiga faqat privacyDm != "none" foydalanuvchilar tushadi.

import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { normalizeAndHash } from "@/lib/phone-hash";
import { isVerifiedProfile } from "@/lib/nexus";

const MAX_PER_REQUEST = 500;
const MAX_TOTAL_PER_DAY = 5000;

export async function POST(req: Request) {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const me = await prisma.userProfile.findUnique({
        where: { email: session.user.email }, select: { id: true },
    });
    if (!me) return NextResponse.json({ error: "Profil topilmadi" }, { status: 404 });

    const body = await req.json().catch(() => ({}));
    const contacts = Array.isArray(body?.contacts) ? body.contacts : [];
    if (contacts.length === 0) return NextResponse.json({ error: "Kontaktlar bo'sh" }, { status: 400 });
    if (contacts.length > MAX_PER_REQUEST) {
        return NextResponse.json({ error: `Bir marta ko'pi bilan ${MAX_PER_REQUEST} kontakt` }, { status: 400 });
    }

    // Kunlik cheklov tekshiruv
    const sinceDay = new Date(Date.now() - 24 * 3600 * 1000);
    const dailyCount = await prisma.nexusContactHash.count({
        where: { ownerId: me.id, addedAt: { gte: sinceDay } },
    });
    if (dailyCount + contacts.length > MAX_TOTAL_PER_DAY) {
        return NextResponse.json({ error: "Kunlik cheklov (5000) oshib ketdi" }, { status: 429 });
    }

    // Normalize + hash
    interface Item { hash: string; name: string | null }
    const items: Item[] = [];
    const seen = new Set<string>();
    for (const c of contacts) {
        if (!c || typeof c !== "object") continue;
        const raw = typeof c.phone === "string" ? c.phone : "";
        const h = normalizeAndHash(raw);
        if (!h || seen.has(h)) continue;
        seen.add(h);
        const nm = typeof c.name === "string" ? c.name.trim().slice(0, 60) : null;
        items.push({ hash: h, name: nm });
    }
    if (items.length === 0) return NextResponse.json({ error: "Yaroqli raqam topilmadi" }, { status: 400 });

    // Saqlash (upsert)
    await prisma.nexusContactHash.createMany({
        data: items.map(i => ({ ownerId: me.id, phoneHash: i.hash, nameHint: i.name })),
        skipDuplicates: true,
    });

    // Match — bu hashlar UserProfile.phoneHash bilan mos keladigan foydalanuvchilar
    const matchedUsers = await prisma.userProfile.findMany({
        where: {
            phoneHash: { in: items.map(i => i.hash) },
            id: { not: me.id },
            privacyDm: { not: "none" },
        },
        select: {
            id: true, username: true, name: true, image: true, phoneHash: true, humoId: true,
            verified: true, verifiedCategory: true,
        },
    });

    // NameHint qo'shish
    const nameHintMap = new Map(items.map(i => [i.hash, i.name]));

    return NextResponse.json({
        synced: items.length,
        matches: matchedUsers.map(u => ({
            profileId: u.id,
            username:  u.username,
            name:      u.name,
            image:     u.image,
            humoId:    u.humoId,
            nameHint:  u.phoneHash ? nameHintMap.get(u.phoneHash) ?? null : null,
            verified:  isVerifiedProfile(u),
        })),
    });
}
