import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { getBnAuth } from "@/lib/bn-auth";
import { prisma } from "@/lib/prisma";
import { BnSellerAnalytics } from "@/components/bn/bn-seller-analytics";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
    title: "Sotuvchi tahlili",
    robots: { index: false, follow: false },
    description: "Do'koningiz reytinglari, sotilmagan mahsulotlar va AI tavsiyalari.",
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
        select: { id: true, name: true, status: true },
    });
    if (!shop) redirect(`${base}/sotuvchi/waitlist`);
    if (shop.status !== "APPROVED") redirect(`${base}/kabinet`);

    return <BnSellerAnalytics shopName={shop.name} />;
}
