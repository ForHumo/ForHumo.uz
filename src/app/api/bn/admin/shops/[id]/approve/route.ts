import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireBnAuth } from "@/lib/bn-auth";

export async function POST(
    _req: Request,
    { params }: { params: Promise<{ id: string }> },
) {
    const auth = await requireBnAuth();
    if (auth instanceof NextResponse) return auth;
    const admin = await prisma.bnAdmin.findUnique({
        where: { profileId: auth.profileId }, select: { role: true },
    });
    if (admin?.role !== "OWNER" && admin?.role !== "MODERATOR") {
        return NextResponse.json({ error: "forbidden" }, { status: 403 });
    }

    const { id } = await params;
    const shop = await prisma.bnShop.findUnique({ where: { id } });
    if (!shop) return NextResponse.json({ error: "not_found" }, { status: 404 });
    if (shop.status === "APPROVED") return NextResponse.json({ ok: true, alreadyApproved: true });

    const updated = await prisma.bnShop.update({
        where: { id },
        data: {
            status: "APPROVED",
            approvedAt: new Date(),
            approvedById: auth.profileId,
            phoneVerified: true,
            rejectReason: null,
        },
    });

    return NextResponse.json({ ok: true, shop: updated });
}
