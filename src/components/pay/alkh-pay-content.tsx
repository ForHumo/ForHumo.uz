"use client";

import React, { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useTranslations } from "next-intl";
import Image from "next/image";
import {
    Wallet, ArrowDownLeft, ArrowUpRight, Gift, Zap,
    TrendingUp, Plus, AlertCircle, CheckCircle2, Loader2,
    Clock, ShoppingBag,
} from "lucide-react";

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────
type TxType = "DEPOSIT" | "WITHDRAW" | "PURCHASE" | "REWARD";

interface Transaction {
    id: string;
    type: TxType;
    amount: string;
    balanceAfter: string;
    description: string | null;
    createdAt: string;
}

interface WalletData {
    balance: string;
    transactions: Transaction[];
}

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────
const TX_META: Record<TxType, { icon: React.ElementType; color: string; sign: "+" | "-" }> = {
    DEPOSIT:  { icon: ArrowDownLeft, color: "#10B981", sign: "+" },
    WITHDRAW: { icon: ArrowUpRight,  color: "#EF4444", sign: "-" },
    PURCHASE: { icon: ShoppingBag,   color: "#F59E0B", sign: "-" },
    REWARD:   { icon: Gift,          color: "#8B5CF6", sign: "+" },
};

function formatZij(amount: string | number) {
    const n = Number(amount);
    return n % 1 === 0 ? n.toFixed(0) : n.toFixed(2);
}

