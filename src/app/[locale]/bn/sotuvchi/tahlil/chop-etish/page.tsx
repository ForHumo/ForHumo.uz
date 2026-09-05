import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { getBnAuth } from "@/lib/bn-auth";
import { prisma } from "@/lib/prisma";
import { BnSellerAnalyticsPrint } from "@/components/bn/bn-seller-analytics-print";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
    title: "Tahlil hisoboti",
    robots: { index: false, follow: false },
};

const BN_HOSTS = ["bozornarxida.uz", "www.bozornarxida.uz"];

export default async function Page({ params }: { params: Promise<{ locale: string }> }) {
    const { locale } = await params;
    const host = (await headers()).get("host")?.split(":")[0].toLowerCase() ?? "";
    const base = BN_HOSTS.includes(host) ? "" : `/${locale}/bn`;

    const auth = await getBnAuth();
    if (!auth) redirect(`${base}/kabinet`);
    const shop = await prisma.bnShop.findFirst({
        where: { profileId: auth!.profileId },
        select: { id: true, name: true, status: true, phone: true, city: true },
    });
    if (!shop || shop.status !== "APPROVED") redirect(`${base}/kabinet`);

    return <BnSellerAnalyticsPrint shopName={shop.name} shopCity={shop.city} shopPhone={shop.phone} />;
}
