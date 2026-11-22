import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { bnPageMeta } from "@/lib/bn-seo";
import { redirect } from "next/navigation";
import { BnSellerRegister } from "@/components/bn/bn-seller-register";
import { getMarkets } from "@/lib/bn-data";
import { getBnAuth } from "@/lib/bn-auth";
import { prisma } from "@/lib/prisma";
import { headers } from "next/headers";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
    const { locale } = await params;
    const t = await getTranslations({ locale, namespace: "bn" });
    const title = t("seller.become");
    const description = t("seo.sellerDesc");
    return { title, description, ...bnPageMeta({ locale, path: "/sotuvchi", title, description }) };
}

const BN_HOSTS = ["bozornarxida.uz", "www.bozornarxida.uz"];

export default async function Page({ params }: { params: Promise<{ locale: string }> }) {
    const { locale } = await params;
    const markets = await getMarkets(50);

    // Foydalanuvchi allaqachon do'kon egasi bo'lsa — kabinetga
    const auth = await getBnAuth();
    if (auth) {
        const shop = await prisma.bnShop.findFirst({
            where: { profileId: auth.profileId }, select: { status: true },
        });
        if (shop) {
            const host = (await headers()).get("host")?.split(":")[0].toLowerCase() ?? "";
            const base = BN_HOSTS.includes(host) ? "" : `/${locale}/bn`;
            redirect(`${base}/kabinet`);
        }
    }

    return <BnSellerRegister markets={markets} />;
}
