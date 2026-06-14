import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getMyProfile, isEsportOwner } from "@/lib/esport";

// GET /api/esport/admin/check — joriy foydalanuvchi admin/egami (navbar uchun)
export async function GET() {
    const me = await getMyProfile();
    if (!me) return NextResponse.json({ isAdmin: false, isOwner: false });
    const isOwner = isEsportOwner(me);
    let isAdmin = isOwner;
    if (!isAdmin && me.humoId) {
        const adm = await prisma.esAdmin.findUnique({ where: { humoId: me.humoId }, select: { id: true } });
        isAdmin = !!adm;
    }
    return NextResponse.json({ isAdmin, isOwner });
}
