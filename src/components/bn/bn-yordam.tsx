"use client";

import { useState, useMemo } from "react";
import { useTranslations } from "next-intl";
import {
    ChevronDown, ShoppingBag, CreditCard, Truck, Store, Shield,
    HelpCircle, MessageCircle, ChevronRight, Search,
} from "lucide-react";
import { BnLink } from "./bn-nav";
import { BnBackButton } from "./bn-back-button";
import { BN } from "@/lib/bn-theme";

interface FAQ { q: string; a: string; }
interface Section { title: string; icon: typeof ShoppingBag; items: FAQ[]; }

// Bo'lim ikonlari — yagona BN tilla palitrasi (ilgari ko'k/yashil/pushti/binafsha
// hex edi: kunduzgi temada begona ko'rinardi).
interface SectionMeta {
    titleKey: string;
    icon: typeof ShoppingBag;
    itemKeys: { q: string; a: string }[];
}

const SECTION_META: SectionMeta[] = [
    { titleKey: "sec1", icon: ShoppingBag, itemKeys: [
        { q: "q1_1", a: "a1_1" }, { q: "q1_2", a: "a1_2" },
        { q: "q1_3", a: "a1_3" }, { q: "q1_4", a: "a1_4" },
    ]},
    { titleKey: "sec2", icon: CreditCard, itemKeys: [
        { q: "q2_1", a: "a2_1" }, { q: "q2_2", a: "a2_2" },
        { q: "q2_3", a: "a2_3" }, { q: "q2_4", a: "a2_4" },
    ]},
    { titleKey: "sec3", icon: Truck, itemKeys: [
        { q: "q3_1", a: "a3_1" }, { q: "q3_2", a: "a3_2" },
        { q: "q3_3", a: "a3_3" }, { q: "q3_4", a: "a3_4" },
    ]},
    { titleKey: "sec4", icon: Store, itemKeys: [
        { q: "q4_1", a: "a4_1" }, { q: "q4_2", a: "a4_2" },
        { q: "q4_3", a: "a4_3" }, { q: "q4_4", a: "a4_4" },
    ]},
    { titleKey: "sec5", icon: Shield, itemKeys: [
        { q: "q5_1", a: "a5_1" }, { q: "q5_2", a: "a5_2" },
        { q: "q5_3", a: "a5_3" },
    ]},
];

