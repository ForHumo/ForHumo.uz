"use client";

// Do'kon sahifasida "Xarid qildim" tugmasi.
// URL'da ?buy=1 bo'lsa (QR skan qilib kelinsa) — avtomatik modal ochiladi.

import { useEffect, useState } from "react";
import { ShoppingBag } from "lucide-react";
import { BnPurchaseModal } from "@/components/bn/bn-purchase-modal";

export function BnBuyCta({ shopSlug, shopName }: { shopSlug: string; shopName: string }) {
    const [open, setOpen] = useState(false);

    useEffect(() => {
        if (typeof window === "undefined") return;
        const params = new URL(window.location.href).searchParams;
        if (params.get("buy") === "1") {
            setOpen(true);
            // URL'dan ?buy=1 ni tozalash (refresh'da qayta ochilmasin)
            const cleaned = new URL(window.location.href);
            cleaned.searchParams.delete("buy");
            window.history.replaceState({}, "", cleaned.toString());
        }
    }, []);

    return (
        <>
            <button
                onClick={() => setOpen(true)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-500 text-white text-xs font-medium hover:bg-amber-600"
            >
                <ShoppingBag className="w-3.5 h-3.5" />
                Xarid qildim
            </button>

            {open && (
                <BnPurchaseModal
                    shopSlug={shopSlug}
                    shopName={shopName}
                    onClose={() => setOpen(false)}
                />
            )}
        </>
    );
}
