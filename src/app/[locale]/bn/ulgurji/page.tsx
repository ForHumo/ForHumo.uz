// Ulgurji (B2B) — faqat BN do'kon egalari ko'radi.
// Do'koni yo'q bo'lsa "Do'kon ochish" chaqiruvi.

import type { Metadata } from "next";
import { BnCatalog } from "@/components/bn/bn-catalog";
import { getMarkets, searchProducts, viewerCanSeeWholesale } from "@/lib/bn-data";
import { getBnAuth } from "@/lib/bn-auth";
import { BN } from "@/lib/bn-theme";
import { BnLink } from "@/components/bn/bn-nav";
import { Package, Store, ShieldCheck } from "lucide-react";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
    title: "Ulgurji",
    description: "Ulgurji (optom) mahsulotlar — faqat BN do'kon egalari uchun. Katta miqdorda arzon narxlar.",
};

export default async function Page() {
    const auth = await getBnAuth();
    const canSee = await viewerCanSeeWholesale(auth?.profileId ?? null);

    if (!canSee) {
        return (
            <div className="pt-6 pb-24 px-4 max-w-2xl mx-auto">
                <div
                    className="rounded-3xl p-6 text-center"
                    style={{ background: BN.surface, border: `1px solid ${BN.border}` }}
                >
                    <div
                        className="w-16 h-16 rounded-2xl grid place-items-center mx-auto mb-4"
                        style={{ background: BN.goldSoft, color: BN.gold }}
                    >
                        <Package className="w-8 h-8" />
                    </div>
                    <h1 className="text-[22px] font-black mb-2" style={{ color: BN.text }}>
                        Ulgurji bo'lim
                    </h1>
                    <p className="text-[14px] mb-5" style={{ color: BN.text2 }}>
                        Bu bo'limdan faqat <b>BN'da do'kon ochgan sotuvchilar</b> foydalanadi.
                        Ulgurji narxlar — chakana narxdan sezilarli arzon.
                    </p>

                    <div className="text-left space-y-3 mb-5 rounded-2xl p-4" style={{ background: BN.surfaceUp }}>
                        <div className="flex gap-3">
                            <ShieldCheck className="w-5 h-5 shrink-0" style={{ color: BN.gold }} />
                            <div>
                                <p className="text-[13px] font-black" style={{ color: BN.text }}>Xavfsizlik</p>
                                <p className="text-[12px]" style={{ color: BN.text2 }}>Faqat tekshirilgan do'kon egalari kirishi mumkin</p>
                            </div>
                        </div>
                        <div className="flex gap-3">
                            <Package className="w-5 h-5 shrink-0" style={{ color: BN.gold }} />
                            <div>
                                <p className="text-[13px] font-black" style={{ color: BN.text }}>Katta miqdor</p>
                                <p className="text-[12px]" style={{ color: BN.text2 }}>Har mahsulotning minimal buyurtma miqdori bor</p>
                            </div>
                        </div>
                        <div className="flex gap-3">
                            <Store className="w-5 h-5 shrink-0" style={{ color: BN.gold }} />
                            <div>
                                <p className="text-[13px] font-black" style={{ color: BN.text }}>Pog'onali narx</p>
                                <p className="text-[12px]" style={{ color: BN.text2 }}>Qancha ko'p olsangiz — birlik narxi shuncha arzon</p>
                            </div>
                        </div>
                    </div>

                    <BnLink
                        href="/sotuvchi"
                        className="inline-flex items-center justify-center gap-2 h-12 px-6 rounded-2xl text-[15px] font-black"
                        style={{ background: BN.gold, color: BN.onGold }}
                    >
                        <Store className="w-5 h-5" /> Do'kon ochish
                    </BnLink>

                    {!auth && (
                        <p className="text-[12px] mt-4" style={{ color: BN.text3 }}>
                            Avval Humo ID bilan tizimga kiring
                        </p>
                    )}
                </div>
            </div>
        );
    }

    const [products, markets] = await Promise.all([
        searchProducts({ profileId: auth?.profileId ?? null, wholesaleOnly: true, limit: 100 }),
        getMarkets(20),
    ]);

    return (
        <BnCatalog
            initialProducts={products}
            markets={markets}
            query="Ulgurji (B2B)"
        />
    );
}
