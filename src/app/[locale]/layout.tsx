import type { Metadata, Viewport } from "next";
import { NextIntlClientProvider } from 'next-intl';
import { getMessages, getTranslations, setRequestLocale } from 'next-intl/server';
import { routing } from '@/i18n/routing';
import { notFound } from 'next/navigation';
import { headers } from 'next/headers';
import { Inter } from "next/font/google";
import { Header } from "@/components/layout/header";
import { Footer } from "@/components/layout/footer";
import { Providers } from "@/app/providers";
import { BackgroundEffects } from "@/components/background-effects";
import { AuthBarrier } from "@/components/auth/auth-barrier";
import { SupportDock } from "@/components/support/support-dock";
import { Analytics } from "@vercel/analytics/next";
import { SpeedInsights } from "@vercel/speed-insights/next";
import { BnAttributionCapture } from "@/components/analytics/bn-attribution-capture";
import "@/app/globals.css";

const inter = Inter({ subsets: ["latin", "cyrillic"] });

export async function generateMetadata({
    params,
}: {
    params: Promise<{ locale: string }>;
}): Promise<Metadata> {
    const { locale } = await params;
    const t = await getTranslations({ locale, namespace: "Hero" });
    const description = t("description");

    return {
        title: {
            default: "For Humo",
            template: "%s | For Humo",
        },
        description,
        keywords: [
            "For Humo", "ForHumo", "Humo ID", "Humo AI", "Humo Nexus",
            "Humo eSport", "Humo Market", "Humo Pay", "Humo Support",
            "O'zbekiston", "Узбекистан", "Uzbekistan", "kibersport", "esport",
        ],
        metadataBase: new URL("https://www.forhumo.uz"),
        openGraph: {
            title: "For Humo",
            description,
            url: `https://www.forhumo.uz/${locale}`,
            siteName: "For Humo",
            images: [
                {
                    url: "/logos/forhumo.png",
                    width: 512,
                    height: 512,
                    alt: "For Humo",
                },
            ],
            locale,
            type: "website",
        },
        twitter: {
            card: "summary",
            title: "For Humo",
            description,
            images: ["/logos/forhumo.png"],
        },
        alternates: {
            canonical: `https://www.forhumo.uz/${locale}`,
            languages: {
                uz: "https://www.forhumo.uz/uz",
                ru: "https://www.forhumo.uz/ru",
                en: "https://www.forhumo.uz/en",
            },
        },
        icons: {
            icon: "/logo.png",
            apple: "/logo.png",
        },
        robots: {
            index: true,
            follow: true,
        },
        verification: {
            // Google Search Console: Vercel env'ga GOOGLE_SITE_VERIFICATION qo'shsangiz
            // avtomatik <meta name="google-site-verification"> chiqadi. Yandex/Bing ham
            // shu naqsh bilan qo'shilishi mumkin.
            google: process.env.GOOGLE_SITE_VERIFICATION || undefined,
            yandex: process.env.YANDEX_SITE_VERIFICATION || undefined,
            other: process.env.BING_SITE_VERIFICATION
                ? { "msvalidate.01": process.env.BING_SITE_VERIFICATION }
                : undefined,
        },
    };
}

export const viewport: Viewport = {
    width: "device-width",
    initialScale: 1,
    viewportFit: "cover",
};

export function generateStaticParams() {
    return routing.locales.map((locale) => ({ locale }));
}

export default async function LocaleLayout({
    children,
    params
}: {
    children: React.ReactNode;
    params: Promise<{ locale: string }>;
}) {
    const { locale } = await params;

    // Ensure that the incoming `locale` is valid
    if (!routing.locales.includes(locale as any)) {
        notFound();
    }

    // Enable static rendering
    setRequestLocale(locale);

    // Ommaviy domenlar — AuthBarrier to'smaydi.
    // bozornarxida.uz da URL "/bozorlar" ko'rinadi (middleware /uz/bn/... ga
    // rewrite qiladi), shuning uchun yo'l bo'yicha aniqlab bo'lmaydi — host kerak.
    const host = (await headers()).get("host")?.split(":")[0].toLowerCase() ?? "";
    const publicHost = ["bozornarxida.uz", "www.bozornarxida.uz"].includes(host);

    // Providing all messages to the client
    // side is the easiest way to get started
    const messages = await getMessages();

    return (
        <html lang={locale} className="scroll-smooth" suppressHydrationWarning>
            <body className={`${inter.className} min-h-screen flex flex-col bg-background text-foreground antialiased selection:bg-primary/20`}>
                <NextIntlClientProvider messages={messages}>
                    <Providers>
                        <AuthBarrier publicHost={publicHost}>
                            {!publicHost && <BackgroundEffects />}
                            {!publicHost && <Header />}
                            <main className="flex-1 w-full max-w-[100vw] overflow-x-hidden">
                                {children}
                            </main>
                            {!publicHost && <Footer />}
                        </AuthBarrier>
                        <SupportDock />
                        <BnAttributionCapture />
                    </Providers>
                </NextIntlClientProvider>
                <Analytics />
                <SpeedInsights />
            </body>
        </html>
    );
}
