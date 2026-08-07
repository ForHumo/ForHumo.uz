import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { BnAdminClient, type AdminShopRow } from "@/components/bn/bn-admin-client";
import { getBnAuth } from "@/lib/bn-auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "BN Admin", robots: { index: false, follow: false } };

export default async function Page() {
    const auth = await getBnAuth();
    if (!auth) notFound();
    const admin = await prisma.bnAdmin.findUnique({
        where: { profileId: auth.profileId }, select: { role: true },
    });
    if (admin?.role !== "OWNER" && admin?.role !== "MODERATOR") notFound();

    const shops = await prisma.bnShop.findMany({
        orderBy: { createdAt: "desc" },
        take: 200,
        include: { market: { select: { slug: true, name: true } } },
    });
    const profileIds = shops.map(s => s.profileId);
    const profiles = profileIds.length ? await prisma.userProfile.findMany({
        where: { id: { in: profileIds } },
        select: { id: true, email: true, name: true, username: true, humoId: true },
    }) : [];
    const byId = new Map(profiles.map(p => [p.id, p]));

    const initial: AdminShopRow[] = shops.map(s => ({
        id: s.id,
        slug: s.slug,
        name: s.name,
        status: s.status,
        tier: s.tier,
        legalType: s.legalType,
        legalName: s.legalName,
        innNumber: s.innNumber,
        phone: s.phone,
        locationType: s.locationType,
        marketName: s.market?.name ?? null,
        marketSection: s.marketSection,
        marketShopNo: s.marketShopNo,
        address: s.address,
        city: s.city,
        bankName: s.bankName,
        bankAccount: s.bankAccount,
        bankMfo: s.bankMfo,
        createdAt: s.createdAt.toISOString(),
        rejectReason: s.rejectReason,
        profile: byId.get(s.profileId) ?? null,
    }));

    return <BnAdminClient initial={initial} />;
}
