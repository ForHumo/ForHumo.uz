import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getMyProfile } from "@/lib/esport";
import {
    steamAppIdForSlug, verifyFaceit, syncSteamAccount,
    generateProofCode, proofExpiry, type VerifyPlatform,
} from "@/lib/esport-verify";
import type { Prisma } from "@prisma/client";

// O'yin uchun qaysi platformalar amal qiladi.
// PK o'yin (Steam appId bor) → STEAM + FACEIT; aks holda (MLBB va h.k.) → MOONTON.
function platformsForGame(slug: string): VerifyPlatform[] {
    return steamAppIdForSlug(slug) !== null ? ["STEAM", "FACEIT"] : ["MOONTON"];
}

const asJson = (v: unknown): Prisma.InputJsonValue => JSON.parse(JSON.stringify(v)) as Prisma.InputJsonValue;

async function loadAthlete(meId: string) {
    return prisma.esAthlete.findUnique({
        where: { humoProfileId: meId },
        select: { id: true, gameUserId: true, game: { select: { slug: true, name: true } } },
    });
}

const ACCOUNT_SELECT = {
    platform: true, externalId: true, handle: true, verified: true,
    verdict: true, proofCode: true, proofExpires: true, snapshot: true, lastCheckedAt: true,
} as const;

// GET — mening sportchi akkauntlarim + amaldagi platformalar + Steam bog'lanish holati
export async function GET() {
    const me = await getMyProfile();
    if (!me) return NextResponse.json({ error: "Avval tizimga kiring" }, { status: 401 });
    const athlete = await loadAthlete(me.id);
    if (!athlete) return NextResponse.json({ error: "Sportchi profili yo'q" }, { status: 404 });

    const session = await getServerSession(authOptions);
    const prof = session?.user?.email
        ? await prisma.userProfile.findUnique({ where: { email: session.user.email }, select: { steamId64: true } })
        : null;

    const accounts = await prisma.esGameAccount.findMany({
        where: { athleteId: athlete.id },
        select: ACCOUNT_SELECT,
    });

    return NextResponse.json({
        gameSlug: athlete.game.slug,
        platforms: platformsForGame(athlete.game.slug),
        steamLinked: !!prof?.steamId64,
        accounts,
    });
}

// POST { platform, nickname? } — tegishli platformani tekshiradi/boshlaydi
export async function POST(req: Request) {
    const me = await getMyProfile();
    if (!me) return NextResponse.json({ error: "Avval tizimga kiring" }, { status: 401 });
    const athlete = await loadAthlete(me.id);
    if (!athlete) return NextResponse.json({ error: "Sportchi profili yo'q" }, { status: 404 });

    const body = await req.json().catch(() => ({}));
    const platform = String(body.platform || "") as VerifyPlatform;
    const slug = athlete.game.slug;
    if (!platformsForGame(slug).includes(platform)) {
        return NextResponse.json({ error: "Bu o'yin uchun bu platforma emas" }, { status: 400 });
    }

    if (platform === "STEAM") {
        const prof = await prisma.userProfile.findUnique({ where: { id: me.id }, select: { steamId64: true } });
        if (!prof?.steamId64) return NextResponse.json({ error: "Avval Steam akkauntini bog'lang", needSteamLink: true }, { status: 400 });
        await syncSteamAccount(athlete.id, prof.steamId64, slug);
    } else if (platform === "FACEIT") {
        const nickname = String(body.nickname || "").trim().slice(0, 60);
        if (!nickname) return NextResponse.json({ error: "Faceit nickini kiriting" }, { status: 400 });
        const r = await verifyFaceit(nickname, slug);
        await prisma.esGameAccount.upsert({
            where: { athleteId_platform: { athleteId: athlete.id, platform: "FACEIT" } },
            create: { athleteId: athlete.id, platform: "FACEIT", externalId: r.externalId ?? nickname, handle: r.handle ?? nickname, verified: false, verdict: r.verdict, snapshot: asJson(r.snapshot), lastCheckedAt: new Date() },
            update: { externalId: r.externalId ?? nickname, handle: r.handle ?? nickname, verdict: r.verdict, snapshot: asJson(r.snapshot), lastCheckedAt: new Date() },
        });
    } else if (platform === "MOONTON") {
        const code = generateProofCode();
        const expires = proofExpiry();
        await prisma.esGameAccount.upsert({
            where: { athleteId_platform: { athleteId: athlete.id, platform: "MOONTON" } },
            create: { athleteId: athlete.id, platform: "MOONTON", externalId: athlete.gameUserId, handle: null, verified: false, verdict: "TEKSHIRISH", proofCode: code, proofExpires: expires, snapshot: asJson({ note: "MLBB kod-isbot — admin tasdig'i kerak" }), lastCheckedAt: new Date() },
            update: { proofCode: code, proofExpires: expires },
        });
    }

    const accounts = await prisma.esGameAccount.findMany({ where: { athleteId: athlete.id }, select: ACCOUNT_SELECT });
    return NextResponse.json({ ok: true, accounts });
}
