"use client";

import React, { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Link } from "@/i18n/routing";
import Image from "next/image";
import {
    ShoppingCart, Trash2, Plus, Minus, Loader2, ShoppingBag,
    AlertCircle, CheckCircle2, Wallet, ChevronRight, ArrowLeft,
    MapPin, CreditCard, Banknote, Clock, Package, ChevronDown,
} from "lucide-react";
import { VerifiedBadge } from "./verified-badge";
import { LocationPicker } from "@/components/ui/location-picker";

interface CartProduct {
    id: string; name: string; slug: string; price: string;
    images: string[]; stock: number;
    brand: { name: string; slug: string; verified: boolean };
}
interface CartItem { id: string; productId: string; quantity: number; product: CartProduct; }

interface Order {
    id: string; total: string; status: string; paymentMethod: string;
    address: string; createdAt: string;
    items: { quantity: number; price: string; product: { name: string; images: string[]; brand: { name: string } } }[];
}

type PayMethod = "ZIJ" | "CASH_ON_DELIVERY" | "CARD_ON_DELIVERY";
type Tab = "cart" | "orders";

function fz(v: number | string) { return Number(v).toLocaleString(); }

const ORDER_STATUS: Record<string, { label: string; color: string }> = {
    PAID:       { label: "To'landi",      color: "text-emerald-500" },
    PENDING:    { label: "Kutilmoqda",    color: "text-amber-500"   },
    PROCESSING: { label: "Tayyorlanmoqda",color: "text-blue-500"    },
    SHIPPED:    { label: "Yo'lda",        color: "text-purple-500"  },
    DELIVERED:  { label: "Yetkazildi",    color: "text-emerald-600" },
    CANCELLED:  { label: "Bekor qilindi", color: "text-red-500"     },
};

const PAY_METHODS: { key: PayMethod; label: string; desc: string; icon: React.ElementType }[] = [
    { key: "ZIJ",              label: "Zij bilan to'lash", desc: "Darhol Zij hamyondan yechiladi",          icon: Wallet   },
    { key: "CASH_ON_DELIVERY", label: "Yetkazishda naqd",  desc: "Kuryer yetkazganda naqd pul to'lang",   icon: Banknote },
    { key: "CARD_ON_DELIVERY", label: "Yetkazishda karta", desc: "Kuryer yetkazganda karta orqali to'lang",icon: CreditCard},
];

