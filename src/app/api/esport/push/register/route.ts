// POST /api/esport/push/register — native ilova Expo push tokenini ro'yxatdan o'tkazadi.
// Bearer (mobil) yoki cookie (web) — resolveProfileId. Body: { token, platform? }.

import { NextResponse } from "next/server";
import { Expo } from "expo-server-sdk";
import { prisma } from "@/lib/prisma";
import { resolveMobileProfileId } from "@/lib/auth-request";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(req: Request) {
    // Faqat native ilova (Bearer) — cookie qabul qilinmaydi (CSRF yuzasini yopadi).
    const profileId = await resolveMobileProfileId();
    if (!profileId) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

    let token: string | undefined;
    let platform = "android";
    try {
        const b = await req.json();
        if (typeof b?.token === "string") token = b.token.trim();
        if (typeof b?.platform === "string" && b.platform.trim()) platform = b.platform.trim().slice(0, 20);
    } catch {
        return NextResponse.json({ error: "invalid_body" }, { status: 400 });
    }
    if (!token || !Expo.isExpoPushToken(token)) {
        return NextResponse.json({ error: "invalid_token" }, { status: 400 });
    }

    // token @unique — bir token bir profilга (qurilma almashsa profileId yangilanadi)
    await prisma.esPushToken.upsert({
        where: { token },
        create: { profileId, token, platform },
        update: { profileId, platform },
    });

    return NextResponse.json({ ok: true });
}
