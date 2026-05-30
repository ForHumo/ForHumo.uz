/**
 * NextAuth configuration — ForHumo.uz
 *
 * Providers:
 *   1. Google OAuth  (primary — auto-verifies email)
 *   2. Credentials   (fallback — email + bcryptjs password)
 *
 * Install bcryptjs if not present:
 *   npm install bcryptjs @types/bcryptjs
 */

import type { NextAuthOptions } from "next-auth";
import GoogleProvider    from "next-auth/providers/google";
import CredentialsProvider from "next-auth/providers/credentials";
import { prisma }        from "@/lib/prisma";

// Lazy-import bcryptjs so build doesn't fail if the package is absent at dev time
let bcrypt: typeof import("bcryptjs") | null = null;
async function getBcrypt() {
    if (!bcrypt) bcrypt = await import("bcryptjs");
    return bcrypt;
}

export const authOptions: NextAuthOptions = {
    providers: [
        // ── 1. Google OAuth ──────────────────────────────────────────────────
        GoogleProvider({
            clientId:     process.env.GOOGLE_CLIENT_ID!,
            clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
        }),

        // ── 2. Email / Password credentials (fallback) ────────────────────────
        CredentialsProvider({
            id:   "credentials",
            name: "Email & Password",
            credentials: {
                email:    { label: "Email",    type: "email" },
                password: { label: "Password", type: "password" },
            },
            async authorize(credentials) {
                if (!credentials?.email || !credentials?.password) return null;

                const profile = await prisma.userProfile.findUnique({
                    where: { email: credentials.email.toLowerCase().trim() },
                    include: { credential: true },
                });

                if (!profile?.credential?.passwordHash) return null;

                const bc    = await getBcrypt();
                const valid = await bc.compare(credentials.password, profile.credential.passwordHash);
                if (!valid) return null;

                return {
                    id:    profile.id,
                    email: profile.email,
                    name:  profile.name ?? profile.firstName ?? profile.email,
                    image: profile.image ?? undefined,
                };
            },
        }),
    ],

    pages: { signIn: "/" },

    session: { strategy: "jwt" },

    callbacks: {
        // ── signIn: upsert UserProfile + record login event ──────────────────
        async signIn({ user, account }) {
            if (!user.email) return true;
            try {
                const isGoogle = account?.provider === "google";
                const profile  = await prisma.userProfile.upsert({
                    where:  { email: user.email },
                    create: {
                        email:         user.email,
                        googleId:      isGoogle ? user.id ?? null : null,
                        name:          user.name  ?? null,
                        image:         user.image ?? null,
                        emailVerified: isGoogle,
                        lastLoginAt:   new Date(),
                    },
                    update: {
                        googleId:    isGoogle ? user.id ?? undefined : undefined,
                        lastLoginAt: new Date(),
                        ...(isGoogle ? { emailVerified: true } : {}),
                    },
                    select: { id: true, level: true },
                });

                // Promote to level 1 (email verified) without downgrading KYC
                if (isGoogle && profile.level < 1) {
                    await prisma.userProfile.update({
                        where: { id: profile.id },
                        data:  { level: 1 },
                    });
                }

                // Keep only the last 10 login events
                await prisma.loginEvent.create({ data: { profileId: profile.id } });
                const old = await prisma.loginEvent.findMany({
                    where:   { profileId: profile.id },
                    orderBy: { createdAt: "desc" },
                    skip:    10,
                    select:  { id: true },
                });
                if (old.length > 0) {
                    await prisma.loginEvent.deleteMany({ where: { id: { in: old.map(e => e.id) } } });
                }
            } catch {
                /* Don't block sign-in on DB errors */
            }
            return true;
        },

        // ── jwt: embed profile flags — re-fetch while onboarding incomplete ──
        async jwt({ token, trigger }) {
            const shouldRefresh = trigger === "signIn" || trigger === "update" || !token.onboardingDone;
            if (shouldRefresh && token.email) {
                try {
                    const p = await prisma.userProfile.findUnique({
                        where:  { email: token.email as string },
                        select: {
                            onboardingDone: true,
                            humoId:         true,
                            username:       true,
                            isAdmin:        true,
                        },
                    });
                    token.onboardingDone = p?.onboardingDone ?? false;
                    token.humoId         = p?.humoId         ?? null;
                    token.username       = p?.username       ?? null;
                    token.isAdmin        = p?.isAdmin        ?? false;
                } catch {
                    token.onboardingDone = token.onboardingDone ?? false;
                }
            }
            return token;
        },

        // ── session: expose JWT fields to client ─────────────────────────────
        async session({ session, token }) {
            if (session.user) {
                // @ts-ignore — extended fields
                session.user.id            = token.sub;
                // @ts-ignore
                session.user.onboardingDone = token.onboardingDone as boolean;
                // @ts-ignore
                session.user.humoId        = token.humoId   as string | null;
                // @ts-ignore
                session.user.username      = token.username as string | null;
                // @ts-ignore
                session.user.isAdmin       = token.isAdmin  as boolean;
            }
            return session;
        },
    },
};
