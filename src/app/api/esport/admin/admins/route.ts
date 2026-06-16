import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getEsportOwner, isEsportOwner, fullName } from "@/lib/esport";

// GET /api/esport/admin/admins — adminlar ro'yxati (faqat ega)
export async function GET() {
    if (!await getEsportOwner()) return NextResponse.json({ error: "Faqat ega" }, { status: 403 });
    const admins = await prisma.esAdmin.findMany({ orderBy: { createdAt: "desc" } });
    const profs = admins.length
        ? await prisma.userProfile.findMany({ where: { humoId: { in: admins.map(a => a.humoId) } }, select: { humoId: true, firstName: true, lastName: true, name: true, username: true, image: true } })
        : [];
    const pMap = Object.fromEntries(profs.map(p => [p.humoId, p]));
    return NextResponse.json({
        admins: admins.map(a => {
            const p = pMap[a.humoId];
            return { humoId: a.humoId, name: p ? fullName(p) : null, username: p?.username ?? null, image: p?.image ?? null, createdAt: a.createdAt };
        }),
    });
}

// POST /api/esport/admin/admins — admin qo'shish (faqat ega) { humoId }
export async function POST(req: Request) {
    const owner = await getEsportOwner();
    if (!owner) return NextResponse.json({ error: "Faqat ega" }, { status: 403 });
    const { humoId } = await req.json();
    const id = String(humoId || "").trim().toUpperCase();
    if (!/^UZ\d{7}$/.test(id)) return NextResponse.json({ error: "Humo ID formati: UZ + 7 raqam" }, { status: 400 });

    const user = await prisma.userProfile.findUnique({ where: { humoId: id }, select: { id: true, firstName: true, lastName: true, name: true } });
    if (!user) return NextResponse.json({ error: "Bu Humo ID topilmadi" }, { status: 404 });
    if (isEsportOwner({ humoId: id })) return NextResponse.json({ error: "Bu allaqachon ega" }, { status: 400 });

    try {
        await prisma.esAdmin.create({ data: { humoId: id, createdBy: owner.humoId ?? "" } });
    } catch {
        return NextResponse.json({ error: "Allaqachon admin" }, { status: 409 });
    }
    return NextResponse.json({ ok: true, name: fullName(user) });
}

// DELETE /api/esport/admin/admins — admin olib tashlash (faqat ega) { humoId }
export async function DELETE(req: Request) {
    if (!await getEsportOwner()) return NextResponse.json({ error: "Faqat ega" }, { status: 403 });
    const { humoId } = await req.json().catch(() => ({}));
    if (!humoId) return NextResponse.json({ error: "humoId kerak" }, { status: 400 });
    await prisma.esAdmin.deleteMany({ where: { humoId: String(humoId).trim().toUpperCase() } });
    return NextResponse.json({ ok: true });
}
