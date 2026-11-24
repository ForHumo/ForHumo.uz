import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { verifySteamCallback, fetchSteamProfile } from "@/lib/steam";
import { steamAppIdForSlug, syncSteamAccount } from "@/lib/esport-verify";

// GET /api/user/steam-link/callback — Steam OpenID javobi.
// Muvaffaqiyat: SteamID64'ni tekshirib UserProfile'ga saqlaymiz, keyin ?from sahifasiga qaytamiz.
export async function GET(req: Request) {
    const session = await getServerSession(authOptions);
    const url = new URL(req.url);
    const from = url.searchParams.get("from") || "/esport";
    const safeFrom = from.startsWith("/") && !from.startsWith("//") ? from : "/esport";

    if (!session?.user?.email) {
        // Sessiya yo'qolgan bo'lsa — bosh sahifaga xato bilan
        return NextResponse.redirect(new URL(`${safeFrom}?steam=session_lost`, url));
    }

    const steamId64 = await verifySteamCallback(url.searchParams);
    if (!steamId64) {
        return NextResponse.redirect(new URL(`${safeFrom}?steam=failed`, url));
    }

    // Bu SteamID64 boshqa Humo ID'ga bog'langanmi?
    const me = await prisma.userProfile.findUnique({ where: { email: session.user.email }, select: { id: true } });
    if (!me) return NextResponse.redirect(new URL(`${safeFrom}?steam=no_profile`, url));

    const taken = await prisma.userProfile.findFirst({ where: { steamId64, NOT: { id: me.id } }, select: { id: true } });
    if (taken) return NextResponse.redirect(new URL(`${safeFrom}?steam=taken`, url));

    const profile = await fetchSteamProfile(steamId64);
    await prisma.userProfile.update({
        where: { id: me.id },
        data: {
            steamId64,
            steamPersona: profile.persona,
            steamAvatar: profile.avatar,
            steamLinkedAt: new Date(),
        },
    });

    // CS2/Dota sportchisi bo'lsa — STEAM integritet akkauntini darhol tekshirib yozamiz (fail-safe)
    try {
        const ath = await prisma.esAthlete.findUnique({
            where: { humoProfileId: me.id },
            select: { id: true, game: { select: { slug: true } } },
        });
        if (ath && steamAppIdForSlug(ath.game.slug) !== null) {
            await syncSteamAccount(ath.id, steamId64, ath.game.slug);
        }
    } catch { /* link baribir muvaffaqiyatli — tekshiruvni keyin qayta urinish mumkin */ }

    return NextResponse.redirect(new URL(`${safeFrom}?steam=ok`, url));
}
