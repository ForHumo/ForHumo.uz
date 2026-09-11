"use client";

// BN xaridlarim ro'yxati (kabinet tab). Onlayn buyurtmalar + offline xaridlar.
// Muddat yaqinlashgan bo'lsa qizil badge, tugagan bo'lsa kulrang.

import { useCallback, useEffect, useState } from "react";
import { Loader2, ShoppingBag, Trash2, Store, Clock, Plus } from "lucide-react";
import { BnPurchaseModal } from "@/components/bn/bn-purchase-modal";
import { bnConfirm } from "@/components/bn/bn-dialog";

interface PurchaseItem {
    id: string;
    title: string;
    quantity: number;
    unit: string | null;
    priceUzs: number;
    purchasedAt: string;
    expiresAt: string | null;
    source: string;
    shop: { slug: string; name: string; marketName: string | null; marketSlug: string | null } | null;
    product: { slug: string; image: string | null } | null;
}

export function BnMyPurchases() {
    const [items, setItems] = useState<PurchaseItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [addOpen, setAddOpen] = useState(false);
    const [customShopSlug, setCustomShopSlug] = useState<string>("");
    const [customShopName, setCustomShopName] = useState<string>("");

    const load = useCallback(async () => {
        setLoading(true);
        try {
            const r = await fetch("/api/bn/purchases?limit=50", { cache: "no-store" });
            if (r.ok) {
                const j = await r.json();
                setItems(j.items ?? []);
            }
        } catch { /* noop */ }
        finally { setLoading(false); }
    }, []);

    useEffect(() => { void load(); }, [load]);

    const remove = useCallback(async (id: string) => {
        const ok = await bnConfirm({
            title: "Ro'yxatdan o'chirilsinmi?",
            danger: true,
        });
        if (!ok) return;
        await fetch(`/api/bn/purchases?id=${id}`, { method: "DELETE" });
        void load();
    }, [load]);

    if (loading) {
        return (
            <div className="flex justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin text-neutral-400" />
            </div>
        );
    }

    return (
        <div className="space-y-3">
            <div className="flex items-center justify-between">
                <h2 className="text-sm font-semibold flex items-center gap-1.5">
                    <ShoppingBag className="w-4 h-4 text-amber-500" />
                    Xaridlarim
                </h2>
                <button
                    onClick={() => { setCustomShopSlug(""); setCustomShopName("Boshqa do'kon"); setAddOpen(true); }}
                    className="text-xs px-2.5 py-1 rounded border border-neutral-300 dark:border-neutral-700 hover:bg-neutral-100 dark:hover:bg-neutral-800 flex items-center gap-1"
                >
                    <Plus className="w-3.5 h-3.5" />
                    Qo'shish
                </button>
            </div>

            {items.length === 0 ? (
                <div className="text-xs text-neutral-500 text-center py-6 border border-dashed border-neutral-300 dark:border-neutral-700 rounded-lg">
                    Hozircha xarid tarixi yo'q.<br/>
                    Do'konda QR skan qiling yoki qo'lda qo'shing.
                </div>
            ) : (
                <div className="space-y-2">
                    {items.map(p => <PurchaseRow key={p.id} p={p} onRemove={remove} />)}
                </div>
            )}

            <p className="text-[11px] text-neutral-500 text-center">
                Muddati yaqin bo'lgan mahsulotlar uchun Web Push bildirishnomasi keladi.
            </p>

            {addOpen && (
                <BnPurchaseModal
                    shopSlug={customShopSlug || "boshqa"}
                    shopName={customShopName || "Boshqa do'kon"}
                    onClose={() => setAddOpen(false)}
                    onSaved={() => void load()}
                />
            )}
        </div>
    );
}

function PurchaseRow({ p, onRemove }: { p: PurchaseItem; onRemove: (id: string) => void }) {
    const expiryInfo = getExpiryInfo(p.expiresAt);
    return (
        <div className="flex items-start gap-3 p-3 rounded-lg border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900">
            {p.product?.image ? (
                <img src={p.product.image} alt="" className="w-12 h-12 rounded object-cover" />
            ) : (
                <div className="w-12 h-12 rounded bg-neutral-100 dark:bg-neutral-800 flex items-center justify-center">
                    <ShoppingBag className="w-5 h-5 text-neutral-400" />
                </div>
            )}

            <div className="flex-1 min-w-0">
                <div className="text-sm font-medium truncate">{p.title}</div>
                <div className="text-xs text-neutral-500 flex items-center gap-1 mt-0.5">
                    <Store className="w-3 h-3" />
                    {p.shop?.name ?? "—"}
                    {p.shop?.marketName && <span>· {p.shop.marketName}</span>}
                </div>
                <div className="flex items-center gap-2 text-xs mt-1.5">
                    {p.priceUzs > 0 && (
                        <span className="text-neutral-600 dark:text-neutral-400">
                            {formatSum(p.priceUzs)} so'm{p.quantity > 1 ? ` × ${p.quantity}` : ""}
                        </span>
                    )}
                    {expiryInfo && (
                        <span className={`px-1.5 py-0.5 rounded flex items-center gap-1 ${expiryInfo.color}`}>
                            <Clock className="w-3 h-3" />
                            {expiryInfo.label}
                        </span>
                    )}
                </div>
                <div className="text-[10px] text-neutral-400 mt-0.5">
                    {new Date(p.purchasedAt).toLocaleDateString("uz-UZ")}
                    {p.source !== "ONLINE_ORDER" && " · qo'lda"}
                </div>
            </div>

            <button
                onClick={() => onRemove(p.id)}
                className="p-1.5 text-neutral-400 hover:text-rose-500"
                title="Yashirish"
            >
                <Trash2 className="w-4 h-4" />
            </button>
        </div>
    );
}

function getExpiryInfo(iso: string | null): { label: string; color: string } | null {
    if (!iso) return null;
    const t = new Date(iso).getTime();
    const now = Date.now();
    const days = Math.round((t - now) / (24 * 60 * 60 * 1000));
    if (days < 0) return { label: `${-days} kun oldin tugadi`, color: "bg-neutral-200 dark:bg-neutral-800 text-neutral-500" };
    if (days === 0) return { label: `Bugun tugaydi`, color: "bg-rose-100 dark:bg-rose-900/30 text-rose-600" };
    if (days <= 2) return { label: `${days} kun qoldi`, color: "bg-amber-100 dark:bg-amber-900/30 text-amber-700" };
    if (days <= 7) return { label: `${days} kun`, color: "bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700" };
    return null;
}

function formatSum(n: number): string {
    return new Intl.NumberFormat("uz-UZ").format(n);
}
