// BN uchun umumiy auth yordamchisi. Barcha shaxsiy API route'lar
// (cart, favorites, orders, inspect) sessiyani va profileni shu orqali oladi.

import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export interface BnAuthContext {
    email: string;
    profileId: string;
    /** UserProfile.humoId — mavjud bo'lsa (kirgan foydalanuvchining Humo ID'si) */
    humoId: string | null;
}

/** Sessiyani tekshiradi va profil ID sini qaytaradi. Kirmagan bo'lsa null. */
export async function getBnAuth(): Promise<BnAuthContext | null> {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) return null;
    const profile = await prisma.userProfile.findUnique({
        where: { email: session.user.email },
        select: { id: true, email: true, humoId: true },
    });
    if (!profile?.email) return null;
    return { email: profile.email, profileId: profile.id, humoId: profile.humoId };
}

/** requireBnAuth — bo'lmasa 401 javob qaytaradi. Chaqiruv:
 *   const auth = await requireBnAuth(); if (auth instanceof NextResponse) return auth;
 */
export async function requireBnAuth(): Promise<BnAuthContext | NextResponse> {
    const auth = await getBnAuth();
    if (!auth) return NextResponse.json({ error: "auth_required" }, { status: 401 });
    return auth;
}
