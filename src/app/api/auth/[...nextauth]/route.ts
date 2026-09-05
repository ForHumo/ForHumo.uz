// NextAuth v4 App Router - explicit Node runtime + debug wrapping.

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

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
        const msg = e instanceof Error ? `${e.name}: ${e.message}\n${e.stack?.slice(0, 500)}` : String(e);
        console.error("[nextauth handler crash]", msg);
        return new Response(
            JSON.stringify({ error: "auth_handler_crash", message: msg }),
            { status: 500, headers: { "Content-Type": "application/json" } },
        );
    }
}

export { handler as GET, handler as POST };
