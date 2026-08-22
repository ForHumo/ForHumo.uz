"use client";

import { useEffect, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Loader2, Trash2, ShoppingBag, Minus, Plus } from "lucide-react";
import { BELIS, BELIS_GOLD_GRADIENT } from "@/lib/belis-theme";
import { BelisLink } from "./belis-nav";

interface CartItem {
    id: string; quantity: number;
    product: {
        id: string; slug: string;
        nameUz: string; nameRu?: string | null; nameEn?: string | null;
        images: string[]; price: number; currency: string; stock: number;
    };
}

export function BelisCart() {
    const t = useTranslations("belis");
    const locale = useLocale();
    const [items, setItems] = useState<CartItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [busy, setBusy] = useState<string | null>(null);

    async function load() {
        setLoading(true);
        try {
            const r = await fetch("/api/belis/cart", { cache: "no-store" });
            if (r.ok) { const d = await r.json(); setItems(d.items ?? []); }
        } finally { setLoading(false); }
    }
    useEffect(() => { load(); }, []);

    async function updateQty(id: string, quantity: number) {
        setBusy(id);
        try {
            const r = await fetch("/api/belis/cart", {
                method: "PATCH", headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ id, quantity }),
            });
            if (r.ok) setItems(prev => prev.map(x => x.id === id ? { ...x, quantity } : x));
        } finally { setBusy(null); }
    }
    async function remove(id: string) {
        setBusy(id);
        try {
            const r = await fetch(`/api/belis/cart?id=${id}`, { method: "DELETE" });
            if (r.ok) setItems(prev => prev.filter(x => x.id !== id));
        } finally { setBusy(null); }
    }

    const pickName = (p: CartItem["product"]) =>
        locale === "ru" && p.nameRu ? p.nameRu : locale === "en" && p.nameEn ? p.nameEn : p.nameUz;
    const fmt = (n: number, cur: string) =>
        `${new Intl.NumberFormat(locale === "ru" ? "ru-RU" : "uz-UZ").format(n)} ${cur === "USD" ? "$" : "so'm"}`;

    const subtotal = items.reduce((s, i) => s + i.product.price * i.quantity, 0);

    return (
        <div className="max-w-3xl mx-auto px-4 py-6">
            <h1 style={{ fontFamily: "'Playfair Display', serif", color: BELIS.gold, fontSize: 36, textAlign: "center", margin: "0 0 24px" }}>
                {t("cart.title")}
            </h1>

            {loading ? (
                <div className="flex justify-center py-16"><Loader2 className="w-6 h-6 animate-spin" style={{ color: BELIS.gold }} /></div>
            ) : items.length === 0 ? (
                <div className="text-center py-16 rounded-2xl"
                    style={{ background: BELIS.surface, border: `1px dashed ${BELIS.border}` }}>
                    <ShoppingBag className="w-10 h-10 mx-auto mb-3" strokeWidth={1.25} style={{ color: BELIS.text3 }} />
                    <p className="text-sm mb-4" style={{ color: BELIS.text2 }}>{t("cart.empty")}</p>
                    <BelisLink href="/belis/katalog"
                        className="inline-block px-5 py-2 rounded-full text-xs font-bold"
                        style={{ background: BELIS_GOLD_GRADIENT, color: BELIS.onGold, fontFamily: "'Montserrat', sans-serif" }}>
                        {t("cart.emptyCta")}
                    </BelisLink>
                </div>
            ) : (
                <>
                    <div className="space-y-3">
                        {items.map(it => {
                            const name = pickName(it.product);
                            const img = it.product.images[0];
                            const disabled = busy === it.id;
                            return (
                                <div key={it.id} className="flex gap-3 p-3 rounded-2xl"
                                    style={{ background: BELIS.surface, border: `1px solid ${BELIS.borderSoft}` }}>
                                    <BelisLink href={`/belis/p/${it.product.slug}`}
                                        className="w-20 h-20 rounded-lg overflow-hidden flex-shrink-0"
                                        style={{ background: "rgba(212,175,55,0.06)" }}>
                                        {img && (
                                            // eslint-disable-next-line @next/next/no-img-element
                                            <img src={img} alt={name} className="w-full h-full object-cover" />
                                        )}
                                    </BelisLink>
                                    <div className="flex-1 min-w-0 flex flex-col">
                                        <p className="text-sm font-bold line-clamp-2" style={{ color: BELIS.text, fontFamily: "'Playfair Display', serif" }}>{name}</p>
                                        <p className="text-sm font-black mt-auto" style={{ color: BELIS.gold, fontFamily: "'Montserrat', sans-serif" }}>
                                            {fmt(it.product.price, it.product.currency)}
                                        </p>
                                    </div>
                                    <div className="flex flex-col items-end justify-between">
                                        <button onClick={() => remove(it.id)} disabled={disabled}
                                            className="w-8 h-8 rounded-full flex items-center justify-center hover:brightness-95 disabled:opacity-50"
                                            style={{ background: BELIS.errSoft }}>
                                            <Trash2 className="w-3.5 h-3.5" strokeWidth={1.5} style={{ color: BELIS.err }} />
                                        </button>
                                        <div className="flex items-center rounded-lg overflow-hidden"
                                            style={{ background: BELIS.bg, border: `1px solid ${BELIS.border}` }}>
                                            <button onClick={() => updateQty(it.id, Math.max(1, it.quantity - 1))}
                                                disabled={disabled || it.quantity <= 1}
                                                className="w-7 h-7 flex items-center justify-center disabled:opacity-40"
                                                style={{ color: BELIS.gold }}>
                                                <Minus className="w-3 h-3" strokeWidth={2} />
                                            </button>
                                            <span className="w-8 text-center text-sm font-bold" style={{ color: BELIS.text }}>{it.quantity}</span>
                                            <button onClick={() => updateQty(it.id, Math.min(99, it.quantity + 1))}
                                                disabled={disabled}
                                                className="w-7 h-7 flex items-center justify-center disabled:opacity-40"
                                                style={{ color: BELIS.gold }}>
                                                <Plus className="w-3 h-3" strokeWidth={2} />
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>

                    <div className="mt-6 p-4 rounded-2xl"
                        style={{ background: BELIS.surface, border: `1px solid ${BELIS.border}` }}>
                        <div className="flex justify-between items-baseline mb-1">
                            <span className="text-sm" style={{ color: BELIS.text2 }}>{t("cart.subtotal")}</span>
                            <span className="text-lg font-black" style={{ color: BELIS.gold }}>
                                {fmt(subtotal, items[0]?.product.currency ?? "UZS")}
                            </span>
                        </div>
                        <p className="text-[10px] italic mb-3" style={{ color: BELIS.text3 }}>
                            Yetkazish narxi tanlangan usuldan kelib chiqib hisoblanadi
                        </p>
                        <BelisLink href="/belis/checkout"
                            className="block text-center py-3 rounded-xl text-sm font-black transition hover:brightness-110"
                            style={{ background: BELIS_GOLD_GRADIENT, color: BELIS.onGold, boxShadow: "0 6px 16px rgba(212,175,55,0.35)", fontFamily: "'Montserrat', sans-serif" }}>
                            {t("cart.checkout")}
                        </BelisLink>
                    </div>
                </>
            )}
        </div>
    );
}
