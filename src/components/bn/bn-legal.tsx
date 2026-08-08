"use client";

// BN huquqiy sahifalar uchun umumiy shablon (foydalanish/maxfiylik/oferta/yordam).

import { ChevronRight, Shield, FileText, Info } from "lucide-react";
import { BnLink } from "./bn-nav";
import { BnBackButton } from "./bn-back-button";
import { BN } from "@/lib/bn-theme";
import type { ReactNode } from "react";

export function BnLegalPage({
    title, subtitle, updatedAt, icon: Icon = FileText, children,
}: {
    title: string;
    subtitle?: string;
    updatedAt?: string;
    icon?: typeof Shield;
    children: ReactNode;
}) {
    return (
        <div className="mx-auto max-w-[820px] px-4 pt-4 pb-16">
            <BnBackButton fallbackHref="/" />

            <nav className="flex items-center gap-1.5 text-[12px] mt-4 mb-3" style={{ color: BN.text3 }}>
                <BnLink href="/" className="hover:opacity-70">Bosh sahifa</BnLink>
                <ChevronRight className="w-3 h-3" />
                <span>Huquqiy</span>
            </nav>

            <header className="mb-6">
                <div className="flex items-center gap-3 mb-2">
                    <div
                        className="w-11 h-11 rounded-2xl grid place-items-center"
                        style={{ background: "rgba(96,165,250,0.15)", color: "#60a5fa" }}
                    >
                        <Icon className="w-5 h-5" />
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
                        <Info className="w-3 h-3 inline mr-1" /> Oxirgi yangilanish: {updatedAt}
                    </p>
                )}
            </header>

            <article
                className="prose-bn text-[15px] leading-[1.75]"
                style={{ color: "rgba(255,255,255,0.9)" }}
            >
                {children}
            </article>

            <style dangerouslySetInnerHTML={{ __html: `
                .prose-bn h2 { font-size: 20px; font-weight: 800; letter-spacing: -0.01em; margin: 28px 0 10px; color: #fff; }
                .prose-bn h3 { font-size: 16px; font-weight: 700; margin: 20px 0 8px; color: #fff; }
                .prose-bn p { margin: 8px 0; }
                .prose-bn ul { list-style: disc; padding-left: 22px; margin: 8px 0; }
                .prose-bn ol { list-style: decimal; padding-left: 22px; margin: 8px 0; }
                .prose-bn li { margin: 4px 0; }
                .prose-bn a { color: #60a5fa; text-decoration: underline; }
                .prose-bn strong { color: #fff; font-weight: 700; }
                .prose-bn hr { border: none; border-top: 1px solid rgba(255,255,255,0.08); margin: 24px 0; }
            ` }} />
        </div>
    );
}
