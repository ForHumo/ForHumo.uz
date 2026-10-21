// YukGo — e'lon kontaktini ochish (GATED + monetizatsiya).
// Login SHART. Bepul: kuniga YUKGO_FREE_CONTACTS (default 10) kontakt.
// Pro (YukDriver.subActiveUntil > now): cheksiz. Limitdan oshsa → 402.
// GET /api/yukgo/listings/[id]/contact → { phones, sourceLink, pro }

import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

const FREE_PER_DAY = Number(process.env.YUKGO_FREE_CONTACTS || 10);
const DAY_MS = 24 * 60 * 60 * 1000;

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) return NextResponse.json({ error: "auth_required" }, { status: 401 });
    const me = await prisma.userProfile.findUnique({ where: { email: session.user.email }, select: { id: true } });
    if (!me) return NextResponse.json({ error: "profile_not_found" }, { status: 404 });

    const { id } = await params;
    const listing = await prisma.yukListing.findFirst({
        where: { id, status: "ACTIVE" },
        select: { phones: true, sourceLink: true },
    });
    if (!listing) return NextResponse.json({ error: "not_found" }, { status: 404 });

    // Pro obuna?
    const driver = await prisma.yukDriver.findUnique({ where: { profileId: me.id }, select: { subActiveUntil: true } });
    const pro = !!(driver?.subActiveUntil && driver.subActiveUntil > new Date());

    // Bu e'lon allaqachon ochilganmi — qayta ko'rish bepul (limitga sanalmaydi)
    const seen = await prisma.yukContactView.findUnique({
        where: { profileId_listingId: { profileId: me.id, listingId: id } }, select: { id: true },
    });

    if (!pro && !seen) {
        const used = await prisma.yukContactView.count({
            where: { profileId: me.id, createdAt: { gt: new Date(Date.now() - DAY_MS) } },
        });
        if (used >= FREE_PER_DAY) {
            return NextResponse.json({ error: "limit", limit: FREE_PER_DAY }, { status: 402 });
        }
    }
    if (!seen) {
        await prisma.yukContactView.create({ data: { profileId: me.id, listingId: id } }).catch(() => { });
    }

    return NextResponse.json({ phones: listing.phones, sourceLink: listing.sourceLink, pro });
}
