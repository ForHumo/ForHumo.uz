import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getEsportAdmin } from "@/lib/esport";
import { esNotify } from "@/lib/esport-notify";
import { PERMANENT_BLOCK } from "@/lib/esport-block";

// POST /api/esport/admin/athletes/[id]/block — sportchini bloklash/yechish (admin)
// { until: ISO sana | "permanent" | null (null = blokdan chiqarish), reason? }
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
    if (!await getEsportAdmin()) return NextResponse.json({ error: "Ruxsat yo'q" }, { status: 403 });
    const { id } = await params;
    const athlete = await prisma.esAthlete.findUnique({ where: { id }, select: { id: true, humoProfileId: true } });
    if (!athlete) return NextResponse.json({ error: "Sportchi topilmadi" }, { status: 404 });

    const b = await req.json().catch(() => ({}));
    const reason = typeof b.reason === "string" && b.reason.trim() ? b.reason.trim().slice(0, 300) : null;

    // Blokdan chiqarish
    if (b.until === null || b.until === undefined || b.until === "") {
        await prisma.esAthlete.update({ where: { id }, data: { blockedUntil: null, blockReason: null } });
        await esNotify(athlete.humoProfileId, { type: "UNBLOCK", title: "Blokdan chiqarildingiz", body: "Hisobingiz kibersportda qayta faollashtirildi", href: "/esport" });
        return NextResponse.json({ ok: true, blocked: false });
    }

    // Bloklash
    let until: Date;
    if (b.until === "permanent") until = PERMANENT_BLOCK;
    else {
        until = new Date(b.until);
        if (isNaN(until.getTime()) || until.getTime() <= Date.now()) return NextResponse.json({ error: "Muddat kelajakda bo'lishi kerak" }, { status: 400 });
    }
    await prisma.esAthlete.update({ where: { id }, data: { blockedUntil: until, blockReason: reason } });
    const perm = until.getTime() >= PERMANENT_BLOCK.getTime();
    await esNotify(athlete.humoProfileId, {
        type: "BLOCK",
        title: "Bloklandingiz",
        body: (reason ? reason + " — " : "") + (perm ? "Abadiy bloklandingiz" : `Bloklangansiz: ${until.toLocaleDateString()}gacha`),
        href: "/esport",
    });
    return NextResponse.json({ ok: true, blocked: true, blockedUntil: until });
}
