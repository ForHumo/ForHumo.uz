"use client";

import { BnLink, useBnBase } from "./bn-nav";
import { Store, Shield, Truck, Sparkles } from "lucide-react";
import { useTranslations, useLocale } from "next-intl";
import { BN } from "@/lib/bn-theme";
import { PoweredByForHumo } from "@/components/shared/powered-by-forhumo";
import { BnLogo } from "./bn-header";

export function BnFooter() {
    const { hasShop } = useBnBase();
    const t = useTranslations("bn");
    const locale = useLocale();
    return (
        <footer style={{ borderTop: `1px solid ${BN.border}`, background: BN.surface }}>
            {/* Ishonch qatori */}
            <div className="mx-auto max-w-[1280px] px-4 py-8 grid grid-cols-2 md:grid-cols-4 gap-4">
                <Trust icon={<Shield className="w-5 h-5" />} title={t("trust.payment")}
                    text={t("trust.paymentText")} />
                <Trust icon={<Store className="w-5 h-5" />} title={t("trust.official")}
                    text={t("trust.officialText")} />
                <Trust icon={<Sparkles className="w-5 h-5" />} title={t("trust.marketPrice")}
                    text={t("trust.marketPriceText")} />
                <Trust icon={<Truck className="w-5 h-5" />} title={t("trust.inspect")}
                    text={t("trust.inspectText")} />
            </div>

            <div style={{ borderTop: `1px solid ${BN.border}` }}>
                <div className="mx-auto max-w-[1280px] px-4 py-8 grid grid-cols-2 md:grid-cols-5 gap-8">
                    <div className="col-span-2 md:col-span-1">
                        <div className="flex items-center gap-2.5 mb-3">
                            <BnLogo size={40} />
                            <span className="font-black text-[16px]">{t("brandName")}</span>
                        </div>
                        <p className="text-[13px] leading-relaxed" style={{ color: BN.text2 }}>
                            {t("tagline")}
                        </p>
                    </div>

                    <FooterCol title={t("footer.forBuyer")}>
                        <FooterLink href="/qidiruv">{t("footer.allProducts")}</FooterLink>
                        <FooterLink href="/bozorlar">{t("footer.markets")}</FooterLink>
                        <FooterLink href="/dokonlar">{t("footer.shops")}</FooterLink>
                        <FooterLink href="/xarita">{locale === "ru" ? "Карта" : locale === "en" ? "Map" : "Xarita"}</FooterLink>
                        <FooterLink href="/buyurtmalarim">{t("footer.myOrders")}</FooterLink>
                    </FooterCol>

                    <FooterCol title={t("footer.forSeller")}>
                        {hasShop ? (
                            <FooterLink href="/kabinet">{t("seller.cabinet")}</FooterLink>
                        ) : (
                            <FooterLink href="/sotuvchi">{t("seller.become")}</FooterLink>
                        )}
                        <FooterLink href="/kabinet">{t("footer.cabinet")}</FooterLink>
                    </FooterCol>

                    <FooterCol title={t("footer.help")}>
                        <FooterLink href="/haqida">{t("footer.about")}</FooterLink>
                        <FooterLink href="/yordam">{t("footer.faq")}</FooterLink>
                        <FooterLink href="/huquqiy/foydalanish">{t("footer.terms")}</FooterLink>
                        <FooterLink href="/huquqiy/maxfiylik">{t("footer.privacy")}</FooterLink>
                        <FooterLink href="/huquqiy/oferta">{t("footer.offer")}</FooterLink>
                    </FooterCol>

                    <FooterCol title={t("footer.aboutFH")}>
                        <FooterExt href="https://forhumo.uz">For Humo</FooterExt>
                        <FooterExt href={`https://forhumo.uz/${locale}/id`}>Humo ID</FooterExt>
                        <FooterExt href={`https://forhumo.uz/${locale}/pay`}>For Pay</FooterExt>
                    </FooterCol>
                </div>
            </div>

            <div style={{ borderTop: `1px solid ${BN.border}` }}>
                <div className="mx-auto max-w-[1280px] px-4 py-5 flex flex-col sm:flex-row items-center justify-between gap-2" style={{ color: BN.text3 }}>
                    <p className="text-[12px]">
                        © {new Date().getFullYear()} {t("brandName")}
                    </p>
                    <PoweredByForHumo />
                </div>
            </div>
        </footer>
    );
}

function Trust({ icon, title, text }: { icon: React.ReactNode; title: string; text: string }) {
    return (
        <div className="flex items-start gap-3">
            <span
                className="w-10 h-10 rounded-xl grid place-items-center flex-shrink-0"
                style={{ background: BN.goldSoft, color: BN.gold }}
            >
                {icon}
            </span>
            <div className="min-w-0">
                <p className="text-[13px] font-black mb-0.5">{title}</p>
                <p className="text-[12px] leading-snug" style={{ color: BN.text3 }}>{text}</p>
            </div>
        </div>
    );
}

function FooterCol({ title, children }: { title: string; children: React.ReactNode }) {
    return (
        <div>
            <p className="text-[11px] font-black uppercase tracking-wider mb-3" style={{ color: BN.text3 }}>
                {title}
            </p>
            <div className="flex flex-col gap-2">{children}</div>
        </div>
    );
}

function FooterLink({ href, children }: { href: string; children: React.ReactNode }) {
    return (
        <BnLink href={href} className="text-[13px] transition-colors hover:opacity-70" style={{ color: BN.text2 }}>
            {children}
        </BnLink>
    );
}

function FooterExt({ href, children }: { href: string; children: React.ReactNode }) {
    return (
        <a
            href={href}
            target="_blank"
            rel="noopener noreferrer"
            className="text-[13px] transition-colors hover:opacity-70"
            style={{ color: BN.text2 }}
        >
            {children}
        </a>
    );
}
