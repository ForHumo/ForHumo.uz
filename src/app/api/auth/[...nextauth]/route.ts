import NextAuth from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import CredentialsProvider from "next-auth/providers/credentials";

const handler = NextAuth({
    providers: [
        GoogleProvider({
            clientId: process.env.GOOGLE_CLIENT_ID!,
            clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
        }),
        {
            id: "telegram",
            name: "Telegram",
            type: "oauth",
            clientId: process.env.TELEGRAM_CLIENT_ID!,
            clientSecret: process.env.TELEGRAM_CLIENT_SECRET!,
            wellKnown: "https://oauth.telegram.org/.well-known/openid-configuration",
            authorization: { params: { scope: "openid profile" } },
            idToken: true,
            checks: ["pkce", "state"],
            profile(profile) {
                return {
                    id: profile.sub,
                    name: profile.name || profile.preferred_username || "Telegram User",
                    email: `${profile.preferred_username || profile.sub}@telegram.user`,
                    image: profile.picture,
                }
            },
        }
    ],
    pages: {
        signIn: "/", // We will handle sign-in on the home page via AuthBarrier
    },
    callbacks: {
        async session({ session, token }) {
            if (session.user) {
                // @ts-ignore
                session.user.id = token.sub;
            }
            return session;
        },
    },
});

export { handler as GET, handler as POST };
