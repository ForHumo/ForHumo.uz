// Minimal health check - hech qanday import qilmaydi
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
    return new Response(JSON.stringify({
        ok: true,
        env_nextauth_url: process.env.NEXTAUTH_URL || "not_set",
        env_nextauth_secret_len: (process.env.NEXTAUTH_SECRET || "").length,
        env_database_url_prefix: (process.env.DATABASE_URL || "").slice(0, 20),
        env_google_client_id_len: (process.env.GOOGLE_CLIENT_ID || "").length,
        node_env: process.env.NODE_ENV,
        vercel: process.env.VERCEL || "no",
    }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
    });
}
