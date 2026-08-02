import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireFounder } from "@/lib/admin-guard";

// GET /api/admin/kyc?status=PENDING — admin KYC navbati (founder-only)
export async function GET(req: Request) {
    const founder = await requireFounder();
    if (!founder) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const url = new URL(req.url);
    const status = url.searchParams.get("status") as "PENDING" | "APPROVED" | "REJECTED" | null;

    const items = await prisma.userKyc.findMany({
        where: status ? { status } : undefined,
        orderBy: { submittedAt: "asc" },
        take: 100,
    });

    // Har biriga foydalanuvchi
    const profileIds = items.map(i => i.profileId);
    const profiles = await prisma.userProfile.findMany({
        where: { id: { in: profileIds } },
        select: { id: true, name: true, username: true, humoId: true, image: true, phone: true },
    });
    const byId = new Map(profiles.map(p => [p.id, p]));

    return NextResponse.json({
        items: items.map(k => ({
            id: k.id, status: k.status, submittedAt: k.submittedAt,
            passportUrl: k.passportUrl, selfieUrl: k.selfieUrl,
            rejectReason: k.rejectReason,
            profile: byId.get(k.profileId) || null,
        })),
    });
}

// POST /api/admin/kyc — tasdiqlash/rad etish
// body: { kycId, action: "approve"|"reject", reason? }
export async function POST(req: Request) {
    const founder = await requireFounder();
    if (!founder) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const { kycId, action, reason } = (await req.json()) as { kycId: string; action: "approve" | "reject"; reason?: string };
    if (!kycId || !["approve", "reject"].includes(action)) {
        return NextResponse.json({ error: "Noto'g'ri ma'lumot" }, { status: 400 });
    }
    const kyc = await prisma.userKyc.findUnique({ where: { id: kycId } });
    if (!kyc) return NextResponse.json({ error: "Topilmadi" }, { status: 404 });
    if (kyc.status !== "PENDING") return NextResponse.json({ error: "Allaqachon ko'rilgan" }, { status: 400 });

    if (action === "approve") {
        await prisma.$transaction([
            prisma.userKyc.update({
                where: { id: kycId },
                data: { status: "APPROVED", reviewedAt: new Date(), reviewedById: founder.id },
            }),
            prisma.userProfile.update({ where: { id: kyc.profileId }, data: { level: 2 } }),
        ]);
    } else {
        await prisma.userKyc.update({
            where: { id: kycId },
            data: { status: "REJECTED", reviewedAt: new Date(), reviewedById: founder.id, rejectReason: reason?.trim() || "Ma'lumotlar aniq emas" },
        });
    }
    return NextResponse.json({ ok: true });
}
