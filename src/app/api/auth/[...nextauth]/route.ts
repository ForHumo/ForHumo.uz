import NextAuth from "next-auth";
import { authOptions } from "@/lib/auth";

// Multi-domain auth: har request'ning o'z host'ini NEXTAUTH_URL sifatida ishlatamiz.
// forhumo.uz, belis.uz, bozornarxida.uz — har biri o'z callback URL + sessiya cookie'si bilan.
//
// MUHIM: NextAuth handler'ni module scope'da bir marta yaratamiz. Har request uchun qayta
// yaratish Vercel serverless'da internal state buzilishiga olib keladi (500 xato).
const nextAuthHandler = NextAuth(authOptions);

async function handler(req: Request, ctx: unknown) {
    // x-forwarded-host — Vercel proxy chun; oldingi holatda ba'zi hostlar to'g'ri kelmasdi
    const host = req.headers.get("x-forwarded-host") ?? req.headers.get("host");
    const proto = req.headers.get("x-forwarded-proto") ?? "https";
    if (host) {
        // Vercel serverless — har request alohida cold funksiya, process.env mutation xavfsiz
        process.env.NEXTAUTH_URL = `${proto}://${host}`;
        process.env.NEXTAUTH_URL_INTERNAL = `${proto}://${host}`;
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return (nextAuthHandler as any)(req, ctx);
}

export { handler as GET, handler as POST };
