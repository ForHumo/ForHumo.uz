// NextAuth v4 App Router - eng oddiy pattern.
// Multi-domain uchun NEXTAUTH_URL har request'da yangilanadi.

import NextAuth from "next-auth";
import { authOptions } from "@/lib/auth";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function handler(req: Request, ctx: any) {
    try {
        const host = req.headers.get("x-forwarded-host") ?? req.headers.get("host");
        const proto = req.headers.get("x-forwarded-proto") ?? "https";
        if (host) {
            process.env.NEXTAUTH_URL = `${proto}://${host}`;
        }
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        return await (NextAuth(authOptions) as any)(req, ctx);
    } catch (e) {
        console.error("[nextauth handler]", e);
        // Debug uchun error matnini qaytaramiz (production'da 500 sahifa chiqmaydi)
        const msg = e instanceof Error ? `${e.name}: ${e.message}` : String(e);
        return new Response(
            JSON.stringify({ error: "auth_handler_crash", message: msg }),
            { status: 500, headers: { "Content-Type": "application/json" } },
        );
    }
}

export { handler as GET, handler as POST };
