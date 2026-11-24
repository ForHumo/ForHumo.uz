import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getEsportAdmin } from "@/lib/esport";

// GET /api/esport/admin/verify — tasdiq kutayotgan MLBB kod-isbotlar + BLOK akkauntlar (admin)
export async function GET() {
    if (!await getEsportAdmin()) return NextResponse.json({ error: "Faqat adminlar" }, { status: 403 });

    const [pending, flagged] = await Promise.all([
        prisma.esGameAccount.findMany({
            where: { platform: "MOONTON", verified: false, proofCode: { not: null } },
            orderBy: { createdAt: "desc" },
            select: {
                id: true, externalId: true, proofCode: true, proofExpires: true, createdAt: true,
                athlete: { select: { ign: true, gameUserId: true, gameServer: true, game: { select: { name: true } } } },
            },
        }),
        prisma.esGameAccount.findMany({
            where: { verdict: "BLOK" },
            orderBy: { lastCheckedAt: "desc" },
            select: {
                id: true, platform: true, externalId: true, handle: true, verdict: true, snapshot: true,
                athlete: { select: { ign: true, game: { select: { name: true } } } },
            },
        }),
    ]);

    return NextResponse.json({ pending, flagged });
}

// POST /api/esport/admin/verify — MLBB kod-isbotini tasdiqlash/rad etish { accountId, action: "approve"|"reject" }
export async function POST(req: Request) {
    if (!await getEsportAdmin()) return NextResponse.json({ error: "Faqat adminlar" }, { status: 403 });

    const body = await req.json().catch(() => ({}));
    const accountId = String(body.accountId || "");
    const action = String(body.action || "");
    if (!accountId) return NextResponse.json({ error: "accountId kerak" }, { status: 400 });

    const acc = await prisma.esGameAccount.findUnique({ where: { id: accountId }, select: { id: true, platform: true } });
    if (!acc) return NextResponse.json({ error: "Akkaunt topilmadi" }, { status: 404 });
    if (acc.platform !== "MOONTON") return NextResponse.json({ error: "Faqat MLBB kod-isboti qo'lda tasdiqlanadi" }, { status: 400 });

    if (action === "approve") {
        await prisma.esGameAccount.update({
            where: { id: accountId },
            data: { verified: true, verdict: "TOZA", proofCode: null, proofExpires: null, lastCheckedAt: new Date() },
        });
    } else if (action === "reject") {
        await prisma.esGameAccount.update({
            where: { id: accountId },
            data: { proofCode: null, proofExpires: null, lastCheckedAt: new Date() },
        });
    } else {
        return NextResponse.json({ error: "action: approve yoki reject" }, { status: 400 });
    }

    return NextResponse.json({ ok: true });
}