function timeAgo(dateStr: string) {
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return "Hozir";
    if (mins < 60) return `${mins} daq. oldin`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs} soat oldin`;
    return new Date(dateStr).toLocaleDateString("uz-UZ");
}

// ─────────────────────────────────────────────────────────────────────────────
// DepositModal
// ─────────────────────────────────────────────────────────────────────────────
function DepositModal({
    onClose,
    onSuccess,
}: {
    onClose: () => void;
    onSuccess: (newBalance: string) => void;
}) {
    const t = useTranslations("Pay");
    const [amount, setAmount] = useState("");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const [done, setDone] = useState(false);

    const quickAmounts = [10, 50, 100, 500];

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        setError("");
        const val = Number(amount);
        if (!val || val < 1 || val > 1000) {
            setError("1 dan 1000 Ƶ gacha bo'lishi kerak");
            return;
        }
        setLoading(true);
        try {
            const res = await fetch("/api/pay/deposit", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ amount: val }),
            });
            const data = await res.json();
            if (!res.ok) {
                setError(data.error || t("deposit_error"));
            } else {
                setDone(true);
                onSuccess(String(data.balance));
                setTimeout(onClose, 1800);
            }
        } catch {
            setError(t("deposit_error"));
        } finally {
            setLoading(false);
        }
    }

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm px-4"
            onClick={onClose}
        >
            <motion.div
                initial={{ scale: 0.92, y: 20 }}
                animate={{ scale: 1, y: 0 }}
                exit={{ scale: 0.92, y: 20 }}
                className="w-full max-w-sm bg-zinc-900 border border-white/10 rounded-2xl p-6"
                onClick={(e) => e.stopPropagation()}
            >
                {done ? (
                    <div className="flex flex-col items-center gap-3 py-4">
                        <CheckCircle2 className="text-emerald-400" size={48} />
                        <p className="text-white font-semibold text-lg">{t("deposit_success")}</p>
                        <p className="text-white/50 text-sm">+{amount} Ƶ qo&apos;shildi</p>
                    </div>
                ) : (
                    <>
                        <h3 className="text-white font-bold text-lg mb-1">{t("deposit_title")}</h3>
                        <p className="text-white/40 text-sm mb-5">{t("deposit_desc")}</p>

                        {/* Tez miqdorlar */}
                        <div className="flex gap-2 mb-4">
                            {quickAmounts.map((q) => (
                                <button
                                    key={q}
                                    onClick={() => setAmount(String(q))}
                                    className={`flex-1 py-2 rounded-xl text-sm font-semibold border transition
                                        ${amount === String(q)
                                            ? "bg-amber-500/20 border-amber-500/60 text-amber-400"
                                            : "bg-white/5 border-white/10 text-white/60 hover:bg-white/10"}`}
                                >
                                    {q} Ƶ
                                </button>
                            ))}
                        </div>

                        <form onSubmit={handleSubmit}>
                            <label className="block text-white/50 text-xs mb-1">{t("deposit_amount_label")}</label>
                            <div className="relative mb-4">
                                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-amber-400 font-bold text-lg">Ƶ</span>
                                <input
                                    type="number"
                                    min={1}
                                    max={1000}
                                    value={amount}
                                    onChange={(e) => setAmount(e.target.value)}
                                    placeholder={t("deposit_amount_placeholder")}
                                    className="w-full bg-white/5 border border-white/10 rounded-xl pl-10 pr-4 py-3
                                        text-white text-lg font-semibold placeholder:text-white/20
                                        focus:outline-none focus:border-amber-500/50"
                                />
                            </div>

                            {error && (
                                <p className="text-red-400 text-sm mb-3 flex items-center gap-1">
                                    <AlertCircle size={14} /> {error}
                                </p>
                            )}

                            <button
                                type="submit"
                                disabled={loading || !amount}
                                className="w-full py-3 rounded-xl bg-amber-500 hover:bg-amber-400
                                    text-black font-bold text-sm transition disabled:opacity-50 flex items-center justify-center gap-2"
                            >
                                {loading ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} />}
                                {t("deposit_submit")}
                            </button>
                        </form>
                    </>
                )}
            </motion.div>
        </motion.div>
    );
}

// ─────────────────────────────────────────────────────────────────────────────
// AlkhPayContent — asosiy sahifa
// ─────────────────────────────────────────────────────────────────────────────
export function AlkhPayContent() {
    const t = useTranslations("Pay");
    const [wallet, setWallet] = useState<WalletData | null>(null);
    const [loading, setLoading] = useState(true);
    const [depositOpen, setDepositOpen] = useState(false);

    useEffect(() => {
        fetch("/api/pay/wallet")
            .then((r) => r.json())
            .then((data) => setWallet(data))
            .finally(() => setLoading(false));
    }, []);

    function handleDepositSuccess(newBalance: string) {
        setWallet((prev) => {
            if (!prev) return prev;
            // Reload to get fresh transactions
            fetch("/api/pay/wallet")
                .then((r) => r.json())
                .then(setWallet);
            return { ...prev, balance: newBalance };
        });
    }

    return (
        <div className="min-h-screen bg-background">
            {/* Header banner */}
            <div className="relative overflow-hidden bg-gradient-to-br from-amber-600/20 via-orange-500/10 to-background border-b border-white/5 pb-12 pt-8">
                <div className="absolute inset-0 opacity-5">
                    <div className="absolute top-4 right-10 text-[200px] font-black text-amber-400 select-none leading-none">Ƶ</div>
                </div>
                <div className="container mx-auto px-4 max-w-2xl relative z-10">
                    {/* Logo + title */}
                    <div className="flex items-center gap-3 mb-6">
                        <Image src="/logos/alkh-pay.png" alt="ALKH Pay" width={40} height={40} className="rounded-xl" />
                        <div>
                            <h1 className="text-white font-black text-xl tracking-tight">{t("title")}</h1>
                            <p className="text-white/40 text-xs">{t("subtitle")}</p>
                        </div>
                    </div>

                    {/* Test mode banner */}
                    <div className="flex items-start gap-2 bg-amber-500/10 border border-amber-500/20 rounded-xl px-4 py-3 mb-8">
                        <AlertCircle size={16} className="text-amber-400 mt-0.5 shrink-0" />
                        <p className="text-amber-300/80 text-xs leading-relaxed">{t("test_mode_banner")}</p>
                    </div>

                    {/* Balance card */}
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="bg-gradient-to-br from-amber-500/15 to-orange-500/5
                            border border-amber-500/20 rounded-2xl p-6"
                    >
                        <p className="text-white/40 text-sm mb-1">{t("balance_label")}</p>
                        {loading ? (
                            <div className="flex items-center gap-2 mt-2">
                                <Loader2 size={20} className="animate-spin text-amber-400" />
                                <span className="text-white/40 text-sm">Yuklanmoqda...</span>
                            </div>
                        ) : (
                            <>
                                <div className="flex items-end gap-2">
                                    <span className="text-amber-400 text-5xl font-black tracking-tighter">
                                        {wallet ? formatZij(wallet.balance) : "0"}
                                    </span>
                                    <span className="text-amber-400/60 text-2xl font-bold mb-1">Ƶ</span>
                                </div>
                                {/* Dollar ekvivalenti — 1 Ƶ = 1 $ (o'zgarmas kurs) */}
                                <p className="text-white/30 text-xs mt-1">
                                    ≈ ${wallet ? formatZij(wallet.balance) : "0"} USD &nbsp;·&nbsp;
                                    <span className="text-white/20">1 Ƶ = 1 $ (o&apos;zgarmas)</span>
                                </p>
                            </>
                        )}

                        {/* Action tugmalari */}
                        <div className="flex gap-3 mt-5">
                            <button
                                onClick={() => setDepositOpen(true)}
                                className="flex items-center gap-2 px-5 py-2.5 rounded-xl
                                    bg-amber-500 hover:bg-amber-400 text-black font-bold text-sm transition"
                            >
                                <Plus size={16} />
                                {t("deposit_btn")}
                            </button>
                            {/* Chiqarish — hozircha o'chirilgan */}
                            <button
                                disabled
                                className="flex items-center gap-2 px-5 py-2.5 rounded-xl
                                    bg-white/5 border border-white/10 text-white/30 font-semibold text-sm cursor-not-allowed"
                                title={t("withdraw_soon")}
                            >
                                <Clock size={16} />
                                Chiqarish
                                <span className="text-[10px] bg-white/10 rounded-full px-2 py-0.5">{t("withdraw_soon")}</span>
                            </button>
                        </div>
                    </motion.div>
                </div>
            </div>

            {/* Tranzaksiya tarixi */}
            <div className="container mx-auto px-4 max-w-2xl py-8">
                <h2 className="text-white font-bold text-base mb-4 flex items-center gap-2">
                    <TrendingUp size={16} className="text-amber-400" />
                    {t("history_title")}
                </h2>

                {loading ? (
                    <div className="flex justify-center py-12">
                        <Loader2 size={24} className="animate-spin text-white/30" />
                    </div>
                ) : !wallet?.transactions.length ? (
                    <div className="flex flex-col items-center gap-3 py-12 text-white/30">
                        <Wallet size={40} />
                        <p className="text-sm">{t("history_empty")}</p>
                    </div>
                ) : (
                    <div className="space-y-2">
                        {wallet.transactions.map((tx, i) => {
                            const meta = TX_META[tx.type];
                            const Icon = meta.icon;
                            const isPositive = meta.sign === "+";
                            return (
                                <motion.div
                                    key={tx.id}
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: i * 0.04 }}
                                    className="flex items-center gap-4 bg-white/[0.03] border border-white/[0.06]
                                        rounded-xl px-4 py-3.5"
                                >
                                    <div
                                        className="w-10 h-10 rounded-full flex items-center justify-center shrink-0"
                                        style={{ backgroundColor: meta.color + "22" }}
                                    >
                                        <Icon size={18} style={{ color: meta.color }} />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-white text-sm font-semibold truncate">
                                            {tx.description || t(`tx_${tx.type.toLowerCase()}` as "tx_deposit")}
                                        </p>
                                        <p className="text-white/30 text-xs">{timeAgo(tx.createdAt)}</p>
                                    </div>
                                    <div className="text-right shrink-0">
                                        <p className={`font-bold text-sm ${isPositive ? "text-emerald-400" : "text-red-400"}`}>
                                            {meta.sign}{formatZij(tx.amount)} Ƶ
                                        </p>
                                        <p className="text-white/25 text-xs">{formatZij(tx.balanceAfter)} Ƶ</p>
                                    </div>
                                </motion.div>
                            );
                        })}
                    </div>
                )}

                {/* Tez yaqinda karta */}
                <div className="mt-8 border border-dashed border-white/10 rounded-2xl p-5 flex items-center gap-4">
                    <Zap size={24} className="text-amber-400/50 shrink-0" />
                    <div>
                        <p className="text-white/50 text-sm font-semibold">Tez orada</p>
                        <p className="text-white/25 text-xs">eSport turnirlariga Zij bilan ro&apos;yxatdan o&apos;tish, Nexus Premium, do&apos;stlarga yuborish...</p>
                    </div>
                </div>
            </div>

            {/* Deposit modal */}
            <AnimatePresence>
                {depositOpen && (
                    <DepositModal
                        onClose={() => setDepositOpen(false)}
                        onSuccess={handleDepositSuccess}
                    />
                )}
            </AnimatePresence>
        </div>
    );
}
