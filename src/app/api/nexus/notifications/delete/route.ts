// POST /api/nexus/notifications/delete — bitta yoki barchasini o'chirish
//   body: { id?: string, all?: boolean }
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(req: Request) {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) return NextResponse.json({ error: "auth" }, { status: 401 });
    const me = await prisma.userProfile.findUnique({ where: { email: session.user.email }, select: { id: true } });
    if (!me) return NextResponse.json({ error: "no_profile" }, { status: 404 });

    const body = await req.json().catch(() => ({}));
    if (body?.all === true) {
        const r = await prisma.nexusNotification.deleteMany({ where: { recipientId: me.id } });
        return NextResponse.json({ ok: true, count: r.count });
    }
    if (typeof body?.id !== "string" || !body.id) return NextResponse.json({ error: "id_required" }, { status: 400 });

    // Faqat egasi o'chira oladi
    await prisma.nexusNotification.deleteMany({ where: { id: body.id, recipientId: me.id } });
    return NextResponse.json({ ok: true });
}
