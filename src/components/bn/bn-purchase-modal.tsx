"use client";

// "Xarid qildim" modal — do'kon sahifasida QR skan qilib kelgan xaridor ochadi.
// Do'kon mahsulotlaridan biri yoki custom nom + narx kiritadi → yozib qo'yiladi.

import { useCallback, useEffect, useState } from "react";
import { X, Search, Loader2, Check, ShoppingBag } from "lucide-react";

interface Product {
    id: string;
    title: string;
    price: number;
    image?: string | null;
}

export function BnPurchaseModal({
    shopSlug, shopName, onClose, onSaved,
}: {
    shopSlug: string;
    shopName: string;
    onClose: () => void;
    onSaved?: () => void;
}) {
    const [query, setQuery] = useState("");
    const [products, setProducts] = useState<Product[]>([]);
    const [loading, setLoading] = useState(false);
    const [picked, setPicked] = useState<Product | null>(null);

    // Custom entry
    const [customTitle, setCustomTitle] = useState("");
    const [priceUzs, setPriceUzs] = useState<number>(0);
    const [quantity, setQuantity] = useState<number>(1);

    const [saving, setSaving] = useState(false);
    const [ok, setOk] = useState(false);
    const [err, setErr] = useState<string | null>(null);

    // Do'kon mahsulotlarini yuklaymiz (birinchi 20, keyin qidiruv bilan filterlaymiz)
    useEffect(() => {
        (async () => {
            setLoading(true);
            try {
                const r = await fetch(`/api/bn/shops/${shopSlug}/products?limit=30`, { cache: "no-store" });
                if (r.ok) {
                    const j = await r.json();
                    if (Array.isArray(j.products)) setProducts(j.products);
                }
            } catch { /* fail-safe */ }
            finally { setLoading(false); }
        })();
    }, [shopSlug]);

    const filtered = query
        ? products.filter(p => p.title.toLowerCase().includes(query.toLowerCase()))
        : products;

    const save = useCallback(async () => {
        setSaving(true);
        setErr(null);
        try {
            const body = picked
                ? {
                    shopSlug,
                    productId: picked.id,
                    title: picked.title,
                    quantity,
                    priceUzs: priceUzs || picked.price,
                }
                : {
                    shopSlug,
                    title: customTitle.trim(),
                    quantity,
                    priceUzs,
                };
            if (!picked && !customTitle.trim()) {
                setErr("Mahsulot nomini yozing yoki ro'yxatdan tanlang");
                setSaving(false); return;
            }
            const r = await fetch("/api/bn/purchases", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(body),
            });
            if (r.status === 401) {
                // Login talab qilinadi
                window.location.href = `/api/auth/signin?callbackUrl=${encodeURIComponent(window.location.href)}`;
                return;
            }
            const j = await r.json();
            if (r.ok) {
                setOk(true);
                onSaved?.();
                window.setTimeout(onClose, 1500);
            } else {
                setErr(j.error ?? "Xato");
            }
        } catch {
            setErr("Tarmoq xatosi");
        } finally { setSaving(false); }
    }, [picked, customTitle, quantity, priceUzs, shopSlug, onClose, onSaved]);

    return (
        <div className="fixed inset-0 z-[200] bg-black/60 flex items-end sm:items-center justify-center p-0 sm:p-4">
            <div className="w-full sm:max-w-md bg-white dark:bg-neutral-900 rounded-t-2xl sm:rounded-2xl shadow-xl max-h-[90vh] overflow-hidden flex flex-col">
                <div className="flex items-center justify-between px-4 py-3 border-b border-neutral-200 dark:border-neutral-800">
                    <div className="flex items-center gap-2">
                        <ShoppingBag className="w-5 h-5 text-amber-500" />
                        <div>
                            <div className="text-sm font-semibold">Xarid qildim</div>
                            <div className="text-xs text-neutral-500">{shopName}</div>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-1.5 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded">
                        <X className="w-4 h-4" />
                    </button>
                </div>

                {ok ? (
                    <div className="p-8 text-center">
                        <div className="w-14 h-14 mx-auto rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center mb-3">
                            <Check className="w-7 h-7 text-emerald-600" />
                        </div>
                        <div className="font-semibold">Xaridingiz saqlandi</div>
                        <div className="text-xs text-neutral-500 mt-1">Muddati yaqinlashsa xabar beramiz.</div>
                    </div>
                ) : (
                    <div className="flex-1 overflow-y-auto p-4 space-y-3">
                        {/* Do'kon mahsulotlari qidiruv */}
                        <div>
                            <label className="text-xs font-medium text-neutral-600 dark:text-neutral-400 mb-1 block">
                                Do'kon mahsulotlaridan tanlang
                            </label>
                            <div className="relative">
                                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
                                <input
                                    type="text"
                                    placeholder="Nom bo'yicha qidirish..."
                                    value={query}
                                    onChange={e => setQuery(e.target.value)}
                                    className="w-full pl-9 pr-3 py-2 border border-neutral-300 dark:border-neutral-700 rounded-lg bg-white dark:bg-neutral-950 text-sm"
                                />
                            </div>
                        </div>

                        {loading ? (
                            <div className="text-center py-4">
                                <Loader2 className="w-5 h-5 animate-spin text-neutral-400 mx-auto" />
                            </div>
                        ) : filtered.length > 0 ? (
                            <div className="space-y-1 max-h-40 overflow-y-auto">
                                {filtered.slice(0, 10).map(p => (
                                    <button
                                        key={p.id}
                                        onClick={() => { setPicked(p); setPriceUzs(p.price); setCustomTitle(""); }}
                                        className={`w-full text-left flex items-center gap-2 px-2 py-1.5 rounded ${picked?.id === p.id ? "bg-amber-100 dark:bg-amber-900/30" : "hover:bg-neutral-100 dark:hover:bg-neutral-800"}`}
                                    >
                                        <div className="flex-1 min-w-0">
                                            <div className="text-sm truncate">{p.title}</div>
                                            <div className="text-xs text-neutral-500">{formatSum(p.price)} so'm</div>
                                        </div>
                                        {picked?.id === p.id && <Check className="w-4 h-4 text-amber-600" />}
                                    </button>
                                ))}
                            </div>
                        ) : query ? (
                            <div className="text-xs text-neutral-500 text-center py-2">Topilmadi</div>
                        ) : null}

                        {/* YOKI custom nom */}
                        <div className="text-xs text-center text-neutral-400 py-1">— yoki —</div>

                        <div>
                            <label className="text-xs font-medium text-neutral-600 dark:text-neutral-400 mb-1 block">
                                Nom qo'lda kiriting
                            </label>
                            <input
                                type="text"
                                placeholder="Masalan: Yerto'la olma 2 kg"
                                value={customTitle}
                                onChange={e => { setCustomTitle(e.target.value); if (e.target.value) setPicked(null); }}
                                maxLength={200}
                                className="w-full px-3 py-2 border border-neutral-300 dark:border-neutral-700 rounded-lg bg-white dark:bg-neutral-950 text-sm"
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-2">
                            <div>
                                <label className="text-xs font-medium text-neutral-600 dark:text-neutral-400 mb-1 block">Miqdor</label>
                                <input
                                    type="number"
                                    min={1}
                                    value={quantity}
                                    onChange={e => setQuantity(Math.max(1, parseInt(e.target.value) || 1))}
                                    className="w-full px-3 py-2 border border-neutral-300 dark:border-neutral-700 rounded-lg bg-white dark:bg-neutral-950 text-sm"
                                />
                            </div>
                            <div>
                                <label className="text-xs font-medium text-neutral-600 dark:text-neutral-400 mb-1 block">Narx (so'm)</label>
                                <input
                                    type="number"
                                    min={0}
                                    value={priceUzs || ""}
                                    onChange={e => setPriceUzs(parseInt(e.target.value) || 0)}
                                    className="w-full px-3 py-2 border border-neutral-300 dark:border-neutral-700 rounded-lg bg-white dark:bg-neutral-950 text-sm"
                                    placeholder="0"
                                />
                            </div>
                        </div>

                        {err && <div className="text-xs text-rose-600">{err}</div>}

                        <button
                            onClick={save}
                            disabled={saving || (!picked && !customTitle.trim())}
                            className="w-full py-2.5 rounded-lg bg-amber-500 text-white text-sm font-semibold disabled:opacity-50 hover:bg-amber-600 flex items-center justify-center gap-2"
                        >
                            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                            Saqlash
                        </button>

                        <div className="text-[11px] text-neutral-500 text-center">
                            Muddati yaqinlashsa Web Push orqali xabar beramiz.
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}

function formatSum(n: number): string {
    return new Intl.NumberFormat("uz-UZ").format(n);
}
