import type { NextAuthOptions } from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import { headers } from "next/headers";
import crypto from "crypto";
import { prisma } from "@/lib/prisma";
import { isJtiRevoked, bumpLastSeenAt } from "@/lib/auth-session-cache";

export const authOptions: NextAuthOptions = {
    providers: [
        GoogleProvider({
            clientId: process.env.GOOGLE_CLIENT_ID!,
            clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
        }),
    ],
    pages: {
        signIn: "/",
    },
    callbacks: {
        // On every sign-in: upsert UserProfile, record login event
        async signIn({ user, account }) {
            if (user.email) {
                try {
                    const isGoogle = account?.provider === "google";
                    const profile = await prisma.userProfile.upsert({
                        where: { email: user.email },
                        create: {
                            email: user.email,
                            googleId: user.id ?? null,
                            accountType: "GOOGLE",
                            name: user.name ?? null,
                            image: user.image ?? null,
                            emailVerified: isGoogle,
                            lastLoginAt: new Date(),
                        },
                        update: {
                            googleId: user.id ?? undefined,
                            lastLoginAt: new Date(),
                            ...(isGoogle ? { emailVerified: true } : {}),
                        },
                        select: { id: true, level: true, image: true },
                    });
                    if (user.image && !profile.image) {
                        await prisma.userProfile.update({
                            where: { id: profile.id },
                            data:  { image: user.image },
                        });
                    }
                    if (isGoogle && profile.level < 1) {
                        await prisma.userProfile.update({
                            where: { id: profile.id },
                            data:  { level: 1 },
                        });
                    }
                    await prisma.loginEvent.create({
                        data: { profileId: profile.id },
                    });
                    const events = await prisma.loginEvent.findMany({
                        where: { profileId: profile.id },
                        orderBy: { createdAt: "desc" },
                        skip: 10,
                        select: { id: true },
                    });
                    if (events.length > 0) {
                        await prisma.loginEvent.deleteMany({
                            where: { id: { in: events.map(e => e.id) } },
                        });
                    }
                } catch {
                    // Don't block sign-in on DB errors
                }
            }
            return true;
        },

        // Embed onboardingDone into the JWT so AuthBarrier needs no extra fetch.
        // Re-fetch from DB while onboardingDone is still false so that a plain
        // page reload after wizard completion sees the updated value immediately.
        //
        // Multi-device: `jti` yaratiladi va AuthSession jadvaliga yoziladi. Har
        // request'da bu jti revoked emasligi tekshiriladi (60s cache).
        async jwt({ token, trigger }) {
            if (trigger === "signIn" || trigger === "update" || !token.onboardingDone || token.coverImage === undefined) {
                if (token.email) {
                    try {
                        const profile = await prisma.userProfile.findUnique({
                            where: { email: token.email as string },
                            select: { id: true, onboardingDone: true, humoId: true, username: true, coverImage: true },
                        });
                        token.profileId     = profile?.id             ?? null;
                        token.onboardingDone = profile?.onboardingDone ?? false;
                        token.humoId        = profile?.humoId        ?? null;
                        token.username      = profile?.username       ?? null;
                        token.coverImage    = profile?.coverImage     ?? null;
                    } catch {
                        token.onboardingDone = token.onboardingDone ?? false;
                    }
                }
            }

            // Multi-device: signIn'da jti yaratamiz va AuthSession yozamiz.
            // Backfill: eski JWT'larda jti bo'lmasa ham yaratamiz (bir marta),
            // toki sessiya multi-device panelida ko'rinsin va bekor qilish mumkin bo'lsin.
            if (!token.jti && token.profileId && typeof token.profileId === "string") {
                const jti = crypto.randomBytes(16).toString("hex");
                try {
                    const h = await headers();
                    const ua = h.get("user-agent")?.slice(0, 200) ?? null;
                    const ip = h.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null;
                    await prisma.authSession.create({
                        data: { jti, profileId: token.profileId, deviceHint: ua, ipHint: ip, origin: trigger === "signIn" ? "google" : "backfill" },
                    });
                    token.jti = jti;
                } catch {
                    // fallback: jti yozilmasa ham sessiya ishlaydi
                }
            }

            // Revocation tekshiruv — jti bor bo'lsa
            if (token.jti && typeof token.jti === "string") {
                const revoked = await isJtiRevoked(token.jti);
                if (revoked) {
                    // Bo'sh token qaytarish → NextAuth foydalanuvchini chiqarib yuboradi
                    return {};
                }
                // Non-blocking lastSeenAt bump (throttled)
                void bumpLastSeenAt(token.jti);
            }

            return token;
        },

        async session({ session, token }) {
            if (session.user) {
                // @ts-ignore
                session.user.id             = token.sub;
                // @ts-ignore
                session.user.profileId      = token.profileId as string | null;
                // @ts-ignore
                session.user.onboardingDone = token.onboardingDone as boolean;
                // @ts-ignore
                session.user.humoId         = token.humoId as string | null;
                // @ts-ignore
                session.user.username       = token.username  as string | null;
                // @ts-ignore
                session.user.coverImage     = token.coverImage as string | null;
                // @ts-ignore
                session.user.jti            = token.jti as string | null;
            }
            return session;
        },
    },
};
