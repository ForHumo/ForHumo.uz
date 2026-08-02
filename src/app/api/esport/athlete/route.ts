import { NextResponse } from "next/server";
import { after } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getMyProfile, MLBB_ROLES } from "@/lib/esport";
import { grantAchievement } from "@/lib/achievements";

// O'yin slug'i bo'yicha Steam bog'lanish talab qilinadimi?
// CS2 uchun Valve identiteti (SteamID64) majburiy — soxta akkountlar oldini olish uchun.
const GAMES_REQUIRE_STEAM = new Set(["cs2"]);

// IGN takror (katta-kichik harf farqsiz), o'zidan tashqari
async function ignTaken(ign: string, exceptId?: string) {
    const f = await prisma.esAthlete.findFirst({ where: { ign: { equals: ign, mode: "insensitive" }, ...(exceptId ? { NOT: { id: exceptId } } : {}) }, select: { id: true } });
    return !!f;
}
// O'yin ID raqami takror (o'sha o'yin ichida), o'zidan tashqari
async function gameUserIdTaken(gameId: string, gameUserId: string, exceptId?: string) {
    const f = await prisma.esAthlete.findFirst({ where: { gameId, gameUserId, ...(exceptId ? { NOT: { id: exceptId } } : {}) }, select: { id: true } });
    return !!f;
}

// GET /api/esport/athlete — mening sportchi profilim (bo'lsa) + faol o'yinlar + Humo ID ismim
export async function GET() {
    const me = await getMyProfile();
    if (!me) return NextResponse.json({ error: "Avval tizimga kiring" }, { status: 401 });

    // Steam bog'lanish holati (CS2 uchun kerak)
    const session = await getServerSession(authOptions);
    const steam = session?.user?.email
        ? await prisma.userProfile.findUnique({
            where: { email: session.user.email },
            select: { steamId64: true, steamPersona: true, steamAvatar: true },
        })
        : null;

    const [athlete, games] = await Promise.all([
        prisma.esAthlete.findUnique({
            where: { humoProfileId: me.id },
            include: { game: { select: { slug: true, name: true } } },
        }),
        prisma.esGame.findMany({ where: { active: true }, orderBy: { name: "asc" }, select: { id: true, slug: true, name: true, teamSize: true } }),
    ]);

    return NextResponse.json({
        hasHumoId: !!me.humoId,
        profileName: { firstName: me.firstName ?? "", lastName: me.lastName ?? "", hasName: !!(me.firstName && me.lastName) },
        athlete: athlete
            ? { id: athlete.id, game: athlete.game, ign: athlete.ign, gameUserId: athlete.gameUserId, gameServer: athlete.gameServer, role: athlete.role, image: athlete.image ?? me.image ?? null, coverImage: athlete.coverImage ?? null }
            : null,
        games: games.map(g => ({ ...g, requiresSteam: GAMES_REQUIRE_STEAM.has(g.slug) })),
        roles: MLBB_ROLES,
        steam: {
            linked: !!steam?.steamId64,
            steamId64: steam?.steamId64 ?? null,
            persona: steam?.steamPersona ?? null,
            avatar: steam?.steamAvatar ?? null,
        },
    });
}

