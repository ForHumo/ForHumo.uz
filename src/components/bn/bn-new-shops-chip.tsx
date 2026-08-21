"use client";

// BN home "Yangi ochilgan do'konlar" chip — supply-side social proof.
// Kompakt (avatar stack + count + link). Do'konlar oshib borayotgani
// signalini beradi (foydalanuvchi platforma o'sib borayotganini ko'radi
// va qaytishga motivatsiya oladi).

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Store, ArrowRight } from "lucide-react";
import { BN } from "@/lib/bn-theme";
import { BnLink } from "./bn-nav";

interface PreviewShop {
    slug: string;
    name: string;
    logoUrl: string | null;
    location: string;
}

interface Data {
    count: number;
    preview: PreviewShop[];
}

export function BnNewShopsChip() {
    const t = useTranslations("bn.newShops");
    const [data, setData] = useState<Data | null>(null);

    useEffect(() => {
        fetch("/api/bn/new-shops")
            .then(r => r.ok ? r.json() : null)
            .then(d => setData(d))
            .catch(() => setData(null));
    }, []);

    // Faqat >=3 yangi do'kon bo'lsa ko'rsatiladi (kambag'al signalni yashirish)
    if (!data || data.count < 3) return null;

    return (
        <section className="mb-4">
            <BnLink href="/dokonlar"
                className="flex items-center gap-3 px-3 py-2.5 rounded-xl transition-transform active:scale-[0.99]"
                style={{ background: BN.surface, border: `1px solid ${BN.borderGold}` }}>
                {/* Avatar stack — 3 tagacha ko'rinadi */}
                <span className="flex items-center flex-shrink-0">
                    {data.preview.slice(0, 3).map((s, i) => (
                        <span key={s.slug}
                            className="w-7 h-7 rounded-full overflow-hidden grid place-items-center flex-shrink-0"
                            style={{
                                background: BN.surfaceUp,
                                border: `2px solid ${BN.surface}`,
                                marginLeft: i === 0 ? 0 : -8,
                                zIndex: 3 - i,
                            }}>
                            {s.logoUrl ? (
                                // eslint-disable-next-line @next/next/no-img-element
                                <img src={s.logoUrl} alt="" loading="lazy" className="w-full h-full object-cover" />
                            ) : (
                                <Store className="w-3 h-3" style={{ color: BN.text3 }} />
                            )}
                        </span>
                    ))}
                </span>
                <p className="flex-1 min-w-0 text-[12.5px] leading-tight">
                    {t.rich("text", {
                        n: data.count,
                        b: (chunks) => <b style={{ color: BN.gold }}>{chunks}</b>,
                    })}
                </p>
                <ArrowRight className="w-3.5 h-3.5 flex-shrink-0" style={{ color: BN.gold }} />
            </BnLink>
        </section>
    );
}
