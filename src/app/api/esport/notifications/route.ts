import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getMyProfile } from "@/lib/esport";

// GET /api/esport/notifications — mening bildirishnomalarim + o'qilmaganlar soni
export async function GET() {
    const me = await getMyProfile();
    if (!me) return NextResponse.json({ items: [], unread: 0 });
    const [items, unread] = await Promise.all([
        prisma.esNotification.findMany({ where: { profileId: me.id }, orderBy: { createdAt: "desc" }, take: 30 }),
        prisma.esNotification.count({ where: { profileId: me.id, read: false } }),
    ]);
    return NextResponse.json({ items, unread });
}

// POST /api/esport/notifications — o'qilgan deb belgilash { id? } (id bo'lmasa hammasi)
export async function POST(req: Request) {
    const me = await getMyProfile();
    if (!me) return NextResponse.json({ error: "Avval tizimga kiring" }, { status: 401 });
    const b = await req.json().catch(() => ({}));
    if (b.id) await prisma.esNotification.updateMany({ where: { id: b.id, profileId: me.id }, data: { read: true } });
    else await prisma.esNotification.updateMany({ where: { profileId: me.id, read: false }, data: { read: true } });
    return NextResponse.json({ ok: true });
}
