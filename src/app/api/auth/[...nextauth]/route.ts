import NextAuth from "next-auth";
import { authOptions } from "@/lib/auth";

// Multi-domain: har request'ning o'z host'ini NEXTAUTH_URL sifatida ishlatamiz.
// forhumo.uz, belis.uz, bozornarxida.uz — har biri o'z callback URL'i + sessiya cookie'si bilan.
// Vercel serverless funksiyalari bir vaqtda bitta request'ni ishlaydi — process.env mutation xavfsiz.
async function handler(req: Request, ctx: unknown) {
    const url = new URL(req.url);
    const host = req.headers.get("x-forwarded-host") ?? req.headers.get("host") ?? url.host;
    const proto = req.headers.get("x-forwarded-proto") ?? "https";
    process.env.NEXTAUTH_URL = `${proto}://${host}`;
    return NextAuth(authOptions)(req as never, ctx as never);
}

export { handler as GET, handler as POST };