export function BnYordamPage() {
    const t = useTranslations("bn.help");
    const tCrumb = useTranslations("bn.breadcrumb");
    const [q, setQ] = useState("");
    const [openIdx, setOpenIdx] = useState<string | null>(null);

    const SECTIONS: Section[] = useMemo(() => SECTION_META.map(s => ({
        title: t(s.titleKey),
        icon: s.icon,
        items: s.itemKeys.map(k => ({ q: t(k.q), a: t(k.a) })),
    })), [t]);

    const filter = (item: FAQ) => {
        if (!q.trim()) return true;
        const s = q.toLowerCase();
        return item.q.toLowerCase().includes(s) || item.a.toLowerCase().includes(s);
    };

    return (
        <div className="mx-auto max-w-[860px] px-4 pt-4 pb-16">
            <BnBackButton fallbackHref="/" />

            <nav className="flex items-center gap-1.5 text-[12px] mt-4 mb-3" style={{ color: BN.text3 }}>
                <BnLink href="/" className="hover:opacity-70">{tCrumb("home")}</BnLink>
                <ChevronRight className="w-3 h-3" />
                <span>{t("crumb")}</span>
            </nav>

            <header className="mb-6">
                <div className="flex items-center gap-3 mb-3">
                    <div
                        className="w-11 h-11 rounded-2xl grid place-items-center"
                        style={{ background: BN.goldSoft, color: BN.gold }}
                    >
                        <HelpCircle className="w-5 h-5" />
                    </div>
                    <div>
                        <h1 className="text-[26px] font-black tracking-tight leading-tight">{t("title")}</h1>
                        <p className="text-[13px]" style={{ color: BN.text3 }}>
                            {t("subtitle")}
                        </p>
                    </div>
                </div>

                {/* Qidiruv — BN tokenlari (placeholder rangi bn-styles.css'da: text-3) */}
                <div
                    className="relative flex items-center rounded-2xl px-4 py-3"
                    style={{ background: BN.surface, border: `1px solid ${BN.border}` }}
                >
                    <Search className="w-4 h-4 mr-2" style={{ color: BN.text3 }} />
                    <input
                        type="text" value={q} onChange={(e) => setQ(e.target.value)}
                        placeholder={t("searchPh")}
                        className="flex-1 bg-transparent outline-none text-[15px]"
                        style={{ color: BN.text }}
                    />
                </div>
            </header>

            <div className="space-y-6">
                {SECTIONS.map((sec, si) => {
                    const items = sec.items.filter(filter);
                    if (items.length === 0) return null;
                    const Icon = sec.icon;
                    return (
                        <section key={si}>
                            <div className="flex items-center gap-2 mb-3">
                                <div
                                    className="w-8 h-8 rounded-xl grid place-items-center"
                                    style={{ background: BN.goldSoft, color: BN.gold }}
                                >
                                    <Icon className="w-4 h-4" />
                                </div>
                                <h2 className="text-[18px] font-bold">{sec.title}</h2>
                            </div>
                            <div className="space-y-2">
                                {items.map((it, i) => {
                                    const key = `${si}-${i}`;
                                    const open = openIdx === key;
                                    return (
                                        <button
                                            key={key}
                                            onClick={() => setOpenIdx(open ? null : key)}
                                            className="w-full text-left rounded-2xl transition-colors"
                                            style={{
                                                background: BN.surface,
                                                border: `1px solid ${open ? BN.borderGold : BN.border}`,
                                            }}
                                        >
                                            <div className="flex items-start justify-between gap-3 px-4 py-3">
                                                <span className="text-[15px] font-semibold flex-1">{it.q}</span>
                                                <ChevronDown
                                                    className="w-4 h-4 flex-shrink-0 transition-transform mt-1"
                                                    style={{
                                                        color: BN.text3,
                                                        transform: open ? "rotate(180deg)" : "rotate(0)",
                                                    }}
                                                />
                                            </div>
                                            {open && (
                                                <div
                                                    className="px-4 pb-4 text-[14px] leading-[1.7]"
                                                    style={{ color: BN.text2 }}
                                                >
                                                    {it.a}
                                                </div>
                                            )}
                                        </button>
                                    );
                                })}
                            </div>
                        </section>
                    );
                })}

                {SECTIONS.every(s => s.items.filter(filter).length === 0) && (
                    <div className="text-center py-16" style={{ color: BN.text3 }}>
                        <HelpCircle className="w-12 h-12 mx-auto mb-3 opacity-40" />
                        <p className="text-[15px]">{t("notFound")}</p>
                    </div>
                )}
            </div>

            {/* Aloqa bloki */}
            <div
                className="mt-10 rounded-3xl p-5 flex items-center gap-4"
                style={{ background: BN.surface, border: `1px solid ${BN.borderGold}` }}
            >
                <div
                    className="w-12 h-12 rounded-2xl grid place-items-center flex-shrink-0"
                    style={{ background: BN.goldSoft, color: BN.gold }}
                >
                    <MessageCircle className="w-5 h-5" />
                </div>
                <div className="flex-1">
                    <div className="text-[15px] font-bold mb-0.5">{t("contactTitle")}</div>
                    <div className="text-[13px]" style={{ color: BN.text3 }}>
                        {t("contactText")}
                    </div>
                </div>
                <a
                    href="https://t.me/forhumo"
                    target="_blank" rel="noopener noreferrer"
                    className="rounded-2xl px-4 py-2 text-[13px] font-semibold"
                    style={{ background: BN.gold, color: BN.onGold }}
                >
                    {t("contactBtn")}
                </a>
            </div>
        </div>
    );
}