export function MarketCart({ defaultTab = "cart" }: { defaultTab?: Tab }) {
    const [tab, setTab]             = useState<Tab>(defaultTab);
    const [items, setItems]         = useState<CartItem[]>([]);
    const [orders, setOrders]       = useState<Order[]>([]);
    const [loading, setLoading]     = useState(true);
    const [checkout, setCheckout]   = useState(false);
    const [address, setAddress]     = useState("");
    const [note, setNote]           = useState("");
    const [payMethod, setPayMethod] = useState<PayMethod>("ZIJ");
    const [paying, setPaying]       = useState(false);
    const [done, setDone]           = useState(false);
    const [error, setError]         = useState("");
    const [balance, setBalance]     = useState<number | null>(null);

    useEffect(() => {
        Promise.all([
            fetch("/api/market/cart").then(r => r.json()),
            fetch("/api/pay/wallet").then(r => r.json()),
            fetch("/api/market/orders").then(r => r.json()),
        ]).then(([cart, wallet, ord]) => {
            setItems(cart.items ?? []);
            setBalance(Number(wallet.balance ?? 0));
            setOrders(ord.orders ?? []);
        }).finally(() => setLoading(false));
    }, []);

    const total = items.reduce((s, i) => s + Number(i.product.price) * i.quantity, 0);

    async function updateQty(item: CartItem, delta: number) {
        const newQty = item.quantity + delta;
        if (newQty < 1) return removeItem(item.productId);
        setItems(prev => prev.map(i => i.productId === item.productId ? { ...i, quantity: newQty } : i));
        await fetch("/api/market/cart", {
            method: "PATCH", headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ productId: item.productId, quantity: newQty }),
        });
    }

    async function removeItem(productId: string) {
        setItems(prev => prev.filter(i => i.productId !== productId));
        await fetch("/api/market/cart", {
            method: "DELETE", headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ productId }),
        });
    }

    async function handleCheckout() {
        setError("");
        if (!address.trim()) { setError("Yetkazib berish manzilini kiriting"); return; }
        setPaying(true);
        try {
            const res = await fetch("/api/market/checkout", {
                method: "POST", headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ address: address.trim(), note: note.trim() || undefined, paymentMethod: payMethod }),
            });
            const data = await res.json();
            if (!res.ok) { setError(data.error); }
            else {
                setDone(true); setItems([]);
                if (data.newBalance !== null) setBalance(data.newBalance);
                // Buyurtmalar ro'yxatini yangilaymiz
                fetch("/api/market/orders").then(r => r.json()).then(d => setOrders(d.orders ?? []));
            }
        } catch { setError("Xatolik yuz berdi"); } finally { setPaying(false); }
    }

    if (loading) return (
        <div className="flex items-center justify-center min-h-[50vh]">
            <Loader2 size={28} className="animate-spin text-green-500" />
        </div>
    );

    if (done) return (
        <div className="container mx-auto px-4 max-w-xl py-20 text-center">
            <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
                transition={{ type: "spring", stiffness: 300, damping: 20 }}>
                <div className="relative w-20 h-20 mx-auto mb-6">
                    <motion.div className="absolute inset-0 rounded-full bg-green-400/30"
                        animate={{ scale: [1, 2.5], opacity: [0.5, 0] }} transition={{ duration: 1.5, repeat: Infinity }} />
                    <div className="relative w-full h-full rounded-full bg-green-500/20 flex items-center justify-center">
                        <CheckCircle2 size={36} className="text-green-500" />
                    </div>
                </div>
                <h2 className="text-2xl font-black text-gray-900 dark:text-white mb-2">Buyurtma qabul qilindi!</h2>
                <p className="text-gray-500 dark:text-white/40 mb-1">Manzil: {address}</p>
                <p className="text-gray-400 dark:text-white/30 text-sm mb-6">
                    {payMethod === "ZIJ" ? `${fz(total)} Ƶ to'landi` : "Yetkazishda to'lanadi"}
                </p>
                <div className="flex gap-3 justify-center">
                    <Link href="/market"
                        className="inline-flex items-center gap-2 px-6 py-3 rounded-2xl
                            bg-gradient-to-r from-green-600 to-emerald-500 text-white font-bold text-sm
                            shadow-lg shadow-green-500/20 hover:from-green-500 hover:to-emerald-400 transition-all">
                        Marketga qaytish
                    </Link>
                    <button onClick={() => { setDone(false); setTab("orders"); }}
                        className="px-6 py-3 rounded-2xl border border-green-200 dark:border-green-800/30
                            text-green-600 dark:text-green-400 font-bold text-sm hover:bg-green-50 dark:hover:bg-green-900/10 transition-all">
                        Buyurtmalarim
                    </button>
                </div>
            </motion.div>
        </div>
    );

    return (
        <div className="container mx-auto px-4 max-w-5xl py-8">
            {/* Breadcrumb */}
            <nav className="flex items-center gap-1.5 text-xs text-gray-400 mb-6">
                <Link href="/market" className="hover:text-green-600 transition-colors">Market</Link>
                <ChevronRight size={11} /><span className="text-gray-600 dark:text-white/50">Savat</span>
            </nav>

            {/* Tab: Savat | Buyurtmalarim */}
            <div className="flex gap-1 bg-gray-100/80 dark:bg-white/[0.04] rounded-2xl p-1 mb-6 w-fit">
                {([
                    { key: "cart"   as Tab, label: `Savat (${items.length})`,      icon: ShoppingCart },
                    { key: "orders" as Tab, label: `Buyurtmalarim (${orders.length})`, icon: Package     },
                ]).map(t => (
                    <button key={t.key} onClick={() => setTab(t.key)}
                        className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold transition-all
                            ${tab === t.key
                                ? "bg-white dark:bg-white/10 text-green-600 dark:text-green-400 shadow-sm"
                                : "text-gray-500 dark:text-white/30 hover:text-gray-700"}`}>
                        <t.icon size={14} />{t.label}
                    </button>
                ))}
            </div>

            {/* ── SAVAT ── */}
            {tab === "cart" && (
                <>
                    {!items.length ? (
                        <div className="text-center py-20">
                            <ShoppingCart size={48} className="text-gray-200 dark:text-white/10 mx-auto mb-4" />
                            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2">Savat bo'sh</h2>
                            <p className="text-gray-400 dark:text-white/30 mb-6 text-sm">Mahsulot qo'shing va xarid qiling</p>
                            <Link href="/market"
                                className="inline-flex items-center gap-2 px-6 py-3 rounded-2xl
                                    bg-gradient-to-r from-green-600 to-emerald-500 text-white font-bold text-sm">
                                <ArrowLeft size={16} /> Marketga o'tish
                            </Link>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                            {/* Mahsulotlar */}
                            <div className="lg:col-span-2 space-y-3">
                                <AnimatePresence>
                                    {items.map((item) => (
                                        <motion.div key={item.productId} layout
                                            initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }}
                                            exit={{ opacity: 0, x: -20 }}
                                            className="flex gap-4 bg-white/70 dark:bg-white/[0.03]
                                                border border-gray-100 dark:border-white/[0.05]
                                                rounded-2xl p-4">
                                            <Link href={`/market/product/${item.product.slug}`}
                                                className="w-20 h-20 rounded-xl overflow-hidden bg-gray-50 dark:bg-white/[0.03] shrink-0">
                                                {item.product.images[0] ? (
                                                    <Image src={item.product.images[0]} alt={item.product.name}
                                                        width={80} height={80} className="w-full h-full object-cover" />
                                                ) : (
                                                    <div className="w-full h-full flex items-center justify-center">
                                                        <ShoppingCart size={20} className="text-gray-200" />
                                                    </div>
                                                )}
                                            </Link>
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center gap-1 mb-0.5">
                                                    <span className="text-xs text-gray-400 dark:text-white/25">{item.product.brand.name}</span>
                                                    {item.product.brand.verified && <VerifiedBadge size={11} />}
                                                </div>
                                                <Link href={`/market/product/${item.product.slug}`}>
                                                    <p className="text-sm font-semibold text-gray-900 dark:text-white
                                                        hover:text-green-600 dark:hover:text-green-400 transition-colors line-clamp-2 mb-2">
                                                        {item.product.name}
                                                    </p>
                                                </Link>
                                                <div className="flex items-center justify-between">
                                                    <div className="flex items-center bg-gray-100 dark:bg-white/[0.05] rounded-xl overflow-hidden">
                                                        <button onClick={() => updateQty(item, -1)}
                                                            className="w-8 h-8 flex items-center justify-center text-gray-500 hover:bg-gray-200/80 dark:hover:bg-white/[0.08] transition-colors">
                                                            <Minus size={13} />
                                                        </button>
                                                        <span className="w-8 text-center text-sm font-bold text-gray-900 dark:text-white">{item.quantity}</span>
                                                        <button onClick={() => updateQty(item, 1)}
                                                            className="w-8 h-8 flex items-center justify-center text-gray-500 hover:bg-gray-200/80 dark:hover:bg-white/[0.08] transition-colors">
                                                            <Plus size={13} />
                                                        </button>
                                                    </div>
                                                    <span className="font-black text-transparent bg-clip-text
                                                        bg-gradient-to-r from-green-600 to-emerald-500 dark:from-green-400 dark:to-emerald-300">
                                                        {fz(Number(item.product.price) * item.quantity)} Ƶ
                                                    </span>
                                                </div>
                                            </div>
                                            <button onClick={() => removeItem(item.productId)}
                                                className="shrink-0 w-9 h-9 rounded-xl flex items-center justify-center
                                                    text-gray-400 dark:text-white/25 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 transition-all">
                                                <Trash2 size={15} />
                                            </button>
                                        </motion.div>
                                    ))}
                                </AnimatePresence>
                            </div>

                            {/* To'lov paneli */}
                            <div className="lg:col-span-1">
                                <div className="sticky top-20 bg-white/80 dark:bg-white/[0.04]
                                    border border-gray-100 dark:border-white/[0.07]
                                    backdrop-blur-xl rounded-3xl p-6">
                                    <h3 className="font-bold text-gray-900 dark:text-white mb-4">Buyurtma xulosasi</h3>

                                    {/* Zij balansi */}
                                    {balance !== null && (
                                        <div className="flex items-center justify-between mb-3 py-2.5 px-3
                                            bg-green-50/80 dark:bg-green-900/10 rounded-xl border border-green-100 dark:border-green-800/20">
                                            <div className="flex items-center gap-2">
                                                <Wallet size={14} className="text-green-500" />
                                                <span className="text-xs font-medium text-gray-600 dark:text-white/50">Zij balans</span>
                                            </div>
                                            <span className={`text-sm font-bold ${balance >= total ? "text-green-600 dark:text-green-400" : "text-red-500"}`}>
                                                {fz(balance)} Ƶ
                                            </span>
                                        </div>
                                    )}

                                    <div className="flex justify-between text-sm text-gray-500 dark:text-white/40 mb-2">
                                        <span>Mahsulotlar ({items.length})</span><span>{fz(total)} Ƶ</span>
                                    </div>
                                    <div className="flex justify-between text-sm text-gray-500 dark:text-white/40 mb-4">
                                        <span>Yetkazib berish</span>
                                        <span className="text-green-500 font-semibold">Bepul</span>
                                    </div>
                                    <div className="border-t border-gray-100 dark:border-white/[0.06] pt-4 mb-5">
                                        <div className="flex justify-between font-black text-gray-900 dark:text-white">
                                            <span>Jami</span>
                                            <span className="text-transparent bg-clip-text bg-gradient-to-r from-green-600 to-emerald-500 dark:from-green-400 dark:to-emerald-300">
                                                {fz(total)} Ƶ
                                            </span>
                                        </div>
                                        <p className="text-xs text-gray-400 dark:text-white/25 mt-0.5">≈ ${fz(total)} USD</p>
                                    </div>

                                    {!checkout ? (
                                        <>
                                            {balance !== null && balance < total && payMethod === "ZIJ" && (
                                                <div className="flex items-start gap-2 bg-red-50 dark:bg-red-500/8
                                                    border border-red-200/80 dark:border-red-500/20 rounded-xl p-3 mb-3">
                                                    <AlertCircle size={13} className="text-red-500 mt-0.5 shrink-0" />
                                                    <div className="text-xs text-red-600 dark:text-red-400">
                                                        <p className="font-semibold">Balans yetarli emas</p>
                                                        <Link href="/pay" className="underline mt-0.5 inline-block">ALKH Pay da to'ldirish</Link>
                                                    </div>
                                                </div>
                                            )}
                                            <motion.button onClick={() => setCheckout(true)}
                                                whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}
                                                className="w-full py-3.5 rounded-2xl
                                                    bg-gradient-to-r from-green-600 to-emerald-500 text-white font-bold
                                                    shadow-lg shadow-green-500/25 transition-all">
                                                Buyurtma berish
                                            </motion.button>
                                        </>
                                    ) : (
                                        <div className="space-y-3">
                                            {/* Manzil — xarita orqali (qo'lda yozish emas) */}
                                            <div>
                                                <label className="text-xs font-semibold text-gray-500 dark:text-white/40 mb-1.5 block">
                                                    Yetkazib berish manzili * (xaritadan tanlang)
                                                </label>
                                                <LocationPicker value={address} onChange={setAddress} />
                                            </div>

                                            {/* To'lov usuli */}
                                            <div>
                                                <label className="text-xs font-semibold text-gray-500 dark:text-white/40 mb-1.5 block">
                                                    To'lov usuli
                                                </label>
                                                <div className="space-y-2">
                                                    {PAY_METHODS.map(m => (
                                                        <button key={m.key} onClick={() => setPayMethod(m.key)}
                                                            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl border transition-all text-left
                                                                ${payMethod === m.key
                                                                    ? "bg-green-50 dark:bg-green-900/15 border-green-400/50 dark:border-green-600/30"
                                                                    : "bg-gray-50 dark:bg-white/[0.03] border-gray-200 dark:border-white/[0.06] hover:border-green-300"}`}>
                                                            <m.icon size={16} className={payMethod === m.key ? "text-green-600 dark:text-green-400" : "text-gray-400 dark:text-white/30"} />
                                                            <div>
                                                                <p className={`text-xs font-bold ${payMethod === m.key ? "text-green-700 dark:text-green-400" : "text-gray-700 dark:text-white/50"}`}>
                                                                    {m.label}
                                                                </p>
                                                                <p className="text-[10px] text-gray-400 dark:text-white/25">{m.desc}</p>
                                                            </div>
                                                        </button>
                                                    ))}
                                                </div>
                                            </div>

                                            {/* Izoh */}
                                            <textarea value={note} onChange={e => setNote(e.target.value)}
                                                placeholder="Izoh (ixtiyoriy)" rows={2}
                                                className="w-full bg-gray-50 dark:bg-white/[0.05] border border-gray-200 dark:border-white/[0.08]
                                                    focus:border-green-400 dark:focus:border-green-500/50
                                                    rounded-xl px-4 py-2.5 text-sm text-gray-900 dark:text-white
                                                    placeholder:text-gray-400 dark:placeholder:text-white/20 outline-none transition resize-none" />

                                            {error && (
                                                <p className="text-red-500 text-xs flex items-center gap-1.5">
                                                    <AlertCircle size={12} />{error}
                                                </p>
                                            )}
                                            <motion.button onClick={handleCheckout} disabled={paying}
                                                whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}
                                                className="w-full py-3.5 rounded-2xl
                                                    bg-gradient-to-r from-green-600 to-emerald-500 text-white font-bold
                                                    shadow-lg shadow-green-500/25 transition-all disabled:opacity-40
                                                    flex items-center justify-center gap-2">
                                                {paying ? <Loader2 size={16} className="animate-spin" /> :
                                                    payMethod === "ZIJ" ? <Wallet size={16} /> : <Package size={16} />}
                                                {payMethod === "ZIJ" ? `${fz(total)} Ƶ to'lash` : "Buyurtmani tasdiqlash"}
                                            </motion.button>
                                            <button onClick={() => setCheckout(false)}
                                                className="w-full py-2 text-sm text-gray-400 dark:text-white/30 hover:text-gray-600 transition-colors">
                                                Orqaga
                                            </button>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    )}
                </>
            )}

            {/* ── BUYURTMALARIM ── */}
            {tab === "orders" && (
                <div className="max-w-2xl space-y-4">
                    {!orders.length ? (
                        <div className="text-center py-16">
                            <Package size={40} className="text-gray-200 dark:text-white/10 mx-auto mb-3" />
                            <p className="text-gray-400 dark:text-white/30 text-sm">Hali buyurtmalar yo'q</p>
                        </div>
                    ) : orders.map((order) => {
                        const st = ORDER_STATUS[order.status] ?? { label: order.status, color: "text-gray-500" };
                        return (
                            <motion.div key={order.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                                className="bg-white/70 dark:bg-white/[0.03] border border-gray-100 dark:border-white/[0.06]
                                    rounded-2xl p-5">
                                <div className="flex items-center justify-between mb-3">
                                    <div>
                                        <p className="text-xs text-gray-400 dark:text-white/25 font-mono">
                                            #{order.id.slice(-8).toUpperCase()}
                                        </p>
                                        <p className="text-xs text-gray-400 dark:text-white/30">
                                            {new Date(order.createdAt).toLocaleDateString("uz-UZ")}
                                        </p>
                                    </div>
                                    <div className="text-right">
                                        <span className={`text-xs font-bold ${st.color}`}>{st.label}</span>
                                        <p className="font-black text-sm text-transparent bg-clip-text
                                            bg-gradient-to-r from-green-600 to-emerald-500 dark:from-green-400 dark:to-emerald-300">
                                            {fz(order.total)} Ƶ
                                        </p>
                                    </div>
                                </div>
                                <div className="flex gap-2 flex-wrap mb-3">
                                    {order.items.slice(0, 3).map((item, i) => (
                                        <div key={i} className="w-12 h-12 rounded-xl overflow-hidden bg-gray-100 dark:bg-white/[0.05] shrink-0">
                                            {item.product.images[0] ? (
                                                <Image src={item.product.images[0]} alt={item.product.name}
                                                    width={48} height={48} className="w-full h-full object-cover" />
                                            ) : <div className="w-full h-full bg-gray-200" />}
                                        </div>
                                    ))}
                                    {order.items.length > 3 && (
                                        <div className="w-12 h-12 rounded-xl bg-gray-100 dark:bg-white/[0.05] flex items-center justify-center">
                                            <span className="text-xs font-bold text-gray-500 dark:text-white/30">+{order.items.length - 3}</span>
                                        </div>
                                    )}
                                </div>
                                <div className="flex items-center justify-between text-xs text-gray-400 dark:text-white/25">
                                    <div className="flex items-center gap-1"><MapPin size={11} />{order.address}</div>
                                    <span>{order.paymentMethod === "ZIJ" ? "Zij" : order.paymentMethod === "CASH_ON_DELIVERY" ? "Naqd" : "Karta"}</span>
                                </div>
                            </motion.div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
