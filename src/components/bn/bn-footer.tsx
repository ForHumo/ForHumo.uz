"use client";

import { BnLink } from "./bn-nav";
import { Store, Shield, Truck, Sparkles } from "lucide-react";
import { BN } from "@/lib/bn-theme";

export function BnFooter() {
    return (
        <footer style={{ borderTop: `1px solid ${BN.border}`, background: BN.surface }}>
            {/* Ishonch qatori */}
            <div className="mx-auto max-w-[1280px] px-4 py-8 grid grid-cols-2 md:grid-cols-4 gap-4">
                <Trust icon={<Shield className="w-5 h-5" />} title="Xavfsiz to'lov"
                    text="Pul yetkazilguncha ushlab turiladi" />
                <Trust icon={<Store className="w-5 h-5" />} title="Rasmiy sotuvchilar"
                    text="Har do'kon YaTT yoki MChJ bilan" />
                <Trust icon={<Sparkles className="w-5 h-5" />} title="Bozor narxi"
                    text="Har mahsulot bozor bilan solishtiriladi" />
                <Trust icon={<Truck className="w-5 h-5" />} title="Ko'rib sotib olish"
                    text="Bozorga borib ko'rib, keyin to'lang" />
            </div>

            <div style={{ borderTop: `1px solid ${BN.border}` }}>
                <div className="mx-auto max-w-[1280px] px-4 py-8 grid grid-cols-2 md:grid-cols-4 gap-8">
                    <div className="col-span-2 md:col-span-1">
                        <div className="flex items-center gap-2.5 mb-3">
                            <span
                                className="w-9 h-9 rounded-xl grid place-items-center font-black text-[15px]"
                                style={{ background: `linear-gradient(140deg, ${BN.goldLight}, ${BN.goldDark})`, color: BN.onGold }}
                            >
                                BN
                            </span>
                            <span className="font-black text-[16px]">Bozor Narxida</span>
                        </div>
                        <p className="text-[13px] leading-relaxed" style={{ color: BN.text2 }}>
                            O&apos;zbekiston bozorlari va do&apos;konlari — bitta joyda.
                            Narxni solishtiring, ko&apos;rib oling, ishonch bilan xarid qiling.
                        </p>
                    </div>

                    <FooterCol title="Xaridorga">
                        <FooterLink href="/qidiruv">Barcha mahsulotlar</FooterLink>
                        <FooterLink href="/bozorlar">Bozorlar</FooterLink>
                        <FooterLink href="/dokonlar">Do&apos;konlar</FooterLink>
                        <FooterLink href="/buyurtmalarim">Buyurtmalarim</FooterLink>
                    </FooterCol>

                    <FooterCol title="Sotuvchiga">
                        <FooterLink href="/sotuvchi">Sotuvchi bo&apos;lish</FooterLink>
                        <FooterLink href="/kabinet">Kabinet</FooterLink>
                    </FooterCol>

                    <FooterCol title="For Humo">
                        <FooterExt href="https://forhumo.uz">For Humo</FooterExt>
                        <FooterExt href="https://forhumo.uz/uz/id">Humo ID</FooterExt>
                        <FooterExt href="https://forhumo.uz/uz/pay">ALKH Pay</FooterExt>
                    </FooterCol>
                </div>
            </div>

            <div style={{ borderTop: `1px solid ${BN.border}` }}>
                <div className="mx-auto max-w-[1280px] px-4 py-5 flex flex-col sm:flex-row items-center justify-between gap-2">
                    <p className="text-[12px]" style={{ color: BN.text3 }}>
                        © {new Date().getFullYear()} Bozor Narxida
                    </p>
                    <p className="text-[12px]" style={{ color: BN.text3 }}>
                        For Humo loyihalaridan biri
                    </p>
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
