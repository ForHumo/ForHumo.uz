"use client";

import { useTranslations } from "next-intl";
import { ArrowRight, Send, Gift, Sparkles, Heart, Leaf } from "lucide-react";
import { BELIS, BELIS_GOLD_GRADIENT, BELIS_SOCIAL } from "@/lib/belis-theme";
import { BelisLink } from "./belis-nav";

export function BelisHome() {
    const t = useTranslations("belis");

    return (
        <div className="max-w-6xl mx-auto px-4 py-8 md:py-14">
            {/* Hero */}
            <section className="text-center py-12 md:py-20">
                <p className="text-xs uppercase tracking-[0.3em] mb-4"
                    style={{ color: BELIS.text2, fontFamily: "'Montserrat', sans-serif", fontWeight: 500 }}>
                    Sarpo · Sovg'a · Nafis to'plamlar
                </p>
                <h1 style={{
                    fontFamily: "'Great Vibes', 'Pinyon Script', cursive",
                    fontSize: "clamp(96px, 18vw, 200px)",
                    lineHeight: 0.85,
                    color: BELIS.gold,
                    textShadow: "0 4px 24px rgba(212,175,55,0.35)",
                    margin: "0 0 20px",
                }}>
                    Belis
                </h1>
                <p className="text-xl md:text-2xl italic mb-8"
                    style={{ color: BELIS.text2, fontFamily: "'Playfair Display', serif" }}>
                    {t("hero.subtitle")}
                </p>
                <div className="flex flex-wrap items-center justify-center gap-3">
                    <BelisLink href="/belis/katalog"
                        className="inline-flex items-center gap-2 px-6 py-3 rounded-full text-sm font-bold transition hover:brightness-110 active:scale-95"
                        style={{
                            background: BELIS_GOLD_GRADIENT,
                            color: BELIS.onGold,
                            boxShadow: "0 8px 24px rgba(212,175,55,0.35)",
                            fontFamily: "'Montserrat', sans-serif",
                            letterSpacing: "0.05em",
                        }}>
                        {t("hero.cta")} <ArrowRight className="w-4 h-4" strokeWidth={1.5} />
                    </BelisLink>
                    <a href={BELIS_SOCIAL.telegramBot} target="_blank" rel="noopener"
                        className="inline-flex items-center gap-2 px-6 py-3 rounded-full text-sm font-bold transition hover:brightness-95"
                        style={{
                            background: BELIS.surface,
                            color: BELIS.text2,
                            border: `1px solid ${BELIS.border}`,
                            fontFamily: "'Montserrat', sans-serif",
                            letterSpacing: "0.05em",
                        }}>
                        <Send className="w-4 h-4" strokeWidth={1.5} /> {t("hero.ctaBot")}
                    </a>
                </div>
            </section>

            {/* Qadriyatlar (image 2 pastki qismi) */}
            <section className="mt-8 grid grid-cols-2 md:grid-cols-5 gap-4">
                {[
                    { icon: Sparkles, label: "NAFISLIK" },
                    { icon: Gift, label: "SIFAT" },
                    { icon: Heart, label: "ISHONCH" },
                    { icon: Leaf, label: "G'AMXO'RLIK" },
                    { icon: Heart, label: "MEHR" },
                ].map((v, i) => {
                    const Icon = v.icon;
                    return (
                        <div key={i} className="flex flex-col items-center gap-2 py-4">
                            <div className="w-10 h-10 rounded-full flex items-center justify-center"
                                style={{ background: "rgba(212,175,55,0.10)", border: `1px solid ${BELIS.border}` }}>
                                <Icon className="w-4 h-4" strokeWidth={1.25} style={{ color: BELIS.gold }} />
                            </div>
                            <p className="text-[10px] tracking-[0.25em]"
                                style={{ color: BELIS.text2, fontFamily: "'Montserrat', sans-serif", fontWeight: 500 }}>
                                {v.label}
                            </p>
                        </div>
                    );
                })}
            </section>

            {/* Kelayotgan katalog placeholder */}
            <section className="mt-16">
                <SectionHeading>{t("sections.featured")}</SectionHeading>
                <div className="mt-6 py-16 text-center rounded-2xl"
                    style={{ background: BELIS.surface, border: `1px dashed ${BELIS.border}` }}>
                    <p className="text-sm italic" style={{ color: BELIS.text2 }}>
                        Tez orada — birinchi to'plamlar tayyorlanmoqda
                    </p>
                    <BelisLink href="/belis/katalog"
                        className="inline-flex items-center gap-1.5 text-xs font-bold mt-3 hover:underline"
                        style={{ color: BELIS.gold, fontFamily: "'Montserrat', sans-serif" }}>
                        Katalogni ochish <ArrowRight className="w-3 h-3" strokeWidth={1.5} />
                    </BelisLink>
                </div>
            </section>
        </div>
    );
}

function SectionHeading({ children }: { children: React.ReactNode }) {
    return (
        <div className="flex items-center gap-4">
            <span className="flex-1 h-px" style={{ background: BELIS.borderSoft }} />
            <h2 style={{
                fontFamily: "'Playfair Display', serif",
                fontSize: 28,
                color: BELIS.gold,
                letterSpacing: "0.02em",
                margin: 0,
            }}>
                {children}
            </h2>
            <span className="flex-1 h-px" style={{ background: BELIS.borderSoft }} />
        </div>
    );
}
