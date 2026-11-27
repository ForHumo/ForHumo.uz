// POST /api/esport/push/register — native ilova Expo push tokenini ro'yxatdan o'tkazadi.
// Bearer (mobil) yoki cookie (web) — resolveProfileId. Body: { token, platform? }.

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { resolveProfileId } from "@/lib/auth-request";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(req: Request) {
    const profileId = await resolveProfileId();
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
    if (!token) return NextResponse.json({ error: "missing_token" }, { status: 400 });

    // token @unique — bir token bir profilга (qurilma almashsa profileId yangilanadi)
    await prisma.esPushToken.upsert({
        where: { token },
        create: { profileId, token, platform },
        update: { profileId, platform },
    });

    return NextResponse.json({ ok: true });
}
