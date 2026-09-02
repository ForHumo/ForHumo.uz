"use client";

// BN Bir bosishda sotib olish tugmasi. Mahsulot detali sahifasida
// oddiy "Savatga qo'shish" yonida ko'rinadi. Foydalanuvchi default manzil
// + WALLET yetarli bo'lsa 1 bosishda buyurtma yaratadi.

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useLocale } from "next-intl";
import { Zap, Loader2, CheckCircle2 } from "lucide-react";
import { BN } from "@/lib/bn-theme";

interface Props {
    productId: string;
    variantId?: string | null;
    qty?: number;
    disabled?: boolean;
    className?: string;
}

export function BnOneClickBuy({ productId, variantId, qty = 1, disabled, className }: Props) {
    const locale = useLocale();
    const router = useRouter();
    const [busy, setBusy] = useState(false);
    const [done, setDone] = useState(false);
    const [err, setErr] = useState<string | null>(null);

    const t = (u: string, r: string, e: string) => locale === "ru" ? r : locale === "en" ? e : u;

    async function buy() {
        setBusy(true); setErr(null);
        try {
            const r = await fetch("/api/bn/orders/express", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ productId, variantId, qty }),
            });
            const d = await r.json();
            if (!r.ok) {
                const messages: Record<string, string> = {
                    auth_required: t("Kirish talab", "Требуется вход", "Login required"),
                    no_default_address: t("Default manzil qo'shing", "Добавьте адрес по умолчанию", "Add default address"),
                    no_phone: t("Telefon raqam kerak", "Нужен номер телефона", "Phone required"),
                    insufficient_balance: t("Hamyonda pul yetmadi", "Недостаточно средств", "Insufficient balance"),
                    out_of_stock: t("Mahsulot qolmadi", "Нет в наличии", "Out of stock"),
                    product_unavailable: t("Mahsulot mavjud emas", "Товар недоступен", "Unavailable"),
                    invalid_variant: t("Variant xato", "Неверный вариант", "Invalid variant"),
                };
                setErr(messages[d?.error] ?? t("Xatolik", "Ошибка", "Error"));
                return;
            }
            setDone(true);
            setTimeout(() => router.push(`/kabinet/buyurtma/${d.orderCode}`), 700);
        } catch {
            setErr(t("Tarmoq xatosi", "Ошибка сети", "Network error"));
        } finally {
            setBusy(false);
        }
    }

    return (
        <div className={className}>
            <button
                onClick={buy}
                disabled={disabled || busy || done}
                className="w-full h-12 rounded-xl text-[14px] font-black flex items-center justify-center gap-2 transition-all"
                style={{
                    background: done ? BN.ok : BN.gold,
                    color: BN.onGold,
                    opacity: disabled ? 0.5 : 1,
                }}
            >
                {done ? (
                    <>
                        <CheckCircle2 className="w-5 h-5" />
                        {t("Buyurtma yaratildi", "Заказ создан", "Order placed")}
                    </>
                ) : busy ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                    <>
                        <Zap className="w-4 h-4" fill="currentColor" />
                        {t("Bir bosishda sotib olish", "Купить в 1 клик", "Buy in 1 click")}
                    </>
                )}
            </button>
            {err && <p className="text-[12px] mt-2" style={{ color: BN.err }}>{err}</p>}
        </div>
    );
}
