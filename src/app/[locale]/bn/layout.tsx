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

    return (
        <div className="bn-scope fixed inset-0 z-[100] overflow-y-auto overflow-x-hidden">
            <BnStyles />
            <BnAurora />
            <BnBaseProvider base={base} locale={locale}>
                <div className="relative z-10 flex flex-col min-h-full">
                    <BnHeader />
                    <main className="flex-1 pb-24">{children}</main>
                    <BnFooter />
                </div>
                <BnNavbar />
            </BnBaseProvider>
        </div>
    );
}
