// Belis uchun auth va admin ruxsatlari.
// Admin — @sevinch (Belis egasi) YOKI For Humo founder (abduvoris/aaa).

import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { isFounderProfile } from "@/lib/founders";

/** Belis admin usernamelari — kelajakda DB'ga ko'chirilishi mumkin. */
export const BELIS_ADMIN_USERNAMES = ["sevinch"];

export interface BelisAuthCtx {
    profileId: string;
    email: string;
    username: string | null;
    humoId: string | null;
    isAdmin: boolean;
}

export async function getBelisAuth(): Promise<BelisAuthCtx | null> {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) return null;
    const profile = await prisma.userProfile.findUnique({
        where: { email: session.user.email },
        select: { id: true, email: true, username: true, humoId: true },
    });
    if (!profile?.email) return null;
    const isAdmin = isFounderProfile({ username: profile.username, humoId: profile.humoId })
        || (!!profile.username && BELIS_ADMIN_USERNAMES.includes(profile.username.toLowerCase()));
    return {
        profileId: profile.id,
        email: profile.email,
        username: profile.username,
        humoId: profile.humoId,
        isAdmin,
    };
}

export async function requireBelisAuth(): Promise<BelisAuthCtx | NextResponse> {
    const ctx = await getBelisAuth();
    if (!ctx) return NextResponse.json({ error: "auth_required" }, { status: 401 });
    return ctx;
}

export async function requireBelisAdmin(): Promise<BelisAuthCtx | NextResponse> {
    const ctx = await getBelisAuth();
    if (!ctx) return NextResponse.json({ error: "auth_required" }, { status: 401 });
    if (!ctx.isAdmin) return NextResponse.json({ error: "forbidden" }, { status: 403 });
    return ctx;
}