// POST /api/esport/athlete — sportchi profili yaratish (QATTIQ QULF: bir Humo ID = bitta o'yin, o'zgarmas)
export async function POST(req: Request) {
    const me = await getMyProfile();
    if (!me) return NextResponse.json({ error: "Avval tizimga kiring" }, { status: 401 });
    if (!me.humoId) return NextResponse.json({ error: "Avval Humo ID oling", needHumoId: true }, { status: 403 });

    // Allaqachon sportchimi? (qattiq qulf — bitta athlete profil)
    const existing = await prisma.esAthlete.findUnique({ where: { humoProfileId: me.id }, select: { id: true } });
    if (existing) return NextResponse.json({ error: "Siz allaqachon sportchisiz" }, { status: 400 });

    const body = await req.json();
    const gameId = String(body.gameId || "");
    const ign = String(body.ign || "").trim();
    const gameUserId = String(body.gameUserId || "").trim();
    const gameServer = typeof body.gameServer === "string" && body.gameServer.trim() ? body.gameServer.trim().slice(0, 30) : null;
    const role = typeof body.role === "string" && (MLBB_ROLES as readonly string[]).includes(body.role) ? body.role : null;
    let firstName = String(body.firstName || "").trim().slice(0, 60);
    let lastName = String(body.lastName || "").trim().slice(0, 60);

    // Ism/familiya — Humo ID'da bo'lsa o'shandan, bo'lmasa majburiy kiritiladi
    if (me.firstName) firstName = me.firstName;
    if (me.lastName) lastName = me.lastName;
    if (!firstName || !lastName) return NextResponse.json({ error: "Ism va familiya majburiy" }, { status: 400 });
    if (!ign) return NextResponse.json({ error: "MLBB nickname majburiy" }, { status: 400 });
    if (!gameUserId) return NextResponse.json({ error: "In-game ID majburiy" }, { status: 400 });

    // O'yin faolmi?
    const game = await prisma.esGame.findFirst({ where: { id: gameId, active: true }, select: { id: true, slug: true } });
    if (!game) return NextResponse.json({ error: "Noto'g'ri yoki nofaol o'yin" }, { status: 400 });

    // CS2 uchun Steam bog'lanish MAJBURIY (soxta profillar oldini olish)
    let finalGameUserId = gameUserId;
    if (GAMES_REQUIRE_STEAM.has(game.slug)) {
        const meFull = await prisma.userProfile.findUnique({
            where: { id: me.id },
            select: { steamId64: true },
        });
        if (!meFull?.steamId64) {
            return NextResponse.json(
                { error: "CS2 uchun Steam akkauntini bog'lash majburiy", needSteamLink: true },
                { status: 403 },
            );
        }
        // CS2 gameUserId = tasdiqlangan SteamID64 (foydalanuvchi kiritganini almashtiramiz)
        finalGameUserId = meFull.steamId64;
    }

    // Takrorlanmaslik: nickname + o'yin ID
    if (await ignTaken(ign)) return NextResponse.json({ error: "Bu nickname band — boshqa tanlang" }, { status: 409 });
    if (await gameUserIdTaken(game.id, finalGameUserId)) return NextResponse.json({ error: "Bu o'yin ID raqami band" }, { status: 409 });

    const image = typeof body.image === "string" && body.image ? body.image : null;

    // Humo ID'da ism/familiya bo'lmasa — to'ldiramiz (14-kun cheklovi profileEditedAt'ga tegmaymiz)
    if (!me.firstName || !me.lastName) {
        await prisma.userProfile.update({
            where: { id: me.id },
            data: { ...(me.firstName ? {} : { firstName }), ...(me.lastName ? {} : { lastName }) },
        });
    }

    let athlete;
    try {
        athlete = await prisma.esAthlete.create({
            data: {
                humoProfileId: me.id,
                gameId: game.id,
                ign: ign.slice(0, 40),
                gameUserId: finalGameUserId.slice(0, 40),
                gameServer,
                role,
                image,
            },
            include: { game: { select: { slug: true, name: true } } },
        });
    } catch {
        return NextResponse.json({ error: "Nickname yoki o'yin ID band" }, { status: 409 });
    }

    after(() => { grantAchievement(me.id, "esport.athlete"); });

    return NextResponse.json({
        ok: true,
        athlete: { id: athlete.id, game: athlete.game, ign: athlete.ign, gameUserId: athlete.gameUserId, gameServer: athlete.gameServer, role: athlete.role, image: athlete.image ?? me.image ?? null },
    });
}

