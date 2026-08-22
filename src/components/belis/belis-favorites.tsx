"use client";

import { useEffect, useState } from "react";
import { useSession, signIn } from "next-auth/react";
import { Heart, Loader2, LogIn } from "lucide-react";
import { BELIS, BELIS_GOLD_GRADIENT } from "@/lib/belis-theme";
import { BelisLink } from "./belis-nav";
import { BelisProductCard, type BelisProductLite } from "./belis-product-card";

export function BelisFavorites() {
    const { status } = useSession();
    const [items, setItems] = useState<BelisProductLite[] | null>(null);

    useEffect(() => {
        if (status !== "authenticated") { setItems([]); return; }
        fetch("/api/belis/favorites", { cache: "no-store" })
            .then(r => r.ok ? r.json() : null)
            .then(d => setItems(d?.items ?? []));
    }, [status]);

    if (status === "loading" || items === null) return (
        <div className="text-center py-16"><Loader2 className="w-6 h-6 animate-spin inline" style={{ color: BELIS.gold }} /></div>
    );

    if (status !== "authenticated") {
        return (
            <div className="max-w-md mx-auto px-4 py-16 text-center">
                <Heart className="w-14 h-14 mx-auto mb-3" strokeWidth={1.25} style={{ color: BELIS.gold }} />
                <p style={{ fontFamily: "'Playfair Display', serif", color: BELIS.gold, fontSize: 24, margin: "0 0 8px" }}>
                    Saqlangan mahsulotlar
                </p>
                <p className="text-sm mb-6" style={{ color: BELIS.text2 }}>
                    Yoqqan mahsulotlaringizni saqlash uchun Humo ID bilan kiring
                </p>
                <button onClick={() => signIn("google")}
                    className="inline-flex items-center gap-2 px-6 py-3 rounded-full text-sm font-black transition hover:brightness-110"
                    style={{ background: BELIS_GOLD_GRADIENT, color: BELIS.onGold, fontFamily: "'Montserrat', sans-serif" }}>
                    <LogIn className="w-4 h-4" strokeWidth={1.5} /> Google bilan kirish
                </button>
            </div>
        );
    }

    return (
        <div className="max-w-7xl mx-auto px-4 py-6">
            <div className="text-center mb-6">
                <h1 style={{ fontFamily: "'Playfair Display', serif", color: BELIS.gold, fontSize: 36, margin: 0 }}>
                    Saqlangan
                </h1>
                <p className="text-xs italic mt-1" style={{ color: BELIS.text2 }}>
                    Yoqqan mahsulotlaringiz shu yerda
                </p>
            </div>

            {items.length === 0 ? (
                <div className="text-center py-16 rounded-2xl"
                    style={{ background: BELIS.surface, border: `1px dashed ${BELIS.border}` }}>
                    <Heart className="w-10 h-10 mx-auto mb-3" strokeWidth={1.25} style={{ color: BELIS.text3 }} />
                    <p className="text-sm mb-4" style={{ color: BELIS.text2 }}>
                        Hali saqlangan mahsulot yo&apos;q
                    </p>
                    <BelisLink href="/belis/katalog"
                        className="inline-block px-5 py-2 rounded-full text-xs font-bold transition hover:brightness-110"
                        style={{ background: BELIS_GOLD_GRADIENT, color: BELIS.onGold, fontFamily: "'Montserrat', sans-serif" }}>
                        Katalogni ochish
                    </BelisLink>
                </div>
            ) : (
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 md:gap-4">
                    {items.map(p => <BelisProductCard key={p.id} product={p} />)}
                </div>
            )}
        </div>
    );
}
