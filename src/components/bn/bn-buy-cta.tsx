"use client";

// Do'kon sahifasida "Xarid qildim" tugmasi + QR skan modal.
// ?buy=1  → "Xarid qildim" modal (mavjud tarixga qo'shish)
// ?scan=1 → 2 tugmali chooser modal (Xarid qilaman | Xarid qildim)

import { useEffect, useState } from "react";
import { ShoppingBag, ShoppingCart, X, ChevronRight } from "lucide-react";
import { BnPurchaseModal } from "@/components/bn/bn-purchase-modal";
import { BnLink } from "@/components/bn/bn-nav";

export function BnBuyCta({ shopSlug, shopName }: { shopSlug: string; shopName: string }) {
    const [purchaseOpen, setPurchaseOpen] = useState(false);
    const [chooserOpen, setChooserOpen] = useState(false);

    useEffect(() => {
        if (typeof window === "undefined") return;
        const params = new URL(window.location.href).searchParams;
        if (params.get("scan") === "1") {
            setChooserOpen(true);
            const cleaned = new URL(window.location.href);
            cleaned.searchParams.delete("scan");
            window.history.replaceState({}, "", cleaned.toString());
        } else if (params.get("buy") === "1") {
            setPurchaseOpen(true);
            const cleaned = new URL(window.location.href);
            cleaned.searchParams.delete("buy");
            window.history.replaceState({}, "", cleaned.toString());
        }
    }, []);

    return (
        <>
            <button
                onClick={() => setPurchaseOpen(true)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-500 text-white text-xs font-medium hover:bg-amber-600"
            >
                <ShoppingBag className="w-3.5 h-3.5" />
                Xarid qildim
            </button>

            {purchaseOpen && (
                <BnPurchaseModal
                    shopSlug={shopSlug}
                    shopName={shopName}
                    onClose={() => setPurchaseOpen(false)}
                />
            )}

            {chooserOpen && (
                <ScanChooser
                    shopSlug={shopSlug}
                    shopName={shopName}
                    onPurchase={() => { setChooserOpen(false); setPurchaseOpen(true); }}
                    onClose={() => setChooserOpen(false)}
                />
            )}
        </>
    );
}

function ScanChooser({
    shopSlug, shopName, onPurchase, onClose,
}: {
    shopSlug: string; shopName: string;
    onPurchase: () => void; onClose: () => void;
}) {
    return (
        <div className="fixed inset-0 z-[200] bg-black/60 flex items-end sm:items-center justify-center p-0 sm:p-4">
            <div className="w-full sm:max-w-sm bg-white dark:bg-neutral-900 rounded-t-2xl sm:rounded-2xl shadow-xl overflow-hidden">
                <div className="flex items-center justify-between px-4 py-3 border-b border-neutral-200 dark:border-neutral-800">
                    <div>
                        <div className="text-sm font-semibold">{shopName}</div>
                        <div className="text-xs text-neutral-500">Skanlash muvaffaqiyatli</div>
                    </div>
                    <button onClick={onClose} className="p-1.5 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded">
                        <X className="w-4 h-4" />
                    </button>
                </div>

                <div className="p-4 space-y-2">
                    <p className="text-xs text-neutral-600 dark:text-neutral-400 mb-2">
                        Nima qilmoqchisiz?
                    </p>

                    {/* Xarid qilaman — For Pay bilan */}
                    <BnLink
                        href={`/d/${shopSlug}`}
                        onClick={onClose}
                        className="flex items-center gap-3 p-3 rounded-xl border border-amber-400 bg-amber-50 dark:bg-amber-950/30 hover:bg-amber-100 dark:hover:bg-amber-950/50"
                    >
                        <div className="w-10 h-10 rounded-lg bg-amber-500 text-white flex items-center justify-center">
                            <ShoppingCart className="w-5 h-5" />
                        </div>
                        <div className="flex-1 min-w-0">
                            <div className="text-sm font-semibold">Xarid qilaman</div>
                            <div className="text-xs text-neutral-600 dark:text-neutral-400">
                                Mahsulotni tanlab For Pay hamyoni bilan to&apos;lang
                            </div>
                        </div>
                        <ChevronRight className="w-4 h-4 text-neutral-400" />
                    </BnLink>

                    {/* Xarid qildim — tarixga */}
                    <button
                        onClick={onPurchase}
                        className="w-full flex items-center gap-3 p-3 rounded-xl border border-neutral-300 dark:border-neutral-700 hover:bg-neutral-50 dark:hover:bg-neutral-800 text-left"
                    >
                        <div className="w-10 h-10 rounded-lg bg-neutral-200 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 flex items-center justify-center">
                            <ShoppingBag className="w-5 h-5" />
                        </div>
                        <div className="flex-1 min-w-0">
                            <div className="text-sm font-semibold">Xarid qildim</div>
                            <div className="text-xs text-neutral-600 dark:text-neutral-400">
                                Naqd/karta bilan to&apos;lagan xaridni tarixga qo&apos;shish
                            </div>
                        </div>
                        <ChevronRight className="w-4 h-4 text-neutral-400" />
                    </button>
                </div>

                <div className="px-4 pb-3 text-[11px] text-neutral-500">
                    Muddat yaqinlashsa yoki arzon variant paydo bo&apos;lsa xabar beramiz.
                </div>
            </div>
        </div>
    );
}
