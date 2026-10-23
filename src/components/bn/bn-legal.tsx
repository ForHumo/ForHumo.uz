// BN huquqiy sahifalar uchun umumiy shablon (foydalanish/maxfiylik/oferta/yordam).
// SERVER COMPONENT — page.tsx'lardan chaqiriladi (client bo'lish shart emas,
// klientda hech nima interaktiv emas). MUHIM: Server → Client chegarada
// funksiya (masalan lucide icon komponentini) prop sifatida yuborib bo'lmaydi
// (Next 15'da 500 xato). Shu sabab `iconEl` — JSX element sifatida qabul qilinadi.

import { ChevronRight, FileText, Info } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { BnLink } from "./bn-nav";
import { BnBackButton } from "./bn-back-button";
import { BN } from "@/lib/bn-theme";
import type { ReactNode } from "react";

export async function BnLegalPage({
    title, subtitle, updatedAt, iconEl, children,
}: {
    title: string;
    subtitle?: string;
    updatedAt?: string;
    iconEl?: ReactNode;
    children: ReactNode;
}) {
    const t = await getTranslations("bn.legal");
    const tCrumb = await getTranslations("bn.breadcrumb");
    const icon = iconEl ?? <FileText className="w-5 h-5" />;
    return (
        <div className="mx-auto max-w-[820px] px-4 pt-4 pb-16">
            <BnBackButton fallbackHref="/" />

            <nav className="flex items-center gap-1.5 text-[12px] mt-4 mb-3" style={{ color: BN.text3 }}>
                <BnLink href="/" className="hover:opacity-70">{tCrumb("home")}</BnLink>
                <ChevronRight className="w-3 h-3" />
                <span>{t("crumb")}</span>
            </nav>

            <header className="mb-6">
                <div className="flex items-center gap-3 mb-2">
                    <div
                        className="w-11 h-11 rounded-2xl grid place-items-center"
                        style={{ background: BN.goldSoft, color: BN.gold }}
                    >
                        {icon}
                    </div>
                    <div>
                        <h1 className="text-[26px] font-black tracking-tight leading-tight">{title}</h1>
                        {subtitle && (
                            <p className="text-[13px]" style={{ color: BN.text3 }}>{subtitle}</p>
                        )}
                    </div>
                </div>
                {updatedAt && (
                    <p className="text-[12px]" style={{ color: BN.text3 }}>
                        <Info className="w-3 h-3 inline mr-1" /> {t("updated")}: {updatedAt}
                    </p>
                )}
            </header>

            {/* Matn ranglari (h2/h3/strong/a/hr) — bn-styles.css `.prose-bn` (BN tokenlari) */}
            <article className="prose-bn text-[15px] leading-[1.75]">
                {children}
            </article>
        </div>
    );
}
