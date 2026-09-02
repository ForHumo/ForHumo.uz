"use client";

// BN mobile sticky bottom action bar. Product detail sahifasida faqat mobil
// (<640px) qurilmalarda ko'rinadi. Yuqori scroll qilganda action tugmalar
// bosh sahifada emas — bu ularni doim qulay qiladi. Standard e-commerce UX.

import { useEffect, useState } from "react";
import { useLocale } from "next-intl";
import { ShoppingCart, Zap, Loader2 } from "lucide-react";
import { BN } from "@/lib/bn-theme";
import { formatMoney } from "@/lib/money";
import { useRouter } from "next/navigation";

interface Props {
    productId: string;
    variantId?: string | null;
    price: number;
    stock: number;
    onAddToCart: () => void | Promise<void>;
    cartBusy?: boolean;
}

export function BnMobileActions({ productId, variantId, price, stock, onAddToCart, cartBusy }: Props) {
    const locale = useLocale();
    const router = useRouter();
    const [visible, setVisible] = useState(false);
    const [buying, setBuying] = useState(false);

    // Scroll bo'yicha ko'rinish (500px'dan pastga tushgach ko'rsatish)
    useEffect(() => {
        function onScroll() {
            setVisible(window.scrollY > 400);
        }
        window.addEventListener("scroll", onScroll, { passive: true });
        onScroll();
        return () => window.removeEventListener("scroll", onScroll);
    }, []);

    if (stock < 1) return null;

    const t = (u: string, r: string, e: string) => locale === "ru" ? r : locale === "en" ? e : u;

    async function express() {
        setBuying(true);
        try {
            const r = await fetch("/api/bn/orders/express", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ productId, variantId, qty: 1 }),
            });
            const d = await r.json();
            if (r.ok) router.push(`/kabinet/buyurtma/${d.orderCode}`);
            else if (d.error === "insufficient_balance") alert(t("Hamyonda pul yetmadi", "Недостаточно средств", "Insufficient balance"));
            else alert(t("Xatolik", "Ошибка", "Error"));
        } finally {
            setBuying(false);
        }
    }

    return (
        <div
            className={`sm:hidden fixed bottom-0 left-0 right-0 z-40 transition-transform ${visible ? "translate-y-0" : "translate-y-full"}`}
            style={{
                background: BN.surface,
                borderTop: `1px solid ${BN.border}`,
                paddingBottom: "env(safe-area-inset-bottom)",
            }}
        >
            <div className="flex items-center gap-2 p-3">
                <div className="flex-shrink-0">
                    <div className="text-[10px]" style={{ color: BN.text3 }}>
                        {t("Narx", "Цена", "Price")}
                    </div>
                    <div className="text-[15px] font-black leading-none" style={{ color: BN.gold }}>
                        {formatMoney(price, "UZS")}
                    </div>
                </div>
                <button
                    onClick={onAddToCart}
                    disabled={cartBusy}
                    className="flex-1 h-11 rounded-xl text-[13px] font-bold flex items-center justify-center gap-1.5 disabled:opacity-50"
                    style={{ background: BN.goldSoft, color: BN.gold, border: `1px solid ${BN.gold}` }}
                >
                    {cartBusy ? <Loader2 className="w-4 h-4 animate-spin" /> : <ShoppingCart className="w-4 h-4" />}
                    {t("Savat", "Корзина", "Cart")}
                </button>
                <button
                    onClick={express}
                    disabled={buying}
                    className="flex-1 h-11 rounded-xl text-[13px] font-black flex items-center justify-center gap-1.5 disabled:opacity-50"
                    style={{ background: BN.gold, color: BN.onGold }}
                >
                    {buying ? <Loader2 className="w-4 h-4 animate-spin" /> : <Zap className="w-4 h-4" fill="currentColor" />}
                    {t("1 bosishda", "1 клик", "1-click")}
                </button>
            </div>
        </div>
    );
}
