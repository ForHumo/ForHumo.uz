"use client";

// Belis "Tez orada" placeholder — Sevimlilar / Savat / Humo AI kabi v1.0'da
// ishlamaydigan bo'limlar uchun. Silliq, brand'ga mos, chalkash emas.

import { Clock, ChevronRight } from "lucide-react";
import { BELIS, BELIS_GOLD_GRADIENT } from "@/lib/belis-theme";
import { BelisLink } from "./belis-nav";

interface Props {
    title: string;
    description: string;
    icon?: React.ReactNode;
    /** Rasm ikonka (Humo AI logo kabi) */
    imageSrc?: string;
}

export function BelisComingSoon({ title, description, icon, imageSrc }: Props) {
    return (
        <div className="max-w-md mx-auto px-4 py-16 text-center">
            <div className="rounded-3xl p-8"
                style={{ background: BELIS.surface, border: `1px solid ${BELIS.border}` }}>
                <span className="w-16 h-16 rounded-2xl grid place-items-center mx-auto mb-5"
                    style={{ background: BELIS_GOLD_GRADIENT, color: BELIS.onGold }}>
                    {imageSrc ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={imageSrc} alt="" className="h-8 w-auto object-contain" />
                    ) : icon ?? <Clock className="w-8 h-8" />}
                </span>
                <p className="text-[11px] font-black uppercase tracking-widest mb-2" style={{ color: BELIS.goldDeep }}>
                    Tez orada
                </p>
                <h1 className="text-[22px] font-black mb-2 tracking-tight" style={{ color: BELIS.text }}>
                    {title}
                </h1>
                <p className="text-[13.5px] leading-relaxed mb-6" style={{ color: BELIS.text2 }}>
                    {description}
                </p>
                <BelisLink href="/katalog"
                    className="inline-flex items-center gap-2 h-11 px-5 rounded-xl text-[13px] font-black"
                    style={{ background: BELIS_GOLD_GRADIENT, color: BELIS.onGold }}>
                    Katalogga o&apos;tish <ChevronRight className="w-4 h-4" />
                </BelisLink>
            </div>
        </div>
    );
}
