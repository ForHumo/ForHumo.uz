"use client";

// Home "Mashinamga mos" qatori — xaridor garajidagi mashinaga (localStorage)
// to'g'ri keladigan avto qismlar. Garaj yo'q yoki mos mahsulot yo'q bo'lsa
// yashirin (boshqa home qatorlari kabi).

import { useEffect, useState } from "react";
import { Car, ChevronRight } from "lucide-react";
import { BN } from "@/lib/bn-theme";
import { BnLink } from "./bn-nav";
import { BnProductCard } from "./bn-product-card";
import { useGarage } from "./bn-garage";
import type { BnProductDTO } from "@/lib/bn-data";

export function BnGarageRow() {
    const { car, ready } = useGarage();
    const [items, setItems] = useState<BnProductDTO[] | null>(null);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (!ready || !car) { setItems(null); return; }
        let alive = true;
        setLoading(true);
        (async () => {
            try {
                const r = await fetch(`/api/bn/products/search?car=${encodeURIComponent(car.modelId)}&limit=12`);
                const d = await r.json();
                if (alive) setItems((d.products ?? []) as BnProductDTO[]);
            } catch {
                if (alive) setItems([]);
            } finally {
                if (alive) setLoading(false);
            }
        })();
        return () => { alive = false; };
    }, [ready, car]);

    if (!ready || !car) return null;
    if (!loading && (!items || items.length === 0)) return null;

    return (
        <section className="mb-10">
            <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2.5 min-w-0">
                    <div className="w-9 h-9 grid place-items-center rounded-xl flex-shrink-0" style={{ background: BN.gold, color: BN.onGold }}>
                        <Car className="w-[18px] h-[18px]" strokeWidth={2.2} />
                    </div>
                    <div className="min-w-0">
                        <h2 className="text-[17px] sm:text-[19px] font-black leading-tight truncate">Mashinamga mos</h2>
                        <p className="text-[12px] truncate" style={{ color: BN.gold }}>{car.makeName} {car.modelName}</p>
                    </div>
                </div>
                <BnLink href="/k/avto" className="flex items-center gap-1 text-[13px] font-bold flex-shrink-0 hover:opacity-70 transition-opacity" style={{ color: BN.text3 }}>
                    Barchasi
                    <ChevronRight className="w-4 h-4" />
                </BnLink>
            </div>

            {loading && !items ? (
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
                    {Array.from({ length: 5 }).map((_, i) => (
                        <div key={i} className="rounded-2xl animate-pulse" style={{ background: BN.surfaceUp, aspectRatio: "3/4" }} />
                    ))}
                </div>
            ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
                    {(items ?? []).slice(0, 10).map(p => <BnProductCard key={p.id} p={p} compact />)}
                </div>
            )}
        </section>
    );
}
