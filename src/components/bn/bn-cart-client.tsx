"use client";

// BN savat — real DB, /api/bn/cart CRUD bilan. Login talab qiladi;
// kirmagan bo'lsa signIn kartasini ko'rsatadi.

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useSession, signIn } from "next-auth/react";
import { useTranslations } from "next-intl";
import {
    ShoppingCart, Trash2, Plus, Minus, LogIn, ArrowRight, Loader2,
    Store, Truck, Eye, Package,
} from "lucide-react";
import { BN, fmtPrice, priceRankOf, PRICE_RANK_META } from "@/lib/bn-theme";
import { BnLink } from "./bn-nav";
import { BnEmpty } from "./bn-cards";
import { BnCheckoutModal } from "./bn-checkout-modal";

export interface CartItem {
    id: string;
    qty: number;
    product: {
        id: string;
        slug: string;
        title: string;
        price: number;
        marketAvgPrice: number | null;
        images: string[];
        stock: number;
        allowDelivery: boolean;
        allowInspect: boolean;
        shopSlug: string;
        shopName: string;
        marketName: string | null;
        city: string;
    };
}

interface Props {
    initial: CartItem[];
    /** Boshlang'ich holat — server sahifadan uzatiladi */
    unauthenticated: boolean;
}

export function BnCartClient({ initial, unauthenticated }: Props) {
    const router = useRouter();
    const { status } = useSession();
    const t = useTranslations("bn.cart");
    const tProd = useTranslations("bn.product");
    const tAuth = useTranslations("bn");
    const [items, setItems] = useState<CartItem[]>(initial);
    const [busyIds, setBusyIds] = useState<Set<string>>(new Set());
    const [checkoutOpen, setCheckoutOpen] = useState(false);
    const notAuth = unauthenticated || status === "unauthenticated";

    async function setQty(id: string, qty: number) {
        setBusyIds(s => new Set([...s, id]));
        // Optimistik
        setItems(prev => prev.map(i => i.id === id ? { ...i, qty } : i));
        try {
            const r = await fetch("/api/bn/cart", {
                method: "PATCH",
                headers: { "content-type": "application/json" },
                body: JSON.stringify({ id, qty }),
            });
            const d = await r.json();
            if (d?.item) {
                setItems(prev => prev.map(i => i.id === id ? { ...i, qty: d.item.qty } : i));
            }
        } finally {
            setBusyIds(s => { const n = new Set(s); n.delete(id); return n; });
            router.refresh();
        }
    }

    async function remove(id: string) {
        setBusyIds(s => new Set([...s, id]));
        // Optimistik
        setItems(prev => prev.filter(i => i.id !== id));
        try {
            await fetch(`/api/bn/cart?id=${encodeURIComponent(id)}`, { method: "DELETE" });
            router.refresh();
        } finally {
            setBusyIds(s => { const n = new Set(s); n.delete(id); return n; });
        }
    }

    async function clear() {
        if (!confirm(t("clearConfirm"))) return;
        setItems([]);
        try {
            await fetch(`/api/bn/cart?all=1`, { method: "DELETE" });
            router.refresh();
        } catch { /* ignore */ }
    }

    if (notAuth) {
        return (
            <Wrap>
                <h1 className="text-[24px] sm:text-[30px] font-black tracking-tight mb-6">{t("title")}</h1>
                <div
                    className="max-w-[440px] mx-auto p-7 rounded-3xl text-center"
                    style={{ background: BN.surface, border: `1px solid ${BN.border}` }}
                >
                    <span
                        className="w-14 h-14 rounded-2xl grid place-items-center mx-auto mb-5"
                        style={{ background: BN.goldSoft, color: BN.gold }}
                    >
                        <ShoppingCart className="w-7 h-7" />
                    </span>
                    <p className="text-[18px] font-black mb-2">{t("signInTitle")}</p>
                    <p className="text-[13.5px] leading-relaxed mb-5" style={{ color: BN.text2 }}>
                        {t("signInText")}
                    </p>
                    <button
                        onClick={() => signIn("google")}
                        className="flex items-center justify-center gap-2 w-full h-12 rounded-2xl text-[15px] font-black"
                        style={{ background: BN.gold, color: BN.onGold }}
                    >
                        <LogIn className="w-5 h-5" />
                        {tAuth("auth.signInWithHumoID")}
                    </button>
                </div>
            </Wrap>
        );
    }

    if (items.length === 0) {
        return (
            <Wrap>
                <h1 className="text-[24px] sm:text-[30px] font-black tracking-tight mb-6">{t("title")}</h1>
                <BnEmpty
                    icon={<ShoppingCart className="w-6 h-6" />}
                    title={t("empty")}
                    text={t("emptyText")}
                    action={
                        <BnLink
                            href="/"
                            className="inline-flex h-11 px-5 items-center rounded-xl text-[14px] font-black"
                            style={{ background: BN.gold, color: BN.onGold }}
                        >
                            {t("startShopping")}
                        </BnLink>
                    }
                />
            </Wrap>
        );
    }

    // Do'kon bo'yicha guruhlash (checkout — har do'kon uchun alohida buyurtma)
    const groups = new Map<string, CartItem[]>();
    for (const it of items) {
        const key = it.product.shopSlug || "unknown";
        const arr = groups.get(key) ?? [];
        arr.push(it);
        groups.set(key, arr);
    }

    const subtotal = items.reduce((s, i) => s + i.product.price * i.qty, 0);
    const delivery = items.some(i => i.product.allowDelivery) ? 20_000 : 0;
    const total = subtotal + delivery;

    return (
        <Wrap>
            <div className="flex items-center justify-between gap-3 mb-6">
                <h1 className="text-[24px] sm:text-[30px] font-black tracking-tight">
                    {t("title")} <span className="text-[15px] font-bold" style={{ color: BN.text3 }}>{items.length} {t("countUnit")}</span>
                </h1>
                <button
                    onClick={clear}
                    className="text-[13px] font-bold flex items-center gap-1.5"
                    style={{ color: BN.err }}
                >
                    <Trash2 className="w-3.5 h-3.5" />
                    {t("clear")}
                </button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_360px] gap-6">
                {/* Chap: itemlar */}
                <div className="min-w-0 space-y-6">
                    {[...groups.entries()].map(([slug, groupItems]) => {
                        const first = groupItems[0].product;
                        return (
                            <section
                                key={slug}
                                className="rounded-2xl overflow-hidden"
                                style={{ background: BN.surface, border: `1px solid ${BN.border}` }}
                            >
                                <BnLink
                                    href={`/d/${slug}`}
                                    className="flex items-center gap-2 px-4 py-3 border-b transition-colors hover:opacity-80"
                                    style={{ borderColor: BN.border, color: BN.text }}
                                >
                                    <Store className="w-4 h-4" style={{ color: BN.gold }} />
                                    <span className="text-[14px] font-bold">{first.shopName}</span>
                                    <span className="text-[12px] ml-auto" style={{ color: BN.text3 }}>
                                        {first.marketName ?? first.city}
                                    </span>
                                </BnLink>

                                <ul>
                                    {groupItems.map(it => {
                                        const p = it.product;
                                        const rank = priceRankOf(p.price, p.marketAvgPrice);
                                        const rankMeta = rank ? PRICE_RANK_META[rank] : null;
                                        const busy = busyIds.has(it.id);
                                        return (
                                            <li
                                                key={it.id}
                                                className="flex gap-3 p-4"
                                                style={{ borderTop: `1px solid ${BN.border}` }}
                                            >
                                                <BnLink
                                                    href={`/p/${p.slug}`}
                                                    className="w-20 h-20 rounded-xl overflow-hidden flex-shrink-0"
                                                    style={{ background: BN.surfaceUp }}
                                                >
                                                    {p.images[0] && (
                                                        // eslint-disable-next-line @next/next/no-img-element
                                                        <img src={p.images[0]} alt="" className="w-full h-full object-cover" />
                                                    )}
                                                </BnLink>

                                                <div className="flex-1 min-w-0">
                                                    <BnLink
                                                        href={`/p/${p.slug}`}
                                                        className="block text-[13.5px] font-bold line-clamp-2 mb-1 transition-colors hover:text-[color:var(--bn-gold)]"
                                                    >
                                                        {p.title}
                                                    </BnLink>
                                                    <div className="flex items-baseline gap-2 mb-2">
                                                        <span className="text-[15px] font-black tabular-nums">
                                                            {fmtPrice(p.price)}
                                                        </span>
                                                        {rankMeta && (
                                                            <span className="text-[10.5px] font-bold" style={{ color: rankMeta.color }}>
                                                                {rank === "cheap" ? t("rankCheap") : rank === "fair" ? t("rankFair") : t("rankExpensive")}
                                                            </span>
                                                        )}
                                                    </div>
                                                    <div className="flex items-center gap-2 text-[11px]" style={{ color: BN.text3 }}>
                                                        {p.allowDelivery && (
                                                            <span className="flex items-center gap-1"><Truck className="w-3 h-3" />{tProd("wayDelivery")}</span>
                                                        )}
                                                        {p.allowInspect && (
                                                            <span className="flex items-center gap-1"><Eye className="w-3 h-3" />{tProd("wayInspect")}</span>
                                                        )}
                                                        <span>·</span>
                                                        <span>{t("stockLabel", { n: p.stock })}</span>
                                                    </div>
                                                </div>

                                                <div className="flex flex-col items-end justify-between flex-shrink-0">
                                                    <button
                                                        onClick={() => remove(it.id)}
                                                        disabled={busy}
                                                        aria-label={t("remove")}
                                                        className="w-8 h-8 grid place-items-center rounded-lg transition-colors hover:text-[color:var(--bn-err)]"
                                                        style={{ color: BN.text3 }}
                                                    >
                                                        <Trash2 className="w-4 h-4" />
                                                    </button>
                                                    <div
                                                        className="flex items-center rounded-xl overflow-hidden"
                                                        style={{ background: BN.surfaceUp, border: `1px solid ${BN.border}` }}
                                                    >
                                                        <QtyBtn onClick={() => setQty(it.id, Math.max(1, it.qty - 1))} disabled={busy || it.qty <= 1}>
                                                            <Minus className="w-3.5 h-3.5" />
                                                        </QtyBtn>
                                                        <span className="w-9 text-center text-[13px] font-black tabular-nums">
                                                            {busy ? <Loader2 className="w-3.5 h-3.5 animate-spin inline" /> : it.qty}
                                                        </span>
                                                        <QtyBtn onClick={() => setQty(it.id, Math.min(p.stock, it.qty + 1))} disabled={busy || it.qty >= p.stock}>
                                                            <Plus className="w-3.5 h-3.5" />
                                                        </QtyBtn>
                                                    </div>
                                                </div>
                                            </li>
                                        );
                                    })}
                                </ul>
                            </section>
                        );
                    })}
                </div>

                {/* O'ng: yig'indi */}
                <aside className="lg:sticky lg:top-[132px] lg:self-start">
                    <div
                        className="rounded-2xl p-5"
                        style={{ background: BN.surface, border: `1px solid ${BN.border}` }}
                    >
                        <h2 className="text-[15px] font-black mb-4">{t("summary")}</h2>

                        <div className="space-y-2.5 text-[13.5px]">
                            <SumRow label={t("productsN", { n: items.length })} value={fmtPrice(subtotal)} />
                            <SumRow label={t("deliveryTashkent")} value={delivery > 0 ? fmtPrice(delivery) : t("free")} />
                        </div>

                        <div
                            className="flex items-baseline justify-between mt-4 pt-4"
                            style={{ borderTop: `1px solid ${BN.border}` }}
                        >
                            <span className="text-[14px] font-bold">{t("total")}</span>
                            <span className="text-[22px] font-black tabular-nums">{fmtPrice(total)}</span>
                        </div>

                        <button
                            onClick={() => setCheckoutOpen(true)}
                            className="flex items-center justify-center gap-2 w-full h-13 mt-5 rounded-2xl text-[15px] font-black transition-transform active:scale-[0.98]"
                            style={{ height: 52, background: BN.gold, color: BN.onGold }}
                        >
                            {t("checkout")}
                            <ArrowRight className="w-4 h-4" />
                        </button>

                        {checkoutOpen && (
                            <BnCheckoutModal
                                subtotal={subtotal}
                                canDelivery={items.some(i => i.product.allowDelivery)}
                                canInspect={items.some(i => i.product.allowInspect)}
                                onClose={() => setCheckoutOpen(false)}
                            />
                        )}

                        <p className="flex items-center gap-1.5 text-[11.5px] mt-3" style={{ color: BN.text3 }}>
                            <Package className="w-3 h-3" />
                            {t("escrowNote")}
                        </p>
                    </div>
                </aside>
            </div>
        </Wrap>
    );
}

function Wrap({ children }: { children: React.ReactNode }) {
    return <div className="mx-auto max-w-[1280px] px-4 py-6 pb-16">{children}</div>;
}

function QtyBtn({ children, onClick, disabled }: { children: React.ReactNode; onClick: () => void; disabled?: boolean }) {
    return (
        <button
            onClick={onClick}
            disabled={disabled}
            className="w-8 h-8 grid place-items-center transition-opacity disabled:opacity-30"
        >
            {children}
        </button>
    );
}

function SumRow({ label, value }: { label: string; value: string }) {
    return (
        <div className="flex items-baseline justify-between">
            <span style={{ color: BN.text3 }}>{label}</span>
            <span className="font-bold tabular-nums">{value}</span>
        </div>
    );
}
