"use client";

import React, { useEffect, useState, useRef, useCallback } from "react";
import { motion, AnimatePresence, useSpring, useTransform, useMotionValue } from "framer-motion";
import { useTranslations } from "next-intl";
import Image from "next/image";
import { AlkhPayNavbar } from "@/components/pay/alkh-pay-navbar";
import {
    ArrowDownLeft, ArrowUpRight, Gift, Zap,
    TrendingUp, Plus, AlertCircle, CheckCircle2, Loader2,
    Clock, ShoppingBag, X,
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
// Constants
// ─────────────────────────────────────────────────────────────────────────────
const TX_META: Record<TxType, { icon: React.ElementType; color: string; sign: "+" | "-" }> = {
    DEPOSIT:  { icon: ArrowDownLeft, color: "#00AAFF", sign: "+" },
    WITHDRAW: { icon: ArrowUpRight,  color: "#FF4466", sign: "-" },
    PURCHASE: { icon: ShoppingBag,   color: "#FF9500", sign: "-" },
    REWARD:   { icon: Gift,          color: "#00E5C8", sign: "+" },
};

const QUICK_AMOUNTS = [10, 50, 100, 500];

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────
function formatZij(amount: string | number) {
    const n = Number(amount);
    return n % 1 === 0 ? n.toLocaleString() : n.toFixed(2);
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
// AnimatedBackground — jonli fon (dark: to'q ko'k, light: oq + och ko'k)
// ─────────────────────────────────────────────────────────────────────────────
function AnimatedBackground() {
    return (
        <div className="fixed inset-0 -z-10 overflow-hidden pointer-events-none">
            {/* Base gradient — dark/light mode adaptive */}
            <div className="absolute inset-0
                bg-gradient-to-br
                from-white via-sky-50 to-blue-100
                dark:from-[#020B18] dark:via-[#050D1F] dark:to-[#071428]
                transition-colors duration-700"
            />

            {/* Orb 1 — asosiy katta orb */}
            <motion.div
                className="absolute rounded-full blur-[120px] opacity-30 dark:opacity-20
                    bg-blue-400 dark:bg-[#0066FF]"
                style={{ width: 600, height: 600, top: "-10%", right: "-5%" }}
                animate={{
                    x: [0, 40, -20, 0],
                    y: [0, -30, 20, 0],
                    scale: [1, 1.1, 0.95, 1],
                }}
                transition={{ duration: 18, repeat: Infinity, ease: "easeInOut" }}
            />

            {/* Orb 2 — pastki chap */}
            <motion.div
                className="absolute rounded-full blur-[160px] opacity-20 dark:opacity-15
                    bg-cyan-300 dark:bg-[#00CCFF]"
                style={{ width: 500, height: 500, bottom: "-5%", left: "-8%" }}
                animate={{
                    x: [0, -25, 35, 0],
                    y: [0, 20, -15, 0],
                    scale: [1, 0.9, 1.08, 1],
                }}
                transition={{ duration: 22, repeat: Infinity, ease: "easeInOut", delay: 3 }}
            />

            {/* Orb 3 — o'rta kichik */}
            <motion.div
                className="absolute rounded-full blur-[80px] opacity-15 dark:opacity-10
                    bg-blue-500 dark:bg-[#003AFF]"
                style={{ width: 300, height: 300, top: "40%", left: "35%" }}
                animate={{
                    x: [0, 30, -20, 0],
                    y: [0, -25, 30, 0],
                    scale: [1, 1.15, 0.9, 1],
                }}
                transition={{ duration: 15, repeat: Infinity, ease: "easeInOut", delay: 6 }}
            />

            {/* Mesh grid overlay — light modeda ko'rinadi */}
            <div className="absolute inset-0 opacity-[0.03] dark:opacity-[0.04]"
                style={{
                    backgroundImage: `linear-gradient(rgba(0,100,255,0.5) 1px, transparent 1px),
                        linear-gradient(90deg, rgba(0,100,255,0.5) 1px, transparent 1px)`,
                    backgroundSize: "60px 60px",
                }}
            />

            {/* Dark/light chegarasida silliq o'tish qatlami */}
            <div className="absolute inset-x-0 bottom-0 h-32
                bg-gradient-to-t from-white/50 to-transparent
                dark:from-[#020B18]/80 dark:to-transparent
                transition-colors duration-700"
            />
        </div>
    );
}

// ─────────────────────────────────────────────────────────────────────────────
// DepositModal — shisha ko'rinishli, kursor ta'sirida jonli
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

    // Kursor tracking
    const modalRef = useRef<HTMLDivElement>(null);
    const cursorX = useMotionValue(0.5);
    const cursorY = useMotionValue(0.5);

    const springX = useSpring(cursorX, { stiffness: 60, damping: 20 });
    const springY = useSpring(cursorY, { stiffness: 60, damping: 20 });

    // Gradient markazi kursor bilan harakatlanadi
    const gradX = useTransform(springX, [0, 1], ["20%", "80%"]);
    const gradY = useTransform(springY, [0, 1], ["20%", "80%"]);

    // Modal ichida qimirlab turuvchi "breathing" effekti
    const breathScale = useSpring(1, { stiffness: 30, damping: 15 });

    useEffect(() => {
        // Jonli nafas olish animatsiyasi
        const interval = setInterval(() => {
            breathScale.set(breathScale.get() > 1 ? 1 : 1.008);
        }, 2000);
        return () => clearInterval(interval);
    }, [breathScale]);

    const handleMouseMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
        if (!modalRef.current) return;
        const rect = modalRef.current.getBoundingClientRect();
        cursorX.set((e.clientX - rect.left) / rect.width);
        cursorY.set((e.clientY - rect.top) / rect.height);
    }, [cursorX, cursorY]);

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
                setTimeout(onClose, 2200);
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
            transition={{ duration: 0.3 }}
            className="fixed inset-0 z-50 flex items-center justify-center px-4"
            style={{ backdropFilter: "blur(20px)", WebkitBackdropFilter: "blur(20px)" }}
            onClick={onClose}
        >
            {/* Backdrop — suv rangi */}
            <div className="absolute inset-0 bg-blue-900/20 dark:bg-black/40" />

            {/* Modal — suv kabi oqib kiradi */}
            <motion.div
                ref={modalRef}
                onMouseMove={handleMouseMove}
                onClick={(e) => e.stopPropagation()}
                initial={{
                    opacity: 0,
                    scale: 0.8,
                    y: 60,
                    clipPath: "ellipse(60% 20% at 50% 100%)",
                }}
                animate={{
                    opacity: 1,
                    scale: 1,
                    y: 0,
                    clipPath: "ellipse(100% 100% at 50% 50%)",
                }}
                exit={{
                    opacity: 0,
                    scale: 0.85,
                    y: 40,
                    clipPath: "ellipse(60% 20% at 50% 100%)",
                }}
                transition={{
                    type: "spring",
                    stiffness: 200,
                    damping: 22,
                    clipPath: { duration: 0.55, ease: [0.16, 1, 0.3, 1] },
                }}
                className="relative w-full max-w-sm overflow-hidden rounded-3xl z-10"
                style={{ scale: breathScale }}
            >
                {/* Shisha qatlamlari */}
                {/* 1: asosiy shaffof fon */}
                <div className="absolute inset-0
                    bg-white/60 dark:bg-[#050D1F]/70
                    backdrop-blur-2xl"
                />

                {/* 2: kursor ta'sirida harakatlanadigan ichki glow */}
                <motion.div
                    className="absolute inset-0 pointer-events-none"
                    style={{
                        background: useTransform(
                            [gradX, gradY],
                            ([x, y]) =>
                                `radial-gradient(ellipse 55% 45% at ${x} ${y}, rgba(0,170,255,0.18) 0%, transparent 70%)`
                        ),
                    }}
                />

                {/* 3: chegaralar */}
                <div className="absolute inset-0 rounded-3xl
                    border border-white/40 dark:border-white/10
                    ring-1 ring-inset ring-blue-400/20 dark:ring-blue-500/10"
                />

                {/* 4: yuqori chiroq */}
                <div className="absolute top-0 inset-x-0 h-px
                    bg-gradient-to-r from-transparent via-blue-400/60 to-transparent"
                />

                {/* Kontent */}
                <div className="relative z-10 p-6">
                    {done ? (
                        <motion.div
                            initial={{ scale: 0.8, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            transition={{ type: "spring", stiffness: 300, damping: 20 }}
                            className="flex flex-col items-center gap-3 py-8"
                        >
                            {/* Ripple circle */}
                            <div className="relative">
                                <motion.div
                                    className="absolute inset-0 rounded-full bg-emerald-400/30"
                                    animate={{ scale: [1, 2.5], opacity: [0.5, 0] }}
                                    transition={{ duration: 1.2, repeat: Infinity }}
                                />
                                <div className="relative w-16 h-16 rounded-full bg-emerald-500/20 flex items-center justify-center">
                                    <CheckCircle2 className="text-emerald-400" size={32} />
                                </div>
                            </div>
                            <p className="text-gray-900 dark:text-white font-bold text-xl">{t("deposit_success")}</p>
                            <p className="text-gray-500 dark:text-white/40 text-sm">+{amount} Ƶ qo&apos;shildi</p>
                        </motion.div>
                    ) : (
                        <>
                            {/* Header */}
                            <div className="flex items-center justify-between mb-5">
                                <div>
                                    <h3 className="text-gray-900 dark:text-white font-bold text-xl">
                                        {t("deposit_title")}
                                    </h3>
                                    <p className="text-gray-500 dark:text-white/40 text-xs mt-0.5">
                                        {t("deposit_desc")}
                                    </p>
                                </div>
                                <button
                                    onClick={onClose}
                                    className="w-8 h-8 rounded-full
                                        bg-gray-100/80 dark:bg-white/5
                                        hover:bg-gray-200/80 dark:hover:bg-white/10
                                        flex items-center justify-center transition"
                                >
                                    <X size={14} className="text-gray-500 dark:text-white/50" />
                                </button>
                            </div>

                            {/* Tez miqdorlar */}
                            <div className="grid grid-cols-4 gap-2 mb-5">
                                {QUICK_AMOUNTS.map((q, i) => (
                                    <motion.button
                                        key={q}
                                        initial={{ opacity: 0, y: 10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        transition={{ delay: i * 0.06 }}
                                        onClick={() => setAmount(String(q))}
                                        className={`py-2.5 rounded-2xl text-sm font-bold border transition-all duration-200
                                            ${amount === String(q)
                                                ? "bg-blue-500/20 border-blue-400/60 text-blue-600 dark:text-blue-300 scale-105"
                                                : "bg-gray-100/60 dark:bg-white/5 border-gray-200/80 dark:border-white/8 text-gray-600 dark:text-white/50 hover:bg-blue-50 dark:hover:bg-white/10"
                                            }`}
                                    >
                                        {q}<span className="text-[10px] ml-0.5 opacity-60">Ƶ</span>
                                    </motion.button>
                                ))}
                            </div>

                            <form onSubmit={handleSubmit}>
                                {/* Input */}
                                <div className="relative mb-4">
                                    <span className="absolute left-4 top-1/2 -translate-y-1/2
                                        text-blue-500 dark:text-blue-400 font-black text-xl select-none">
                                        Ƶ
                                    </span>
                                    <input
                                        type="number"
                                        min={1}
                                        max={1000}
                                        value={amount}
                                        onChange={(e) => setAmount(e.target.value)}
                                        placeholder={t("deposit_amount_placeholder")}
                                        className="w-full
                                            bg-gray-50/80 dark:bg-white/5
                                            border border-gray-200 dark:border-white/10
                                            focus:border-blue-400 dark:focus:border-blue-500/50
                                            rounded-2xl pl-11 pr-4 py-3.5
                                            text-gray-900 dark:text-white text-xl font-bold
                                            placeholder:text-gray-300 dark:placeholder:text-white/15
                                            outline-none transition-all duration-200"
                                    />
                                </div>

                                {/* 1 Zij = 1 $ eslatma */}
                                <p className="text-xs text-gray-400 dark:text-white/25 mb-4 text-center">
                                    {amount ? `≈ $${amount} USD` : "1 Ƶ = 1 USD (o'zgarmas)"}
                                </p>

                                {error && (
                                    <motion.p
                                        initial={{ opacity: 0, x: -10 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        className="text-red-500 text-sm mb-3 flex items-center gap-1.5"
                                    >
                                        <AlertCircle size={13} /> {error}
                                    </motion.p>
                                )}

                                <motion.button
                                    type="submit"
                                    disabled={loading || !amount}
                                    whileHover={{ scale: 1.02 }}
                                    whileTap={{ scale: 0.97 }}
                                    className="w-full py-3.5 rounded-2xl
                                        bg-gradient-to-r from-blue-600 to-cyan-500
                                        hover:from-blue-500 hover:to-cyan-400
                                        text-white font-bold text-sm
                                        shadow-lg shadow-blue-500/25
                                        transition-all duration-200
                                        disabled:opacity-40 disabled:cursor-not-allowed
                                        flex items-center justify-center gap-2"
                                >
                                    {loading
                                        ? <Loader2 size={16} className="animate-spin" />
                                        : <Plus size={16} />
                                    }
                                    {t("deposit_submit")}
                                </motion.button>
                            </form>
                        </>
                    )}
                </div>
            </motion.div>
        </motion.div>
    );
}

// ─────────────────────────────────────────────────────────────────────────────
// BalanceCard — jonli balans ko'rsatgich
// ─────────────────────────────────────────────────────────────────────────────
function BalanceCard({
    balance,
    loading,
    onDeposit,
    t,
}: {
    balance: string;
    loading: boolean;
    onDeposit: () => void;
    t: (key: string) => string;
}) {
    const cardRef = useRef<HTMLDivElement>(null);
    const rotateX = useSpring(0, { stiffness: 100, damping: 20 });
    const rotateY = useSpring(0, { stiffness: 100, damping: 20 });

    function handleMouseMove(e: React.MouseEvent<HTMLDivElement>) {
        if (!cardRef.current) return;
        const rect = cardRef.current.getBoundingClientRect();
        const cx = rect.left + rect.width / 2;
        const cy = rect.top + rect.height / 2;
        rotateY.set(((e.clientX - cx) / rect.width) * 8);
        rotateX.set(-((e.clientY - cy) / rect.height) * 6);
    }

    function handleMouseLeave() {
        rotateX.set(0);
        rotateY.set(0);
    }

    return (
        <motion.div
            ref={cardRef}
            onMouseMove={handleMouseMove}
            onMouseLeave={handleMouseLeave}
            style={{ rotateX, rotateY, transformPerspective: 800 }}
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, type: "spring", stiffness: 200, damping: 25 }}
            className="relative overflow-hidden rounded-3xl p-6 cursor-default select-none"
        >
            {/* Karta foni */}
            <div className="absolute inset-0
                bg-gradient-to-br
                from-white/80 to-blue-50/60
                dark:from-blue-950/60 dark:to-[#050D1F]/80
                backdrop-blur-xl
                border border-blue-200/60 dark:border-blue-500/15
                transition-colors duration-500"
            />

            {/* Ichki glow */}
            <motion.div
                className="absolute inset-0 opacity-50 pointer-events-none"
                animate={{
                    background: [
                        "radial-gradient(ellipse 60% 40% at 20% 30%, rgba(0,150,255,0.12) 0%, transparent 70%)",
                        "radial-gradient(ellipse 60% 40% at 80% 70%, rgba(0,200,255,0.12) 0%, transparent 70%)",
                        "radial-gradient(ellipse 60% 40% at 20% 30%, rgba(0,150,255,0.12) 0%, transparent 70%)",
                    ],
                }}
                transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
            />

            {/* Yuqori chiziq */}
            <div className="absolute top-0 inset-x-0 h-px
                bg-gradient-to-r from-transparent via-blue-400/50 to-transparent"
            />

            {/* "Ƶ" watermark */}
            <div className="absolute right-4 top-2 text-[120px] font-black leading-none
                text-blue-500/8 dark:text-blue-400/6 select-none pointer-events-none">
                Ƶ
            </div>

            <div className="relative z-10">
                <p className="text-gray-500 dark:text-white/40 text-sm font-medium mb-2">
                    {t("balance_label")}
                </p>

                {loading ? (
                    <div className="flex items-center gap-3 h-16">
                        <Loader2 size={22} className="animate-spin text-blue-400" />
                        <span className="text-gray-400 dark:text-white/30 text-sm">Yuklanmoqda...</span>
                    </div>
                ) : (
                    <>
                        <div className="flex items-end gap-2 mb-1">
                            <motion.span
                                key={balance}
                                initial={{ scale: 1.1, opacity: 0 }}
                                animate={{ scale: 1, opacity: 1 }}
                                className="text-5xl font-black tracking-tighter
                                    text-transparent bg-clip-text
                                    bg-gradient-to-r from-blue-600 to-cyan-500
                                    dark:from-blue-400 dark:to-cyan-300"
                            >
                                {formatZij(balance)}
                            </motion.span>
                            <span className="text-2xl font-bold mb-1.5
                                text-blue-400 dark:text-blue-300/60">Ƶ</span>
                        </div>
                        <p className="text-gray-400 dark:text-white/25 text-xs">
                            ≈ ${formatZij(balance)} USD
                            <span className="ml-2 text-gray-300 dark:text-white/15">· 1 Ƶ = 1 $ (o&apos;zgarmas)</span>
                        </p>
                    </>
                )}

                {/* Tugmalar */}
                <div className="flex gap-3 mt-5">
                    <motion.button
                        onClick={onDeposit}
                        whileHover={{ scale: 1.03 }}
                        whileTap={{ scale: 0.96 }}
                        className="flex items-center gap-2 px-6 py-2.5 rounded-2xl
                            bg-gradient-to-r from-blue-600 to-cyan-500
                            hover:from-blue-500 hover:to-cyan-400
                            text-white font-bold text-sm
                            shadow-lg shadow-blue-500/20
                            transition-all duration-200"
                    >
                        <Plus size={16} />
                        {t("deposit_btn")}
                    </motion.button>

                    {/* Chiqarish — disabled */}
                    <button
                        disabled
                        className="flex items-center gap-2 px-5 py-2.5 rounded-2xl
                            bg-gray-100/80 dark:bg-white/5
                            border border-gray-200 dark:border-white/8
                            text-gray-400 dark:text-white/20
                            font-semibold text-sm cursor-not-allowed"
                    >
                        <Clock size={15} />
                        Chiqarish
                        <span className="text-[9px]
                            bg-blue-100 dark:bg-blue-500/15
                            text-blue-500 dark:text-blue-400/70
                            rounded-full px-2 py-0.5 font-semibold">
                            {t("withdraw_soon")}
                        </span>
                    </button>
                </div>
            </div>
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
            .then(setWallet)
            .finally(() => setLoading(false));
    }, []);

    function handleDepositSuccess(newBalance: string) {
        setWallet((prev) => {
            fetch("/api/pay/wallet").then((r) => r.json()).then(setWallet);
            return prev ? { ...prev, balance: newBalance } : prev;
        });
    }

    return (
        <>
            <AnimatedBackground />

            <div className="min-h-screen">
                {/* ALKH Pay Navbar */}
                <AlkhPayNavbar />

                {/* Header zone */}
                <div className="pt-6 pb-0">
                    <div className="container mx-auto px-4 max-w-xl">

                        {/* Test mode banner */}
                        <motion.div
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.1 }}
                            className="flex items-start gap-2.5
                                bg-amber-50/80 dark:bg-amber-500/8
                                border border-amber-200/80 dark:border-amber-500/15
                                rounded-2xl px-4 py-3 mb-5
                                backdrop-blur-sm"
                        >
                            <AlertCircle size={15} className="text-amber-500 dark:text-amber-400 mt-0.5 shrink-0" />
                            <p className="text-amber-700 dark:text-amber-300/70 text-xs leading-relaxed">
                                {t("test_mode_banner")}
                            </p>
                        </motion.div>

                        {/* Balans kartasi */}
                        <BalanceCard
                            balance={wallet?.balance ?? "0"}
                            loading={loading}
                            onDeposit={() => setDepositOpen(true)}
                            t={t}
                        />
                    </div>
                </div>

                {/* Tranzaksiyalar */}
                <div className="container mx-auto px-4 max-w-xl py-8">
                    <motion.h2
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 0.3 }}
                        className="text-gray-900 dark:text-white font-bold text-base mb-4
                            flex items-center gap-2"
                    >
                        <TrendingUp size={16} className="text-blue-500 dark:text-blue-400" />
                        {t("history_title")}
                    </motion.h2>

                    {loading ? (
                        <div className="flex justify-center py-12">
                            <Loader2 size={24} className="animate-spin text-blue-400/40" />
                        </div>
                    ) : !wallet?.transactions.length ? (
                        <div className="flex flex-col items-center gap-3 py-14
                            text-gray-300 dark:text-white/20">
                            <div className="w-16 h-16 rounded-full
                                bg-gray-100 dark:bg-white/5
                                flex items-center justify-center">
                                <TrendingUp size={24} className="text-gray-300 dark:text-white/20" />
                            </div>
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
                                        initial={{ opacity: 0, x: -15 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        transition={{ delay: i * 0.04, type: "spring", stiffness: 300, damping: 25 }}
                                        className="flex items-center gap-4
                                            bg-white/60 dark:bg-white/[0.03]
                                            border border-gray-100 dark:border-white/[0.05]
                                            hover:bg-white/80 dark:hover:bg-white/[0.05]
                                            backdrop-blur-sm
                                            rounded-2xl px-4 py-3.5
                                            transition-colors duration-200"
                                    >
                                        <div
                                            className="w-10 h-10 rounded-2xl flex items-center justify-center shrink-0"
                                            style={{ backgroundColor: meta.color + "18" }}
                                        >
                                            <Icon size={18} style={{ color: meta.color }} />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="text-gray-900 dark:text-white text-sm font-semibold truncate">
                                                {tx.description || t(`tx_${tx.type.toLowerCase()}` as "tx_deposit")}
                                            </p>
                                            <p className="text-gray-400 dark:text-white/30 text-xs mt-0.5">
                                                {timeAgo(tx.createdAt)}
                                            </p>
                                        </div>
                                        <div className="text-right shrink-0">
                                            <p className={`font-bold text-sm ${isPositive ? "text-emerald-500 dark:text-emerald-400" : "text-red-500 dark:text-red-400"}`}>
                                                {meta.sign}{formatZij(tx.amount)} Ƶ
                                            </p>
                                            <p className="text-gray-300 dark:text-white/20 text-xs mt-0.5">
                                                {formatZij(tx.balanceAfter)} Ƶ
                                            </p>
                                        </div>
                                    </motion.div>
                                );
                            })}
                        </div>
                    )}

                    {/* Tez orada */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 0.5 }}
                        className="mt-8
                            bg-white/40 dark:bg-white/[0.02]
                            border border-dashed border-blue-200/60 dark:border-white/8
                            backdrop-blur-sm
                            rounded-2xl p-5
                            flex items-center gap-4"
                    >
                        <Zap size={22} className="text-blue-400/40 shrink-0" />
                        <div>
                            <p className="text-gray-500 dark:text-white/40 text-sm font-semibold">Tez orada</p>
                            <p className="text-gray-400 dark:text-white/20 text-xs mt-0.5">
                                eSport turnirlariga Zij bilan ro&apos;yxatdan o&apos;tish, Nexus Premium, do&apos;stlarga yuborish...
                            </p>
                        </div>
                    </motion.div>
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
        </>
    );
}
