import { NextResponse } from "next/server";
import { requireFounder } from "@/lib/admin-guard";
import { prisma } from "@/lib/prisma";

// GET /api/admin/bn-sellers — PENDING sellerlar (approve navbati)
export async function GET() {
    const founder = await requireFounder();
    if (!founder) return NextResponse.json({ error: "Ruxsat yo'q" }, { status: 403 });

    const pending = await prisma.bnSeller.findMany({
        where: { status: "PENDING" }, orderBy: { createdAt: "asc" }, take: 100,
    });
    const ids = [...new Set(pending.map(s => s.profileId))];
    const profs = ids.length
        ? await prisma.userProfile.findMany({ where: { id: { in: ids } }, select: { id: true, name: true, username: true, image: true, humoId: true } })
        : [];
    const pMap = Object.fromEntries(profs.map(p => [p.id, p]));

    return NextResponse.json({
        sellers: pending.map(s => ({ ...s, applicant: pMap[s.profileId] ?? null })),
    });
}

// POST /api/admin/bn-sellers — sellerni tasdiqlash yoki rad etish
// body: { sellerId: string, action: "approve" | "reject", reason?: string }
export async function POST(req: Request) {
    const founder = await requireFounder();
    if (!founder) return NextResponse.json({ error: "Ruxsat yo'q" }, { status: 403 });

    const { sellerId, action, reason } = (await req.json()) as { sellerId?: string; action?: string; reason?: string };
    if (!sellerId || (action !== "approve" && action !== "reject")) {
        return NextResponse.json({ error: "Noto'g'ri parametrlar" }, { status: 400 });
    }

    const seller = await prisma.bnSeller.findUnique({ where: { id: sellerId }, select: { id: true, status: true } });
    if (!seller) return NextResponse.json({ error: "Seller topilmadi" }, { status: 404 });

    if (action === "approve") {
        await prisma.bnSeller.update({
            where: { id: sellerId },
            data: { status: "APPROVED", approvedAt: new Date(), approvedById: founder.id },
        });
        return NextResponse.json({ ok: true, status: "APPROVED" });
    }

    await prisma.bnSeller.update({
        where: { id: sellerId },
        data: { status: "REJECTED", rejectReason: (reason || "").slice(0, 500) || "Ariza rad etildi", approvedById: founder.id, approvedAt: new Date() },
    });
    return NextResponse.json({ ok: true, status: "REJECTED" });
}
