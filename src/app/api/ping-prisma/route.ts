// Prisma test - faqat prisma import qiladi
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
    try {
        const { prisma } = await import("@/lib/prisma");
        const count = await prisma.userProfile.count();
        return new Response(JSON.stringify({ ok: true, userCount: count }), {
            status: 200,
            headers: { "Content-Type": "application/json" },
        });
    } catch (e) {
        const msg = e instanceof Error ? `${e.name}: ${e.message}` : String(e);
        return new Response(JSON.stringify({ error: "prisma_crash", message: msg }), {
            status: 500,
            headers: { "Content-Type": "application/json" },
        });
    }
}
