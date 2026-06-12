import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { authSsoClient, isAllowedRedirect } from "@/lib/sso-clients";
import { isVerifiedProfile } from "@/lib/nexus";

// POST /api/partner/sso/token — hamkor kodni profilga almashtiradi (server-aro, HMAC).
// Body: { clientId, code, redirectUri }
export async function POST(req: Request) {
    const raw = await req.text();
    let body: { clientId?: string; code?: string; redirectUri?: string } = {};
    try { body = JSON.parse(raw); } catch { return NextResponse.json({ error: "invalid_body" }, { status: 400 }); }

    const { clientId, code, redirectUri } = body;
    if (!clientId || !code) return NextResponse.json({ error: "missing_params" }, { status: 400 });

    const client = authSsoClient(req, raw, clientId);
    if (!client) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

    const rec = await prisma.humoSsoCode.findUnique({ where: { code } });
    if (!rec || rec.clientId !== client.id) return NextResponse.json({ error: "invalid_code" }, { status: 400 });
    if (rec.usedAt) return NextResponse.json({ error: "code_used" }, { status: 400 });
    if (rec.expiresAt.getTime() < Date.now()) return NextResponse.json({ error: "code_expired" }, { status: 400 });
    if (redirectUri && (rec.redirectUri !== redirectUri || !isAllowedRedirect(client, redirectUri))) {
        return NextResponse.json({ error: "redirect_mismatch" }, { status: 400 });
    }

    // Bir martalik — darhol belgilab qo'yamiz
    await prisma.humoSsoCode.update({ where: { id: rec.id }, data: { usedAt: new Date() } });

    const p = await prisma.userProfile.findUnique({
        where: { id: rec.profileId },
        select: { id: true, humoId: true, username: true, name: true, image: true, email: true, verified: true, country: true },
    });
    if (!p) return NextResponse.json({ error: "profile_not_found" }, { status: 404 });

    const scopes = rec.scope.split(" ").filter(Boolean);
    const out: Record<string, unknown> = {
        // profile (doim)
        humoId: p.humoId,
        username: p.username,
        name: p.name,
        image: p.image,
        country: p.country,
        sub: p.id,                       // barqaror identifikator
    };
    if (scopes.includes("email")) out.email = p.email;
    if (scopes.includes("nexus")) {
        const [followers, posts] = await Promise.all([
            prisma.nexusFollow.count({ where: { followingId: p.id } }),
            prisma.nexusPost.count({ where: { profileId: p.id, hidden: false } }),
        ]);
        out.nexus = { verified: isVerifiedProfile(p), followers, posts };
    }
    return NextResponse.json({ ok: true, scope: rec.scope, profile: out });
}
