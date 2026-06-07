"use client";

import React, { useEffect, useState } from "react";
import { motion } from "framer-motion";
import Image from "next/image";
import { Inbox, Loader2, MapPin, Package, Truck, CheckCircle2, XCircle } from "lucide-react";

interface SellerOrder {
    id: string; status: string; createdAt: string; address: string; paymentMethod: string;
    buyer: { name: string | null; username: string | null } | null;
    items: { quantity: number; price: string; product: { name: string; images: string[] } }[];
    sellerTotal: number;
}

function fz(v: number | string) { return Number(v).toLocaleString(); }

const STATUS_LABEL: Record<string, { label: string; color: string }> = {
    PENDING:    { label: "Yangi",          color: "text-amber-500"   },
    PAID:       { label: "To'landi",       color: "text-emerald-500" },
    PROCESSING: { label: "Tayyorlanmoqda", color: "text-blue-500"    },
    SHIPPED:    { label: "Yo'lda",         color: "text-purple-500"  },
    DELIVERED:  { label: "Yetkazildi",     color: "text-emerald-600" },
    CANCELLED:  { label: "Bekor qilindi",  color: "text-red-500"     },
};

export function SellerOrders() {
    const [orders, setOrders] = useState<SellerOrder[]>([]);
    const [loading, setLoading] = useState(true);
    const [busy, setBusy] = useState<string | null>(null);

    function load() {
        fetch("/api/market/orders/seller").then(r => r.json())
            .then(d => setOrders(d.orders ?? []))
            .finally(() => setLoading(false));
    }
    useEffect(load, []);

    async function setStatus(orderId: string, status: string) {
        setBusy(orderId);
        try {
            const res = await fetch(`/api/market/orders/${orderId}/status`, {
                method: "POST", headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ status }),
            });
            if (res.ok) setOrders(prev => prev.map(o => o.id === orderId ? { ...o, status } : o));
        } finally { setBusy(null); }
    }

    if (loading) return (
        <div className="flex justify-center py-10"><Loader2 size={22} className="animate-spin text-green-500/50" /></div>
    );
    if (!orders.length) return (
        <div className="flex items-center gap-2 text-sm text-gray-400 dark:text-white/30 bg-gray-50/70 dark:bg-white/[0.02] rounded-2xl px-4 py-5 justify-center">
            <Inbox size={16} /> Hozircha kelgan buyurtmalar yo&apos;q
        </div>
    );

    return (
        <div className="space-y-4">
            {orders.map((o, i) => {
                const st = STATUS_LABEL[o.status] ?? { label: o.status, color: "text-gray-500" };
                const isBusy = busy === o.id;
                return (
                    <motion.div key={o.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}
                        className="bg-white/70 dark:bg-white/[0.03] border border-gray-100 dark:border-white/[0.06] rounded-2xl p-5">
                        <div className="flex items-center justify-between mb-3">
                            <div>
                                <p className="text-xs text-gray-400 dark:text-white/25 font-mono">#{o.id.slice(-8).toUpperCase()}</p>
                                <p className="text-xs text-gray-500 dark:text-white/40 mt-0.5 font-semibold">
                                    {o.buyer?.name ?? o.buyer?.username ?? "Xaridor"}
                                    <span className="text-gray-300 dark:text-white/20 font-normal"> · {new Date(o.createdAt).toLocaleDateString("uz-UZ")}</span>
                                </p>
                            </div>
                            <div className="text-right">
                                <span className={`text-xs font-bold ${st.color}`}>{st.label}</span>
                                <p className="font-black text-sm text-transparent bg-clip-text bg-gradient-to-r from-green-600 to-emerald-500 dark:from-green-400 dark:to-emerald-300">
                                    {fz(o.sellerTotal)} Ƶ
                                </p>
                            </div>
                        </div>

                        {/* Mahsulotlar */}
                        <div className="space-y-2 mb-3">
                            {o.items.map((it, k) => (
                                <div key={k} className="flex items-center gap-2.5">
                                    <div className="w-10 h-10 rounded-lg overflow-hidden bg-gray-100 dark:bg-white/[0.05] shrink-0">
                                        {it.product.images[0]
                                            ? <Image src={it.product.images[0]} alt={it.product.name} width={40} height={40} className="w-full h-full object-cover" />
                                            : <div className="w-full h-full" />}
                                    </div>
                                    <p className="text-sm text-gray-700 dark:text-white/60 flex-1 truncate">{it.product.name}</p>
                                    <span className="text-xs text-gray-400 dark:text-white/30">×{it.quantity}</span>
                                </div>
                            ))}
                        </div>

                        <div className="flex items-center gap-1 text-xs text-gray-400 dark:text-white/25 mb-3">
                            <MapPin size={11} />{o.address}
                        </div>

                        {/* Sotuvchi amallari */}
                        <div className="flex gap-2">
                            {(o.status === "PENDING" || o.status === "PAID") && (
                                <button onClick={() => setStatus(o.id, "PROCESSING")} disabled={isBusy}
                                    className="flex-1 py-2.5 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400 font-semibold text-sm flex items-center justify-center gap-2 hover:bg-blue-500/20 disabled:opacity-40 transition-all">
                                    {isBusy ? <Loader2 size={14} className="animate-spin" /> : <Package size={14} />} Tayyorlashni boshlash
                                </button>
                            )}
                            {o.status === "PROCESSING" && (
                                <button onClick={() => setStatus(o.id, "SHIPPED")} disabled={isBusy}
                                    className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-green-600 to-emerald-500 text-white font-bold text-sm flex items-center justify-center gap-2 disabled:opacity-40 transition-all">
                                    {isBusy ? <Loader2 size={14} className="animate-spin" /> : <Truck size={14} />} Jo&apos;natildi
                                </button>
                            )}
                            {o.status === "SHIPPED" && (
                                <div className="flex-1 py-2.5 rounded-xl bg-purple-50 dark:bg-purple-500/10 text-purple-600 dark:text-purple-400 font-semibold text-sm flex items-center justify-center gap-2">
                                    <Truck size={14} /> Xaridor qabulini kutmoqda
                                </div>
                            )}
                            {o.status === "DELIVERED" && (
                                <div className="flex-1 py-2.5 rounded-xl bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-semibold text-sm flex items-center justify-center gap-2">
                                    <CheckCircle2 size={14} /> Yetkazildi
                                </div>
                            )}
                            {o.status === "CANCELLED" && (
                                <div className="flex-1 py-2.5 rounded-xl bg-red-50 dark:bg-red-500/10 text-red-500 font-semibold text-sm flex items-center justify-center gap-2">
                                    <XCircle size={14} /> Bekor qilindi
                                </div>
                            )}
                        </div>
                    </motion.div>
                );
            })}
        </div>
    );
}
