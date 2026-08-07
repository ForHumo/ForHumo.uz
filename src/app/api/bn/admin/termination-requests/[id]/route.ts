// So'rovga qaror: OWNER APPROVE (terminate ishga tushadi) yoki REJECT.
//
//   PATCH /api/bn/admin/termination-requests/:id  { decision: "APPROVE"|"REJECT", note? }

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireBnAuth } from "@/lib/bn-auth";
import { isBnOwner } from "@/lib/bn-admin";
import { terminateShop } from "@/lib/bn-ban";

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
    const auth = await requireBnAuth();
    if (auth instanceof NextResponse) return auth;
    if (!(await isBnOwner(auth.profileId))) {
        return NextResponse.json({ error: "forbidden" }, { status: 403 });
    }
    const { id } = await params;
    const b = await req.json().catch(() => ({}));
    const decision = b?.decision === "APPROVE" ? "APPROVE" : "REJECT";
    const note = typeof b?.note === "string" ? b.note.slice(0, 300) : null;

    const request = await prisma.bnTerminationRequest.findUnique({ where: { id } });
    if (!request) return NextResponse.json({ error: "not_found" }, { status: 404 });
    if (request.status !== "PENDING") return NextResponse.json({ error: "already_decided" }, { status: 409 });

    if (decision === "APPROVE") {
        await terminateShop(request.shopId, {
            reason: `Approval so'rovi #${id.slice(-6)}: ${request.reason}`,
            decidedBy: "OWNER",
            decidedById: auth.profileId,
        });
    }
    const updated = await prisma.bnTerminationRequest.update({
        where: { id },
        data: {
            status: decision === "APPROVE" ? "APPROVED" : "REJECTED",
            decidedById: auth.profileId,
            decidedAt: new Date(),
            decisionNote: note,
        },
    });
    return NextResponse.json({ ok: true, request: updated });
}
