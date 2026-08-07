import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { BnSellerRegister } from "@/components/bn/bn-seller-register";
import { getMarkets } from "@/lib/bn-data";
import { getBnAuth } from "@/lib/bn-auth";
import { prisma } from "@/lib/prisma";
import { headers } from "next/headers";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
    title: "Sotuvchi bo'lish",
    description: "Do'koningizni onlaynga chiqaring. YaTT yoki MChJ bilan ro'yxatdan o'ting, komissiya 5%.",
};

const BN_HOSTS = ["bozornarxida.uz", "www.bozornarxida.uz"];

export default async function Page({ params }: { params: Promise<{ locale: string }> }) {
    const { locale } = await params;
    const markets = await getMarkets(50);

    // Foydalanuvchi allaqachon do'kon egasi bo'lsa — kabinetga
    const auth = await getBnAuth();
    if (auth) {
        const shop = await prisma.bnShop.findUnique({
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
