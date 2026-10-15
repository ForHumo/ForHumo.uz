// Bozor Narxida (BN) — For Humo loyihalaridan biri.
// Domen: bozornarxida.uz → middleware /uz/bn/* ga rewrite qiladi (URL o'zgarmaydi).
// Reja: docs/BN-PLAN.md

import type { ReactNode } from "react";
import { headers } from "next/headers";
import { Playfair_Display, Manrope } from "next/font/google";
import { BnHeader } from "@/components/bn/bn-header";
import { BnFooter } from "@/components/bn/bn-footer";
import { BnNavbar } from "@/components/bn/bn-navbar";
import { BnAurora } from "@/components/bn/bn-styles";
// BN dizayn tokenlari — statik CSS (SSR <link>, birinchi kadrdanoq tema tayyor)
import "@/components/bn/bn-styles.css";
import { BnBaseProvider } from "@/components/bn/bn-nav";
import { BnSwipeNav } from "@/components/bn/bn-swipe-nav";
import { BnReferralAttach } from "@/components/bn/bn-referral-attach";
import { BnCallProvider } from "@/components/bn/bn-call-provider";
import { BnServiceWorker } from "@/components/bn/bn-service-worker";
import { getCategoriesTree, localizeCategoryTree } from "@/lib/bn-data";
import { getBnAuth } from "@/lib/bn-auth";
import { prisma } from "@/lib/prisma";

const BN_HOSTS = ["bozornarxida.uz", "www.bozornarxida.uz"];

// Premium tipografiya — Kirill + Lotin ikkalasini qo'llaydi (uz/ru/en).
// Display: Playfair Display — yuqori kontrastli hashamatli serif (sarlavhalar, brend).
// Body:   Manrope — geometrik, toza, tabular raqamlar (narxlar uchun ideal).
const bnDisplay = Playfair_Display({
    subsets: ["latin", "cyrillic"],
    weight: ["400", "500", "600", "700", "800", "900"],
    variable: "--bn-font-display",
    display: "swap",
});
const bnBody = Manrope({
    subsets: ["latin", "cyrillic"],
    weight: ["300", "400", "500", "600", "700", "800"],
    variable: "--bn-font-body",
    display: "swap",
});

import type { Metadata, Viewport } from "next";
import { getTranslations } from "next-intl/server";
import { BN_SITE, BN_SITE_NAME, bnDefaultOgImage, bnLocale } from "@/lib/bn-seo";

// Umumiy metadata — tilga mos. canonical bu yerda YO'Q: har sahifa o'zini canonical qiladi
// (lib/bn-seo.ts bnPageMeta). Layout'da "/" tursa, o'z canonical'i yo'q sahifalar bosh
// sahifaga "yopishib" Google'dan tushib qolardi.
// title.absolute — root layout shabloni ("%s | For Humo") qo'shilmasin ("... | For Humo | For Humo").
export async function generateMetadata(
    { params }: { params: Promise<{ locale: string }> },
): Promise<Metadata> {
    const locale = bnLocale((await params).locale);
    const t = await getTranslations({ locale, namespace: "bn" });
    const og = bnDefaultOgImage(locale);
    return {
        metadataBase: new URL(BN_SITE),
        title: {
            absolute: t("seo.homeTitle"),
            template: `%s | ${BN_SITE_NAME}`,
        },
        description: t("seo.homeDesc"),
        applicationName: BN_SITE_NAME,
        manifest: "/manifest.webmanifest",
        icons: {
            icon: [
                { url: "/bn/favicon.ico", sizes: "any" },
                { url: "/bn/icon-32.png", type: "image/png", sizes: "32x32" },
                { url: "/bn/favicon.png", type: "image/png", sizes: "64x64" },
                { url: "/bn/icon-192.png", type: "image/png", sizes: "192x192" },
                { url: "/bn/icon-512.png", type: "image/png", sizes: "512x512" },
            ],
            apple: "/bn/apple-icon.png",
        },
        openGraph: {
            type: "website",
            siteName: BN_SITE_NAME,
            title: BN_SITE_NAME,
            description: t("tagline"),
            locale: locale === "ru" ? "ru_RU" : locale === "en" ? "en_US" : "uz_UZ",
            images: [og],
        },
        twitter: {
            card: "summary_large_image",
            title: BN_SITE_NAME,
            description: t("tagline"),
            images: [og.url],
        },
        // Bo'sh — root layout'ning forhumo.uz canonical/hreflang'i BN sahifalariga meros bo'lmasin
        alternates: {},
        robots: { index: true, follow: true },
    };
}

// iOS: safe-area-inset ishlashi uchun viewport-fit=cover
export const viewport: Viewport = {
    width: "device-width",
    initialScale: 1,
    viewportFit: "cover",
    themeColor: "#17171B",
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
    // ru'da kategoriya nomlari nameRu'dan (bo'lsa)
    const catTree = localizeCategoryTree(await getCategoriesTree(), locale);
    const headerCats = catTree.map(c => ({
        slug: c.slug, name: c.name, productCount: c.productCount,
    }));

    // Savat + sevimlilar counterlari — badge uchun. Kirmagan bo'lsa 0.
    // Foydalanuvchining tasdiqlangan do'koni bormi — "Kabinet" tugmasi uchun.
    const auth = await getBnAuth();
    const [cartCount, favCount, shop] = auth ? await Promise.all([
        prisma.bnCartItem.count({ where: { profileId: auth.profileId } }),
        prisma.bnFavorite.count({ where: { profileId: auth.profileId } }),
        prisma.bnShop.findFirst({ where: { profileId: auth.profileId }, select: { id: true } }),
    ]) : [0, 0, null];
    const hasShop = !!shop;

    return (
        // data-bn-authed — kirgan foydalanuvchi uchun SSR'dan CSS belgisi: anonimlarga
        // mo'ljallangan kartalar (BnReferralHero) birinchi kadrdanoq yashirin, sessiya
        // klientda kech kelib sahifani surmaydi (CLS).
        <div data-bn-scroll-root data-bn-authed={auth ? "" : undefined} className={`bn-scope ${bnDisplay.variable} ${bnBody.variable} fixed inset-0 z-[100] overflow-y-auto overflow-x-hidden`}>
            <BnAurora />
            <BnBaseProvider base={base} locale={locale} hasShop={hasShop}>
                <BnSwipeNav>
                    <div className="relative z-10 flex flex-col min-h-full">
                        <BnHeader categories={headerCats} cartCount={cartCount} favCount={favCount} />
                        {/* Pastki navbar uchun joy footer'ning o'zida (bn-footer.tsx) — bu yerda ikki marta qo'shilmasin */}
                        <main className="flex-1 pb-8">
                            {children}
                        </main>
                        <BnFooter />
                    </div>
                    <BnNavbar />
                    <BnReferralAttach />
                    <BnCallProvider />
                    <BnServiceWorker />
                </BnSwipeNav>
            </BnBaseProvider>
        </div>
    );
}
