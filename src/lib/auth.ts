import type { NextAuthOptions } from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import { prisma } from "@/lib/prisma";

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
                    // Google profil rasmini saqlash (boshqalar sharh/brendlarda ko'rishi uchun).
                    // Faqat hali avatar bo'lmasa — qo'lda yuklangan avatarni qoplamaymiz.
                    if (user.image && !profile.image) {
                        await prisma.userProfile.update({
                            where: { id: profile.id },
                            data:  { image: user.image },
                        });
                    }
                    // Promote to level 1 (email verified) without downgrading KYC users
                    if (isGoogle && profile.level < 1) {
                        await prisma.userProfile.update({
                            where: { id: profile.id },
                            data:  { level: 1 },
                        });
                    }
                    // Keep last 10 login events per user
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
        async jwt({ token, trigger }) {
            if (trigger === "signIn" || trigger === "update" || !token.onboardingDone || token.coverImage === undefined) {
                if (token.email) {
                    try {
                        const profile = await prisma.userProfile.findUnique({
                            where: { email: token.email as string },
                            select: { onboardingDone: true, humoId: true, username: true, coverImage: true },
                        });
                        token.onboardingDone = profile?.onboardingDone ?? false;
                        token.humoId        = profile?.humoId        ?? null;
                        token.username      = profile?.username       ?? null;
                        token.coverImage    = profile?.coverImage     ?? null;
                    } catch {
                        token.onboardingDone = token.onboardingDone ?? false;
                    }
                }
            }
            return token;
        },

        async session({ session, token }) {
            if (session.user) {
                // @ts-ignore
                session.user.id             = token.sub;
                // @ts-ignore
                session.user.onboardingDone = token.onboardingDone as boolean;
                // @ts-ignore
                session.user.humoId         = token.humoId as string | null;
                // @ts-ignore
                session.user.username       = token.username  as string | null;
                // @ts-ignore
                session.user.coverImage     = token.coverImage as string | null;
            }
            return session;
        },
    },
};
