"use client";

// Alohida qutilar katalogi + savat + "Ijaraga olish" tugmasi.
// BelisItemBookingWizard komplekt o'rniga items[] yuboradi.

import { useEffect, useState } from "react";
import { Loader2, Package, Plus, Minus, ShoppingBag } from "lucide-react";
import { BELIS, BELIS_GOLD_GRADIENT } from "@/lib/belis-theme";
import { BelisItemBookingWizard } from "./belis-item-booking-wizard";

interface Item {
    id: string;
    slug: string;
    kind: string;
    nameUz: string;
    images: string[];
    dailyRentUzs: number;
    deposit: number;
    copyCount: number;
    komplekt: { slug: string; nameUz: string } | null;
}

function fmtSom(n: number): string { return `${n.toLocaleString("uz-UZ")} so'm`; }

export function BelisItemsTab() {
    const [items, setItems] = useState<Item[] | null>(null);
    const [cart, setCart] = useState<Record<string, number>>({});
    const [wizardOpen, setWizardOpen] = useState(false);

    useEffect(() => {
        fetch("/api/belis/items", { cache: "no-store" })
            .then(r => r.json())
            .then(d => setItems(Array.isArray(d?.items) ? d.items : []))
            .catch(() => setItems([]));
    }, []);

    const cartCount = Object.values(cart).reduce((s, n) => s + n, 0);
    const cartItems = items?.filter(it => cart[it.slug] > 0) ?? [];
    const cartTotal = cartItems.reduce((s, it) => s + it.dailyRentUzs * cart[it.slug], 0);

    function inc(slug: string, max: number) {
        setCart(c => ({ ...c, [slug]: Math.min(max, (c[slug] ?? 0) + 1) }));
    }
    function dec(slug: string) {
        setCart(c => {
            const next = Math.max(0, (c[slug] ?? 0) - 1);
            const copy = { ...c };
            if (next === 0) delete copy[slug];
            else copy[slug] = next;
            return copy;
        });
    }

    if (items === null) {
        return (
            <div className="flex justify-center py-16">
                <Loader2 className="w-6 h-6 animate-spin" style={{ color: BELIS.gold }} />
            </div>
        );
    }

    if (items.length === 0) {
        return (
            <div className="text-center py-16 rounded-2xl"
                style={{ background: BELIS.surface, border: `1px solid ${BELIS.border}` }}>
                <Package className="w-10 h-10 mx-auto mb-3 opacity-60" style={{ color: BELIS.gold }} />
                <p className="text-[14px]" style={{ color: BELIS.text2 }}>Hozircha alohida qutilar yo&apos;q</p>
            </div>
        );
    }

    return (
        <>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                {items.map(it => {
                    const qty = cart[it.slug] ?? 0;
                    const inCart = qty > 0;
                    return (
                        <div key={it.id} className="rounded-2xl overflow-hidden flex flex-col"
                            style={{ background: BELIS.surface, border: `1px solid ${inCart ? BELIS.gold : BELIS.border}` }}>
                            <div className="relative aspect-square" style={{ background: BELIS.surfaceUp }}>
                                {it.images[0] && (
                                    // eslint-disable-next-line @next/next/no-img-element
                                    <img src={it.images[0]} alt={it.nameUz} className="w-full h-full object-cover" />
                                )}
                                {inCart && (
                                    <span className="absolute top-2 right-2 min-w-[24px] h-6 px-1.5 rounded-full text-[11px] font-black flex items-center justify-center"
                                        style={{ background: BELIS_GOLD_GRADIENT, color: BELIS.onGold }}>
                                        {qty}
                                    </span>
                                )}
                            </div>
                            <div className="p-3 flex-1 flex flex-col">
                                <p className="text-[12.5px] font-black line-clamp-2" style={{ color: BELIS.text }}>{it.nameUz}</p>
                                {it.komplekt && (
                                    <p className="text-[10px] mt-0.5" style={{ color: BELIS.text3 }}>
                                        {it.komplekt.nameUz}
                                    </p>
                                )}
                                <div className="mt-2">
                                    <p className="text-[13px] font-black tabular-nums" style={{ color: BELIS.goldDeep }}>
                                        {fmtSom(it.dailyRentUzs)}<span className="text-[10px] font-normal" style={{ color: BELIS.text3 }}>/kun</span>
                                    </p>
                                    <p className="text-[10.5px]" style={{ color: BELIS.text3 }}>
                                        Zaklat {fmtSom(it.deposit)}
                                    </p>
                                </div>
                                <div className="mt-auto pt-2">
                                    {qty === 0 ? (
                                        <button onClick={() => inc(it.slug, it.copyCount)}
                                            className="w-full h-9 rounded-lg text-[12px] font-black flex items-center justify-center gap-1"
                                            style={{ background: BELIS.goldSoft, color: BELIS.onGold }}>
                                            <Plus className="w-3.5 h-3.5" /> Savatga
                                        </button>
                                    ) : (
                                        <div className="flex items-center justify-between h-9 rounded-lg px-1"
                                            style={{ background: BELIS_GOLD_GRADIENT }}>
                                            <button onClick={() => dec(it.slug)}
                                                className="w-7 h-7 rounded-md grid place-items-center"
                                                style={{ background: "rgba(255,255,255,0.35)", color: BELIS.onGold }}>
                                                <Minus className="w-3.5 h-3.5" />
                                            </button>
                                            <span className="text-[13px] font-black tabular-nums" style={{ color: BELIS.onGold }}>
                                                {qty} / {it.copyCount}
                                            </span>
                                            <button onClick={() => inc(it.slug, it.copyCount)}
                                                disabled={qty >= it.copyCount}
                                                className="w-7 h-7 rounded-md grid place-items-center disabled:opacity-40"
                                                style={{ background: "rgba(255,255,255,0.35)", color: BELIS.onGold }}>
                                                <Plus className="w-3.5 h-3.5" />
                                            </button>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>

            {cartCount > 0 && (
                <div className="fixed bottom-24 left-0 right-0 z-[120] flex justify-center px-4 pointer-events-none">
                    <button onClick={() => setWizardOpen(true)}
                        className="pointer-events-auto flex items-center gap-3 h-14 px-5 rounded-2xl shadow-2xl"
                        style={{ background: BELIS_GOLD_GRADIENT, color: BELIS.onGold, boxShadow: "0 12px 32px rgba(212,175,55,0.35)" }}>
                        <span className="w-9 h-9 rounded-xl grid place-items-center"
                            style={{ background: "rgba(255,255,255,0.35)" }}>
                            <ShoppingBag className="w-4 h-4" />
                        </span>
                        <div className="text-left">
                            <p className="text-[11px] uppercase tracking-widest opacity-80">Savatda {cartCount} quti</p>
                            <p className="text-[14px] font-black">{fmtSom(cartTotal)}/kun</p>
                        </div>
                        <span className="text-[13px] font-black pl-2">Ijaraga olish →</span>
                    </button>
                </div>
            )}

            {wizardOpen && (
                <BelisItemBookingWizard
                    items={cartItems.map(it => ({
                        slug: it.slug, nameUz: it.nameUz, qty: cart[it.slug],
                        dailyRentUzs: it.dailyRentUzs, deposit: it.deposit,
                        images: it.images,
                    }))}
                    onClose={() => setWizardOpen(false)}
                    onClearCart={() => setCart({})}
                />
            )}
        </>
    );
}
