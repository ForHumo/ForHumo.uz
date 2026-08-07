// Bozor Narxida (BN) — For Humo loyihalaridan biri.
// Domen: bozornarxida.uz → middleware /uz/bn/* ga rewrite qiladi (URL o'zgarmaydi).
// Reja: docs/BN-PLAN.md

import type { ReactNode } from "react";
import { headers } from "next/headers";
import { BnHeader } from "@/components/bn/bn-header";
import { BnFooter } from "@/components/bn/bn-footer";
import { BnNavbar } from "@/components/bn/bn-navbar";
import { BnStyles, BnAurora } from "@/components/bn/bn-styles";
import { BnBaseProvider } from "@/components/bn/bn-nav";
import { BnSwipeNav } from "@/components/bn/bn-swipe-nav";
import { getCategoriesTree } from "@/lib/bn-data";
import { getBnAuth } from "@/lib/bn-auth";
import { prisma } from "@/lib/prisma";

const BN_HOSTS = ["bozornarxida.uz", "www.bozornarxida.uz"];

export const metadata = {
    icons: {
        icon: "/bn/favicon.png",
        apple: "/bn/apple-icon.png",
    },
    openGraph: { images: ["/bn/og.png"] },
};

export default async function BnLayout({
    children, params,
}: { children: ReactNode; params: Promise<{ locale: string }> }) {
    const { locale } = await params;
    const host = (await headers()).get("host")?.split(":")[0].toLowerCase() ?? "";

    // O'z domenida toza URL ("/bozorlar"), forhumo.uz da prefiks ("/uz/bn/bozorlar")
    const base = BN_HOSTS.includes(host) ? "" : `/${locale}/bn`;

    // Header dropdown menyusi uchun kategoriyalar (bir marta serverdan yuklab
    // olamiz — deyarli hech qachon o'zgarmaydi, Next avto-keshlaydi).
    const catTree = await getCategoriesTree();
    const headerCats = catTree.map(c => ({
        slug: c.slug, name: c.name, productCount: c.productCount,
    }));

    // Savat + sevimlilar counterlari — badge uchun. Kirmagan bo'lsa 0.
    const auth = await getBnAuth();
    const [cartCount, favCount] = auth ? await Promise.all([
        prisma.bnCartItem.count({ where: { profileId: auth.profileId } }),
        prisma.bnFavorite.count({ where: { profileId: auth.profileId } }),
    ]) : [0, 0];

    return (
        <div className="bn-scope fixed inset-0 z-[100] overflow-y-auto overflow-x-hidden">
            <BnStyles />
            <BnAurora />
            <BnBaseProvider base={base} locale={locale}>
                <BnSwipeNav>
                    <div className="relative z-10 flex flex-col min-h-full">
                        <BnHeader categories={headerCats} cartCount={cartCount} favCount={favCount} />
                        <main className="flex-1 pb-24">{children}</main>
                        <BnFooter />
                    </div>
                    <BnNavbar />
                </BnSwipeNav>
            </BnBaseProvider>
        </div>
    );
}