// DELETE /api/esport/athlete — FAQAT eSport profilini o'chiradi (Humo ID emas)
export async function DELETE() {
    const me = await getMyProfile();
    if (!me) return NextResponse.json({ error: "Avval tizimga kiring" }, { status: 401 });
    const athlete = await prisma.esAthlete.findUnique({ where: { humoProfileId: me.id }, select: { id: true } });
    if (!athlete) return NextResponse.json({ error: "Sportchi profili yo'q" }, { status: 404 });

    // Jamoada bo'lsa — avval chiqishi kerak
    const member = await prisma.esRosterMember.findUnique({ where: { athleteId: athlete.id }, select: { id: true } });
    if (member) return NextResponse.json({ error: "Avval jamoadan chiqing" }, { status: 400 });
    // Jamoa egasi bo'lsa — avval jamoani hal qilsin
    const owns = await prisma.esTeam.count({ where: { ownerId: me.id } });
    if (owns > 0) return NextResponse.json({ error: "Avval jamoangizni o'chiring yoki egalikni o'tkazing" }, { status: 400 });

    await prisma.esAthlete.delete({ where: { id: athlete.id } }); // cascade: a'zolik/transfer/arizalar
    return NextResponse.json({ ok: true });
}

// PATCH /api/esport/athlete — sportchi ma'lumotini tahrirlash (o'yin O'ZGARMAYDI)
export async function PATCH(req: Request) {
    const me = await getMyProfile();
    if (!me) return NextResponse.json({ error: "Avval tizimga kiring" }, { status: 401 });

    const athlete = await prisma.esAthlete.findUnique({
        where: { humoProfileId: me.id },
        select: { id: true, gameId: true, game: { select: { slug: true } } },
    });
    if (!athlete) return NextResponse.json({ error: "Sportchi profili topilmadi" }, { status: 404 });

    const body = await req.json();
    const data: Record<string, unknown> = {};

    if (typeof body.ign === "string") {
        const ign = body.ign.trim().slice(0, 40);
        if (!ign) return NextResponse.json({ error: "Nickname bo'sh bo'lmasin" }, { status: 400 });
        if (await ignTaken(ign, athlete.id)) return NextResponse.json({ error: "Bu nickname band" }, { status: 409 });
        data.ign = ign;
    }
    if (typeof body.gameUserId === "string") {
        // CS2 uchun gameUserId = tasdiqlangan SteamID64 — foydalanuvchi o'zgartira olmaydi
        if (GAMES_REQUIRE_STEAM.has(athlete.game.slug)) {
            return NextResponse.json({ error: "CS2 uchun ID Steam akkauntiga bog'langan — o'zgartirib bo'lmaydi" }, { status: 400 });
        }
        const gid = body.gameUserId.trim().slice(0, 40);
        if (!gid) return NextResponse.json({ error: "O'yin ID bo'sh bo'lmasin" }, { status: 400 });
        if (await gameUserIdTaken(athlete.gameId, gid, athlete.id)) return NextResponse.json({ error: "Bu o'yin ID raqami band" }, { status: 409 });
        data.gameUserId = gid;
    }
    if ("gameServer" in body) data.gameServer = typeof body.gameServer === "string" && body.gameServer.trim() ? body.gameServer.trim().slice(0, 30) : null;
    if ("role" in body) data.role = typeof body.role === "string" && (MLBB_ROLES as readonly string[]).includes(body.role) ? body.role : null;
    if ("image" in body) data.image = typeof body.image === "string" && body.image ? body.image : null;
    if ("coverImage" in body) data.coverImage = typeof body.coverImage === "string" && body.coverImage ? body.coverImage : null;

    let updated;
    try {
        updated = await prisma.esAthlete.update({ where: { id: athlete.id }, data, include: { game: { select: { slug: true, name: true } } } });
    } catch {
        return NextResponse.json({ error: "Nickname yoki o'yin ID band" }, { status: 409 });
    }

    return NextResponse.json({
        ok: true,
        athlete: { id: updated.id, game: updated.game, ign: updated.ign, gameUserId: updated.gameUserId, gameServer: updated.gameServer, role: updated.role, image: updated.image ?? me.image ?? null, coverImage: updated.coverImage ?? null },
    });
}
