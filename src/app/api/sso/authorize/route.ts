import { NextResponse } from "next/server";
import { randomBytes } from "node:crypto";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getSsoClient, isAllowedRedirect, sanitizeScopes } from "@/lib/sso-clients";

// POST /api/sso/authorize — foydalanuvchi rozilik berdi → bir martalik kod yaratiladi.
// Sessiya (Humo ID) talab qilinadi. Body: { clientId, redirectUri, scope, state }
export async function POST(req: Request) {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const me = await prisma.userProfile.findUnique({
        where: { email: session.user.email }, select: { id: true, humoId: true },
    });
    if (!me) return NextResponse.json({ error: "Profil topilmadi" }, { status: 404 });
    if (!me.humoId) return NextResponse.json({ error: "Humo ID kerak", needHumoId: true }, { status: 400 });

    const { clientId, redirectUri, scope, state } = await req.json();
    const client = getSsoClient(clientId);
    if (!client) return NextResponse.json({ error: "Noma'lum ilova" }, { status: 400 });
    if (!isAllowedRedirect(client, redirectUri)) return NextResponse.json({ error: "Redirect ruxsat etilmagan" }, { status: 400 });

    const scopes = sanitizeScopes(scope);
    const code = randomBytes(24).toString("hex");
    await prisma.humoSsoCode.create({
        data: {
            code, profileId: me.id, clientId: client.id, redirectUri,
            scope: scopes.join(" "), expiresAt: new Date(Date.now() + 5 * 60 * 1000),
        },
    });

    const url = new URL(redirectUri);
    url.searchParams.set("code", code);
    if (typeof state === "string" && state) url.searchParams.set("state", state);
    return NextResponse.json({ redirectUrl: url.toString() });
}
