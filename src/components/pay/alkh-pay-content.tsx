"use client";

import React, { useEffect, useState, useRef, useCallback } from "react";
import {
    motion, AnimatePresence, useSpring, useTransform,
    useMotionValue, animate,
} from "framer-motion";
import { useTranslations } from "next-intl";
import {
    ArrowDownLeft, ArrowUpRight, Gift, Zap,
    Plus, AlertCircle, CheckCircle2, Loader2,
    ShoppingBag, X, Send, StickyNote, Store,
    Shield, Lock, Unlock,
    Wallet, BarChart3,
    Landmark, Plane, Smartphone, Gamepad2, Home,
    GraduationCap, Gem, Car, Sun, Dumbbell, Cat,
} from "lucide-react";
import { AlkhPayNavbar } from "@/components/pay/alkh-pay-navbar";
import { formatMoney, currencySymbol, minAmount, type Currency } from "@/lib/money";

function asCur(x: string | undefined | null): Currency { return x === "USD" ? "USD" : "UZS"; }
function money(v: string | number, c: Currency) { return formatMoney(Number(v) || 0, c); }
// Valyutaga mos tezkor summalar
function quickAmounts(c: Currency): number[] {
    return c === "USD" ? [1, 5, 10, 50, 100, 500] : [10000, 50000, 100000, 500000, 1000000, 5000000];
}

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────
type TxType = "DEPOSIT" | "WITHDRAW" | "PURCHASE" | "REWARD" | "REFUND" | "SALE"
    | "TRANSFER_OUT" | "TRANSFER_IN" | "SAFE_IN" | "SAFE_OUT";

type TxFilter = "all" | "in" | "out";

interface Transaction {
    id: string; type: TxType; amount: string; currency?: string;
    balanceAfter: string; description: string | null; createdAt: string;
}

interface WalletSafe {
    id: string; name: string; emoji: string;
    targetAmount: string; balance: string; isCompleted: boolean; createdAt: string;
}

interface WalletData {
    balance: string;
    currency: string;
    transactions: Transaction[];
    safes: WalletSafe[];
}

// ─────────────────────────────────────────────────────────────────────────────
// TX Meta
// ─────────────────────────────────────────────────────────────────────────────
const TX_META: Record<TxType, { icon: React.ElementType; color: string; sign: "+" | "-"; label: string }> = {
    DEPOSIT:      { icon: ArrowDownLeft, color: "#00AAFF", sign: "+", label: "Kiritish" },
    WITHDRAW:     { icon: ArrowUpRight,  color: "#FF4466", sign: "-", label: "Chiqarish" },
    PURCHASE:     { icon: ShoppingBag,   color: "#FF9500", sign: "-", label: "Xarid" },
    REWARD:       { icon: Gift,          color: "#00E5C8", sign: "+", label: "Mukofot" },
    REFUND:       { icon: ArrowDownLeft, color: "#00D97E", sign: "+", label: "Qaytarildi" },
    SALE:         { icon: Store,         color: "#10B981", sign: "+", label: "Sotuv" },
    TRANSFER_OUT: { icon: Send,          color: "#FF6B6B", sign: "-", label: "Yuborildi" },
    TRANSFER_IN:  { icon: ArrowDownLeft, color: "#00D97E", sign: "+", label: "Qabul" },
    SAFE_IN:      { icon: Lock,          color: "#8B5CF6", sign: "-", label: "Seyfga" },
    SAFE_OUT:     { icon: Unlock,        color: "#A78BFA", sign: "+", label: "Seyfdan" },
};

const IN_TYPES:  TxType[] = ["DEPOSIT", "REWARD", "REFUND", "SALE", "TRANSFER_IN", "SAFE_OUT"];
const OUT_TYPES: TxType[] = ["WITHDRAW", "PURCHASE", "TRANSFER_OUT", "SAFE_IN"];

// Seyf ikonkalari — emoji yo'q, faqat Lucide ikonkalar
type SafeIconKey = "landmark" | "plane" | "smartphone" | "gamepad" | "home"
    | "graduation" | "gem" | "car" | "sun" | "dumbbell" | "piggybank" | "shield";

const SAFE_ICONS: { key: SafeIconKey; icon: React.ElementType; color: string; label: string }[] = [
    { key: "landmark",   icon: Landmark,      color: "#0099FF", label: "Jamgarma"  },
    { key: "plane",      icon: Plane,         color: "#00C8FF", label: "Sayohat"   },
    { key: "smartphone", icon: Smartphone,    color: "#6366F1", label: "Texnika"   },
    { key: "gamepad",    icon: Gamepad2,      color: "#10B981", label: "O'yin"     },
    { key: "home",       icon: Home,          color: "#F59E0B", label: "Uy"        },
    { key: "graduation", icon: GraduationCap, color: "#8B5CF6", label: "Ta'lim"   },
    { key: "gem",        icon: Gem,           color: "#EC4899", label: "Zargarlik" },
    { key: "car",        icon: Car,           color: "#14B8A6", label: "Mashina"   },
    { key: "sun",        icon: Sun,           color: "#FBBF24", label: "Dam olish" },
    { key: "dumbbell",   icon: Dumbbell,      color: "#EF4444", label: "Sport"     },
    { key: "piggybank",  icon: Cat,            color: "#F97316", label: "Boshqa"   },
    { key: "shield",     icon: Shield,        color: "#3B82F6", label: "Sug'urta"  },
];

function getSafeIcon(key: string) {
    return SAFE_ICONS.find(i => i.key === key) ?? SAFE_ICONS[0];
}

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────
function timeAgo(d: string) {
    const m = Math.floor((Date.now() - new Date(d).getTime()) / 60000);
    if (m < 1) return "Hozir";
    if (m < 60) return `${m} daq. oldin`;
    const h = Math.floor(m / 60);
    if (h < 24) return `${h} soat oldin`;
    return new Date(d).toLocaleDateString("uz-UZ");
}

// ─────────────────────────────────────────────────────────────────────────────
// AnimatedBackground
// ─────────────────────────────────────────────────────────────────────────────
function AnimatedBackground() {
    return (
        <div className="fixed inset-0 -z-10 overflow-hidden pointer-events-none">
            <div className="absolute inset-0
                bg-gradient-to-br from-white via-sky-50 to-blue-100
                dark:from-[#020B18] dark:via-[#050D1F] dark:to-[#071428]
                transition-colors duration-700" />
            <motion.div className="absolute rounded-full blur-[120px] opacity-30 dark:opacity-20 bg-blue-400 dark:bg-[#0066FF]"
                style={{ width: 600, height: 600, top: "-10%", right: "-5%" }}
                animate={{ x: [0, 40, -20, 0], y: [0, -30, 20, 0], scale: [1, 1.1, 0.95, 1] }}
                transition={{ duration: 18, repeat: Infinity, ease: "easeInOut" }} />
            <motion.div className="absolute rounded-full blur-[160px] opacity-20 dark:opacity-15 bg-cyan-300 dark:bg-[#00CCFF]"
                style={{ width: 500, height: 500, bottom: "-5%", left: "-8%" }}
                animate={{ x: [0, -25, 35, 0], y: [0, 20, -15, 0], scale: [1, 0.9, 1.08, 1] }}
                transition={{ duration: 22, repeat: Infinity, ease: "easeInOut", delay: 3 }} />
            <div className="absolute inset-0 opacity-[0.03] dark:opacity-[0.04]"
                style={{
                    backgroundImage: `linear-gradient(rgba(0,100,255,0.5) 1px, transparent 1px),
                        linear-gradient(90deg, rgba(0,100,255,0.5) 1px, transparent 1px)`,
                    backgroundSize: "60px 60px",
                }} />
        </div>
    );
}

// ─────────────────────────────────────────────────────────────────────────────
// AnimatedCounter — raqam asta o'zgaradi
// ─────────────────────────────────────────────────────────────────────────────
function AnimatedCounter({ value }: { value: number }) {
    const ref = useRef<HTMLSpanElement>(null);
    const motionVal = useMotionValue(value);

    useEffect(() => {
        const controls = animate(motionVal, value, {
            duration: 0.8,
            ease: "easeOut",
            onUpdate(v) {
                if (ref.current) ref.current.textContent = Math.round(v).toLocaleString();
            },
        });
        return controls.stop;
    }, [value, motionVal]);

    return <span ref={ref}>{value.toLocaleString()}</span>;
}

// ─────────────────────────────────────────────────────────────────────────────
// GlassModal — umumiy shisha modal wrapper
// ─────────────────────────────────────────────────────────────────────────────
function GlassModal({ children, onClose }: { children: React.ReactNode; onClose: () => void }) {
    const modalRef = useRef<HTMLDivElement>(null);
    const cursorX = useMotionValue(0.5);
    const cursorY = useMotionValue(0.5);
    const springX = useSpring(cursorX, { stiffness: 60, damping: 20 });
    const springY = useSpring(cursorY, { stiffness: 60, damping: 20 });
    const gradX = useTransform(springX, [0, 1], ["20%", "80%"]);
    const gradY = useTransform(springY, [0, 1], ["20%", "80%"]);
    const breathScale = useSpring(1, { stiffness: 30, damping: 15 });

    useEffect(() => {
        const iv = setInterval(() => breathScale.set(breathScale.get() > 1 ? 1 : 1.006), 2500);
        return () => clearInterval(iv);
    }, [breathScale]);

    const handleMM = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
        if (!modalRef.current) return;
        const r = modalRef.current.getBoundingClientRect();
        cursorX.set((e.clientX - r.left) / r.width);
        cursorY.set((e.clientY - r.top) / r.height);
    }, [cursorX, cursorY]);

    return (
        <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center px-4"
            style={{ backdropFilter: "blur(20px)", WebkitBackdropFilter: "blur(20px)" }}
            onClick={onClose}
        >
            <div className="absolute inset-0 bg-blue-900/20 dark:bg-black/40" />
            <motion.div
                ref={modalRef} onMouseMove={handleMM}
                onClick={(e) => e.stopPropagation()}
                initial={{ opacity: 0, scale: 0.85, y: 50, clipPath: "ellipse(60% 20% at 50% 100%)" }}
                animate={{ opacity: 1, scale: 1, y: 0, clipPath: "ellipse(100% 100% at 50% 50%)" }}
                exit={{ opacity: 0, scale: 0.88, y: 30, clipPath: "ellipse(60% 20% at 50% 100%)" }}
                transition={{ type: "spring", stiffness: 200, damping: 22,
                    clipPath: { duration: 0.5, ease: [0.16, 1, 0.3, 1] } }}
                style={{ scale: breathScale }}
                className="relative w-full max-w-sm overflow-hidden rounded-3xl z-10"
            >
                <div className="absolute inset-0 bg-white/65 dark:bg-[#050D1F]/75 backdrop-blur-2xl" />
                <motion.div className="absolute inset-0 pointer-events-none"
                    style={{ background: useTransform([gradX, gradY],
                        ([x, y]) => `radial-gradient(ellipse 55% 45% at ${x} ${y}, rgba(0,170,255,0.18) 0%, transparent 70%)`) }} />
                <div className="absolute inset-0 rounded-3xl border border-white/40 dark:border-white/10 ring-1 ring-inset ring-blue-400/20" />
                <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-blue-400/60 to-transparent" />
                <div className="relative z-10 p-6">{children}</div>
            </motion.div>
        </motion.div>
    );
}

// ─────────────────────────────────────────────────────────────────────────────
// DepositModal
// ─────────────────────────────────────────────────────────────────────────────
function DepositModal({ currency, onClose, onSuccess }: { currency: Currency; onClose: () => void; onSuccess: (b: string) => void }) {
    const t = useTranslations("Pay");
    const [amount, setAmount] = useState("");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const [done, setDone] = useState(false);
    const sym = currencySymbol(currency);

    async function submit(e: React.FormEvent) {
        e.preventDefault(); setError("");
        const val = Number(amount);
        if (!val || val < minAmount(currency)) { setError(`Kamida ${money(minAmount(currency), currency)}`); return; }
        setLoading(true);
        try {
            const res = await fetch("/api/pay/deposit", {
                method: "POST", headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ amount: val }),
            });
            const data = await res.json();
            if (!res.ok) { setError(data.error || t("deposit_error")); }
            else if (data.redirectUrl) { window.location.href = data.redirectUrl; }
            else { setDone(true); onSuccess(String(data.balance)); setTimeout(onClose, 2000); }
        } catch { setError(t("deposit_error")); } finally { setLoading(false); }
    }

    return (
        <GlassModal onClose={onClose}>
            {done ? (
                <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
                    transition={{ type: "spring", stiffness: 300, damping: 20 }}
                    className="flex flex-col items-center gap-3 py-8">
                    <div className="relative">
                        <motion.div className="absolute inset-0 rounded-full bg-emerald-400/30"
                            animate={{ scale: [1, 2.5], opacity: [0.5, 0] }} transition={{ duration: 1.2, repeat: Infinity }} />
                        <div className="relative w-16 h-16 rounded-full bg-emerald-500/20 flex items-center justify-center">
                            <CheckCircle2 className="text-emerald-400" size={32} />
                        </div>
                    </div>
                    <p className="text-gray-900 dark:text-white font-bold text-xl">{t("deposit_success")}</p>
                    <p className="text-gray-500 dark:text-white/40 text-sm">+{money(amount, currency)} qo&apos;shildi</p>
                </motion.div>
            ) : (
                <>
                    <div className="flex items-center justify-between mb-5">
                        <div>
                            <h3 className="text-gray-900 dark:text-white font-bold text-xl">{t("deposit_title")}</h3>
                            <p className="text-gray-500 dark:text-white/40 text-xs mt-0.5">{t("deposit_desc")}</p>
                        </div>
                        <button onClick={onClose} className="w-8 h-8 rounded-full bg-gray-100/80 dark:bg-white/5 hover:bg-gray-200 dark:hover:bg-white/10 flex items-center justify-center transition">
                            <X size={14} className="text-gray-500 dark:text-white/50" />
                        </button>
                    </div>
                    <div className="grid grid-cols-3 gap-2 mb-4">
                        {quickAmounts(currency).map((q, i) => (
                            <motion.button key={q} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: i * 0.05 }} onClick={() => setAmount(String(q))}
                                className={`py-2 rounded-2xl text-xs font-bold border transition-all
                                    ${amount === String(q)
                                        ? "bg-blue-500/20 border-blue-400/60 text-blue-600 dark:text-blue-300 scale-105"
                                        : "bg-gray-100/60 dark:bg-white/5 border-gray-200/80 dark:border-white/8 text-gray-600 dark:text-white/50 hover:bg-blue-50 dark:hover:bg-white/10"
                                    }`}
                            >
                                {money(q, currency)}
                            </motion.button>
                        ))}
                    </div>
                    <form onSubmit={submit}>
                        <div className="relative mb-2">
                            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-blue-500 dark:text-blue-400 font-black text-base select-none">{sym}</span>
                            <input type="number" min={1} value={amount} onChange={(e) => setAmount(e.target.value)}
                                placeholder="Miqdor kiriting..."
                                className="w-full bg-gray-50/80 dark:bg-white/5 border border-gray-200 dark:border-white/10
                                    focus:border-blue-400 dark:focus:border-blue-500/50 rounded-2xl pl-16 pr-4 py-3.5
                                    text-gray-900 dark:text-white text-xl font-bold placeholder:text-gray-300 dark:placeholder:text-white/15 outline-none transition" />
                        </div>
                        <p className="text-xs text-gray-400 dark:text-white/25 mb-4 text-center">
                            {amount ? money(amount, currency) : `Minimal ${money(minAmount(currency), currency)}`}
                        </p>
                        {error && <motion.p initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }}
                            className="text-red-500 text-sm mb-3 flex items-center gap-1.5"><AlertCircle size={13} />{error}</motion.p>}
                        <motion.button type="submit" disabled={loading || !amount} whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}
                            className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-blue-600 to-cyan-500 hover:from-blue-500 hover:to-cyan-400
                                text-white font-bold text-sm shadow-lg shadow-blue-500/25 transition-all disabled:opacity-40 flex items-center justify-center gap-2">
                            {loading ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} />}
                            {t("deposit_submit")}
                        </motion.button>
                    </form>
                </>
            )}
        </GlassModal>
    );
}

// ─────────────────────────────────────────────────────────────────────────────
// TransferModal
// ─────────────────────────────────────────────────────────────────────────────
function TransferModal({ balance, currency, onClose, onSuccess }: {
    balance: string; currency: Currency; onClose: () => void; onSuccess: (b: string) => void;
}) {
    const [username, setUsername] = useState("");
    const [amount, setAmount]   = useState("");
    const [note, setNote]       = useState("");
    const [loading, setLoading] = useState(false);
    const [error, setError]     = useState("");
    const [done, setDone]       = useState<{ to: string; amount: number } | null>(null);
    const sym = currencySymbol(currency);

    async function submit(e: React.FormEvent) {
        e.preventDefault(); setError("");
        const val = Number(amount);
        if (!username.trim()) { setError("Username kiriting"); return; }
        if (!val || val < minAmount(currency))  { setError(`Kamida ${money(minAmount(currency), currency)}`); return; }
        if (val > Number(balance)) { setError("Balans yetarli emas"); return; }
        setLoading(true);
        try {
            const res = await fetch("/api/pay/transfer", {
                method: "POST", headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ toUsername: username.trim(), amount: val, note }),
            });
            const data = await res.json();
            if (!res.ok) { setError(data.error); }
            else { setDone({ to: data.to?.username ?? username, amount: val }); onSuccess(String(data.balance)); setTimeout(onClose, 2200); }
        } catch { setError("Xatolik yuz berdi"); } finally { setLoading(false); }
    }

    return (
        <GlassModal onClose={onClose}>
            {done ? (
                <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
                    transition={{ type: "spring", stiffness: 300, damping: 20 }}
                    className="flex flex-col items-center gap-3 py-8">
                    <div className="relative">
                        <motion.div className="absolute inset-0 rounded-full bg-blue-400/30"
                            animate={{ scale: [1, 2.5], opacity: [0.5, 0] }} transition={{ duration: 1.2, repeat: Infinity }} />
                        <div className="w-16 h-16 rounded-full bg-blue-500/20 flex items-center justify-center relative">
                            <Send className="text-blue-400" size={28} />
                        </div>
                    </div>
                    <p className="text-gray-900 dark:text-white font-bold text-xl">Yuborildi!</p>
                    <p className="text-gray-500 dark:text-white/40 text-sm">{money(done.amount, currency)} → @{done.to}</p>
                </motion.div>
            ) : (
                <>
                    <div className="flex items-center justify-between mb-5">
                        <div>
                            <h3 className="text-gray-900 dark:text-white font-bold text-xl">Pul yuborish</h3>
                            <p className="text-gray-500 dark:text-white/40 text-xs mt-0.5">Username orqali do&apos;stingizga</p>
                        </div>
                        <button onClick={onClose} className="w-8 h-8 rounded-full bg-gray-100/80 dark:bg-white/5 hover:bg-gray-200 dark:hover:bg-white/10 flex items-center justify-center transition">
                            <X size={14} className="text-gray-500 dark:text-white/50" />
                        </button>
                    </div>
                    <form onSubmit={submit} className="space-y-3">
                        {/* Username */}
                        <div className="relative">
                            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-blue-400 font-bold select-none">@</span>
                            <input value={username} onChange={(e) => setUsername(e.target.value.replace(/^@/, ""))}
                                placeholder="username" autoComplete="off"
                                className="w-full bg-gray-50/80 dark:bg-white/5 border border-gray-200 dark:border-white/10
                                    focus:border-blue-400 dark:focus:border-blue-500/50 rounded-2xl pl-10 pr-4 py-3
                                    text-gray-900 dark:text-white font-semibold placeholder:text-gray-300 dark:placeholder:text-white/20 outline-none transition" />
                        </div>
                        {/* Miqdor */}
                        <div className="relative">
                            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-blue-500 dark:text-blue-400 font-black text-sm select-none">{sym}</span>
                            <input type="number" min={1} value={amount} onChange={(e) => setAmount(e.target.value)}
                                placeholder="Miqdor"
                                className="w-full bg-gray-50/80 dark:bg-white/5 border border-gray-200 dark:border-white/10
                                    focus:border-blue-400 dark:focus:border-blue-500/50 rounded-2xl pl-16 pr-4 py-3
                                    text-gray-900 dark:text-white text-lg font-bold placeholder:text-gray-300 dark:placeholder:text-white/20 outline-none transition" />
                        </div>
                        {/* Izoh */}
                        <div className="relative">
                            <StickyNote size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 dark:text-white/30" />
                            <input value={note} onChange={(e) => setNote(e.target.value)} maxLength={80}
                                placeholder="Izoh (ixtiyoriy)"
                                className="w-full bg-gray-50/80 dark:bg-white/5 border border-gray-200 dark:border-white/10
                                    focus:border-blue-400 dark:focus:border-blue-500/50 rounded-2xl pl-10 pr-4 py-3
                                    text-gray-900 dark:text-white font-medium placeholder:text-gray-300 dark:placeholder:text-white/20 outline-none transition" />
                        </div>
                        <p className="text-xs text-gray-400 dark:text-white/25 text-center">
                            Balans: <span className="text-blue-500 dark:text-blue-400 font-bold">{money(balance, currency)}</span>
                        </p>
                        {error && <motion.p initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }}
                            className="text-red-500 text-sm flex items-center gap-1.5"><AlertCircle size={13} />{error}</motion.p>}
                        <motion.button type="submit" disabled={loading || !username || !amount} whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}
                            className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-blue-600 to-cyan-500 hover:from-blue-500 hover:to-cyan-400
                                text-white font-bold text-sm shadow-lg shadow-blue-500/25 transition-all disabled:opacity-40 flex items-center justify-center gap-2">
                            {loading ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
                            Yuborish
                        </motion.button>
                    </form>
                </>
            )}
        </GlassModal>
    );
}

// ─────────────────────────────────────────────────────────────────────────────
// SafeCard — bitta seyf
// ─────────────────────────────────────────────────────────────────────────────
function SafeCard({ safe, currency, onAction }: {
    safe: WalletSafe;
    currency: Currency;
    onAction: (id: string, action: "deposit" | "withdraw", amount: number) => void;
}) {
    const [open, setOpen]     = useState(false);
    const [amount, setAmount] = useState("");
    const [mode, setMode]     = useState<"deposit" | "withdraw">("deposit");
    const [loading, setLoading] = useState(false);

    const pct = Math.min(100, (Number(safe.balance) / Number(safe.targetAmount)) * 100);
    const remaining = Math.max(0, Number(safe.targetAmount) - Number(safe.balance));

    // Taxminiy vaqt (kuniga o'rtacha kerak bo'lsa)
    async function handleAction() {
        const val = Number(amount);
        if (!val || val < 1) return;
        setLoading(true);
        try {
            const res = await fetch(`/api/pay/safe/${safe.id}`, {
                method: "POST", headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ action: mode, amount: val }),
            });
            if (res.ok) { onAction(safe.id, mode, val); setOpen(false); setAmount(""); }
        } finally { setLoading(false); }
    }

    return (
        <motion.div layout initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
            className="bg-white/60 dark:bg-white/[0.04] border border-gray-100 dark:border-white/[0.07]
                hover:bg-white/80 dark:hover:bg-white/[0.06] backdrop-blur-sm rounded-2xl p-4 transition-colors">
            <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2.5">
                    {(() => {
                        const si = getSafeIcon(safe.emoji);
                        const Icon = si.icon;
                        return (
                            <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
                                style={{ backgroundColor: si.color + "20" }}>
                                <Icon size={18} style={{ color: si.color }} />
                            </div>
                        );
                    })()}
                    <div>
                        <p className="text-gray-900 dark:text-white font-bold text-sm">{safe.name}</p>
                        <p className="text-gray-400 dark:text-white/30 text-xs">
                            {money(safe.balance, currency)} / {money(safe.targetAmount, currency)}
                        </p>
                    </div>
                </div>
                {safe.isCompleted && (
                    <span className="text-xs bg-emerald-100 dark:bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 font-bold px-2 py-1 rounded-full">
                        ✓ To&apos;ldi
                    </span>
                )}
            </div>

            {/* Progress bar */}
            <div className="h-2 bg-gray-100 dark:bg-white/5 rounded-full overflow-hidden mb-2">
                <motion.div className="h-full rounded-full bg-gradient-to-r from-blue-500 to-cyan-400"
                    initial={{ width: 0 }} animate={{ width: `${pct}%` }}
                    transition={{ duration: 0.8, ease: "easeOut" }} />
            </div>
            <div className="flex justify-between text-xs text-gray-400 dark:text-white/25 mb-3">
                <span>{pct.toFixed(0)}%</span>
                {!safe.isCompleted && <span>Qoldi: {money(remaining, currency)}</span>}
            </div>

            {/* Amallar */}
            <div className="flex gap-2">
                <button onClick={() => { setMode("deposit"); setOpen(!open); }}
                    className="flex-1 py-2 rounded-xl bg-blue-500/10 hover:bg-blue-500/20 text-blue-600 dark:text-blue-400
                        text-xs font-bold transition flex items-center justify-center gap-1">
                    <Lock size={11} /> Solish
                </button>
                <button onClick={() => { setMode("withdraw"); setOpen(!open); }}
                    disabled={Number(safe.balance) === 0}
                    className="flex-1 py-2 rounded-xl bg-purple-500/10 hover:bg-purple-500/20 text-purple-600 dark:text-purple-400
                        text-xs font-bold transition flex items-center justify-center gap-1 disabled:opacity-30">
                    <Unlock size={11} /> Olish
                </button>
            </div>

            {/* Inline action */}
            <AnimatePresence>
                {open && (
                    <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.25 }} className="overflow-hidden">
                        <div className="pt-3 flex gap-2">
                            <div className="relative flex-1">
                                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-blue-400 font-bold text-xs">{currencySymbol(currency)}</span>
                                <input type="number" min={1} value={amount} onChange={(e) => setAmount(e.target.value)}
                                    placeholder="Miqdor"
                                    className="w-full bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10
                                        rounded-xl pl-12 pr-3 py-2.5 text-gray-900 dark:text-white text-sm font-bold
                                        placeholder:text-gray-300 dark:placeholder:text-white/20 outline-none" />
                            </div>
                            <button onClick={handleAction} disabled={loading || !amount}
                                className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-cyan-500
                                    text-white font-bold text-sm disabled:opacity-40 transition">
                                {loading ? <Loader2 size={14} className="animate-spin" /> : "OK"}
                            </button>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </motion.div>
    );
}

// ─────────────────────────────────────────────────────────────────────────────
// CreateSafeModal
// ─────────────────────────────────────────────────────────────────────────────
function CreateSafeModal({ currency, onClose, onCreate }: {
    currency: Currency;
    onClose: () => void;
    onCreate: (safe: WalletSafe) => void;
}) {
    const [name, setName]       = useState("");
    const [iconKey, setIconKey] = useState<SafeIconKey>("landmark");
    const [target, setTarget]   = useState("");
    const [loading, setLoading] = useState(false);
    const [error, setError]   = useState("");

    async function submit(e: React.FormEvent) {
        e.preventDefault(); setError("");
        if (!name.trim()) { setError("Nom kiriting"); return; }
        if (!Number(target) || Number(target) < 1) { setError("Maqsad summani kiriting"); return; }
        setLoading(true);
        try {
            const res = await fetch("/api/pay/safe", {
                method: "POST", headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ name: name.trim(), emoji: iconKey, targetAmount: Number(target) }),
            });
            const data = await res.json();
            if (!res.ok) { setError(data.error); }
            else { onCreate(data.safe); onClose(); }
        } catch { setError("Xatolik"); } finally { setLoading(false); }
    }

    return (
        <GlassModal onClose={onClose}>
            <div className="flex items-center justify-between mb-5">
                <div>
                    <h3 className="text-gray-900 dark:text-white font-bold text-xl">Yangi seyf</h3>
                    <p className="text-gray-500 dark:text-white/40 text-xs mt-0.5">Maqsadli jamg&apos;arma yarating</p>
                </div>
                <button onClick={onClose} className="w-8 h-8 rounded-full bg-gray-100/80 dark:bg-white/5 hover:bg-gray-200 dark:hover:bg-white/10 flex items-center justify-center transition">
                    <X size={14} className="text-gray-500 dark:text-white/50" />
                </button>
            </div>
            <form onSubmit={submit} className="space-y-4">
                {/* Ikonka tanlash */}
                <div>
                    <p className="text-gray-500 dark:text-white/40 text-xs mb-2">Ikonka</p>
                    <div className="grid grid-cols-6 gap-2">
                        {SAFE_ICONS.map((si) => {
                            const Icon = si.icon;
                            const active = iconKey === si.key;
                            return (
                                <button key={si.key} type="button" onClick={() => setIconKey(si.key)}
                                    title={si.label}
                                    className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all duration-150
                                        ${active ? "ring-2 scale-110" : "bg-gray-100/80 dark:bg-white/5 hover:bg-gray-200 dark:hover:bg-white/10"}`}
                                    style={active ? {
                                        backgroundColor: si.color + "22",
                                        boxShadow: `0 0 0 2px ${si.color}60`,
                                    } : {}}>
                                    <Icon size={18} style={{ color: active ? si.color : undefined }}
                                        className={active ? "" : "text-gray-400 dark:text-white/30"} />
                                </button>
                            );
                        })}
                    </div>
                    {/* Tanlangan ikonka nomi */}
                    <p className="text-xs text-gray-400 dark:text-white/25 mt-1.5">
                        {SAFE_ICONS.find(i => i.key === iconKey)?.label}
                    </p>
                </div>
                {/* Nom */}
                <input value={name} onChange={(e) => setName(e.target.value)} maxLength={40}
                    placeholder="Seyf nomi (masalan: Parij sayohati)"
                    className="w-full bg-gray-50/80 dark:bg-white/5 border border-gray-200 dark:border-white/10
                        focus:border-blue-400 dark:focus:border-blue-500/50 rounded-2xl px-4 py-3
                        text-gray-900 dark:text-white font-semibold placeholder:text-gray-300 dark:placeholder:text-white/20 outline-none transition" />
                {/* Maqsad */}
                <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-blue-500 dark:text-blue-400 font-black text-sm">{currencySymbol(currency)}</span>
                    <input type="number" min={1} value={target} onChange={(e) => setTarget(e.target.value)}
                        placeholder="Maqsad summa"
                        className="w-full bg-gray-50/80 dark:bg-white/5 border border-gray-200 dark:border-white/10
                            focus:border-blue-400 dark:focus:border-blue-500/50 rounded-2xl pl-16 pr-4 py-3
                            text-gray-900 dark:text-white text-lg font-bold placeholder:text-gray-300 dark:placeholder:text-white/20 outline-none transition" />
                </div>
                {error && <p className="text-red-500 text-sm flex items-center gap-1.5"><AlertCircle size={13} />{error}</p>}
                <motion.button type="submit" disabled={loading} whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}
                    className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-blue-600 to-cyan-500 text-white font-bold text-sm
                        shadow-lg shadow-blue-500/25 transition-all disabled:opacity-40 flex items-center justify-center gap-2">
                    {loading ? <Loader2 size={16} className="animate-spin" /> : <Shield size={16} />}
                    Seyf yaratish
                </motion.button>
            </form>
        </GlassModal>
    );
}

// ─────────────────────────────────────────────────────────────────────────────
// StatsCard — oylik statistika
// ─────────────────────────────────────────────────────────────────────────────
function StatsCard({ transactions, currency }: { transactions: Transaction[]; currency: Currency }) {
    const now = new Date();
    const thisMonth = transactions.filter(tx => {
        const d = new Date(tx.createdAt);
        return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
    });

    const totalIn  = thisMonth.filter(t => IN_TYPES.includes(t.type)).reduce((s, t) => s + Number(t.amount), 0);
    const totalOut = thisMonth.filter(t => OUT_TYPES.includes(t.type)).reduce((s, t) => s + Number(t.amount), 0);

    return (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
            className="bg-white/60 dark:bg-white/[0.03] border border-gray-100 dark:border-white/[0.06]
                backdrop-blur-sm rounded-2xl p-5 mb-4">
            <div className="flex items-center gap-2 mb-4">
                <BarChart3 size={16} className="text-blue-500 dark:text-blue-400" />
                <p className="text-gray-900 dark:text-white font-bold text-sm">Bu oylik statistika</p>
                <span className="text-xs text-gray-400 dark:text-white/25 ml-auto">
                    {now.toLocaleString("uz-UZ", { month: "long", year: "numeric" })}
                </span>
            </div>
            <div className="grid grid-cols-2 gap-3">
                <div className="bg-emerald-50/80 dark:bg-emerald-500/8 rounded-xl p-3">
                    <p className="text-emerald-600 dark:text-emerald-400/60 text-xs mb-1">Kirim</p>
                    <p className="text-emerald-600 dark:text-emerald-400 font-black text-lg">+{money(totalIn, currency)}</p>
                </div>
                <div className="bg-red-50/80 dark:bg-red-500/8 rounded-xl p-3">
                    <p className="text-red-500 dark:text-red-400/60 text-xs mb-1">Chiqim</p>
                    <p className="text-red-500 dark:text-red-400 font-black text-lg">-{money(totalOut, currency)}</p>
                </div>
            </div>
        </motion.div>
    );
}

// ─────────────────────────────────────────────────────────────────────────────
// WithdrawModal — kartaga/hisobga pul yechish
// ─────────────────────────────────────────────────────────────────────────────
function WithdrawModal({ balance, currency, onClose, onSuccess }: {
    balance: string; currency: Currency; onClose: () => void; onSuccess: (b: string) => void;
}) {
    const [amount, setAmount] = useState("");
    const [card, setCard] = useState("");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const [done, setDone] = useState(false);
    const sym = currencySymbol(currency);

    async function submit(e: React.FormEvent) {
        e.preventDefault(); setError("");
        const val = Number(amount);
        if (!val || val < minAmount(currency)) { setError(`Kamida ${money(minAmount(currency), currency)}`); return; }
        if (val > Number(balance)) { setError("Balans yetarli emas"); return; }
        if (card.replace(/\D/g, "").length < 12) { setError("Karta raqamini to'liq kiriting"); return; }
        setLoading(true);
        try {
            const res = await fetch("/api/pay/withdraw", {
                method: "POST", headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ amount: val, method: "card", destination: card }),
            });
            const data = await res.json();
            if (!res.ok) { setError(data.error || "Xatolik"); }
            else { setDone(true); onSuccess(String(data.balance)); setTimeout(onClose, 2000); }
        } catch { setError("Xatolik yuz berdi"); } finally { setLoading(false); }
    }

    return (
        <GlassModal onClose={onClose}>
            {done ? (
                <div className="flex flex-col items-center gap-3 py-8">
                    <div className="w-16 h-16 rounded-full bg-emerald-500/20 flex items-center justify-center"><CheckCircle2 className="text-emerald-400" size={32} /></div>
                    <p className="text-gray-900 dark:text-white font-bold text-xl">So&apos;rov qabul qilindi</p>
                    <p className="text-gray-500 dark:text-white/40 text-sm">{money(amount, currency)} kartaga yo&apos;naltirildi</p>
                </div>
            ) : (
                <>
                    <div className="flex items-center justify-between mb-5">
                        <div>
                            <h3 className="text-gray-900 dark:text-white font-bold text-xl">Pul yechish</h3>
                            <p className="text-gray-500 dark:text-white/40 text-xs mt-0.5">Kartangizga o&apos;tkazish</p>
                        </div>
                        <button onClick={onClose} className="w-8 h-8 rounded-full bg-gray-100/80 dark:bg-white/5 hover:bg-gray-200 dark:hover:bg-white/10 flex items-center justify-center transition">
                            <X size={14} className="text-gray-500 dark:text-white/50" />
                        </button>
                    </div>
                    <form onSubmit={submit} className="space-y-3">
                        <div className="relative">
                            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-blue-500 dark:text-blue-400 font-black text-sm select-none">{sym}</span>
                            <input type="number" min={1} value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="Miqdor"
                                className="w-full bg-gray-50/80 dark:bg-white/5 border border-gray-200 dark:border-white/10 focus:border-blue-400 dark:focus:border-blue-500/50 rounded-2xl pl-16 pr-4 py-3 text-gray-900 dark:text-white text-lg font-bold placeholder:text-gray-300 dark:placeholder:text-white/20 outline-none transition" />
                        </div>
                        <input value={card} onChange={(e) => setCard(e.target.value)} inputMode="numeric" maxLength={19} placeholder={currency === "UZS" ? "Karta raqami (8600 ....)" : "Karta raqami"}
                            className="w-full bg-gray-50/80 dark:bg-white/5 border border-gray-200 dark:border-white/10 focus:border-blue-400 dark:focus:border-blue-500/50 rounded-2xl px-4 py-3 text-gray-900 dark:text-white font-semibold placeholder:text-gray-300 dark:placeholder:text-white/20 outline-none transition" />
                        <p className="text-xs text-gray-400 dark:text-white/25 text-center">
                            Balans: <span className="text-blue-500 dark:text-blue-400 font-bold">{money(balance, currency)}</span>
                        </p>
                        {error && <p className="text-red-500 text-sm flex items-center gap-1.5"><AlertCircle size={13} />{error}</p>}
                        <motion.button type="submit" disabled={loading || !amount || !card} whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}
                            className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-blue-600 to-cyan-500 text-white font-bold text-sm shadow-lg shadow-blue-500/25 transition-all disabled:opacity-40 flex items-center justify-center gap-2">
                            {loading ? <Loader2 size={16} className="animate-spin" /> : <ArrowUpRight size={16} />} Yechish
                        </motion.button>
                    </form>
                </>
            )}
        </GlassModal>
    );
}

// ─────────────────────────────────────────────────────────────────────────────
// BalanceCard — 3D tilt + animatsiyali counter
// ─────────────────────────────────────────────────────────────────────────────
function BalanceCard({ balance, currency, loading, onDeposit, onTransfer, onWithdraw, t }:
    { balance: string; currency: Currency; loading: boolean; onDeposit: () => void; onTransfer: () => void; onWithdraw: () => void; t: (k: string) => string }) {
    const cardRef = useRef<HTMLDivElement>(null);
    const rX = useSpring(0, { stiffness: 100, damping: 20 });
    const rY = useSpring(0, { stiffness: 100, damping: 20 });

    return (
        <motion.div ref={cardRef}
            onMouseMove={(e) => {
                if (!cardRef.current) return;
                const r = cardRef.current.getBoundingClientRect();
                rY.set(((e.clientX - r.left - r.width / 2) / r.width) * 8);
                rX.set(-((e.clientY - r.top - r.height / 2) / r.height) * 6);
            }}
            onMouseLeave={() => { rX.set(0); rY.set(0); }}
            style={{ rotateX: rX, rotateY: rY, transformPerspective: 800 }}
            initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, type: "spring", stiffness: 200, damping: 25 }}
            className="relative overflow-hidden rounded-3xl p-6 cursor-default select-none mb-5">
            <div className="absolute inset-0 bg-gradient-to-br from-white/80 to-blue-50/60
                dark:from-blue-950/60 dark:to-[#050D1F]/80 backdrop-blur-xl
                border border-blue-200/60 dark:border-blue-500/15 transition-colors duration-500" />
            <motion.div className="absolute inset-0 pointer-events-none" animate={{
                background: [
                    "radial-gradient(ellipse 60% 40% at 20% 30%, rgba(0,150,255,0.12) 0%, transparent 70%)",
                    "radial-gradient(ellipse 60% 40% at 80% 70%, rgba(0,200,255,0.12) 0%, transparent 70%)",
                    "radial-gradient(ellipse 60% 40% at 20% 30%, rgba(0,150,255,0.12) 0%, transparent 70%)",
                ],
            }} transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }} />
            <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-blue-400/50 to-transparent" />
            <div className="absolute right-5 top-6 text-5xl font-black leading-none text-blue-500/10 dark:text-blue-400/8 select-none pointer-events-none">{currency}</div>

            <div className="relative z-10">
                <p className="text-gray-500 dark:text-white/40 text-sm font-medium mb-2">{t("balance_label")}</p>
                {loading ? (
                    <div className="flex items-center gap-3 h-16"><Loader2 size={22} className="animate-spin text-blue-400" /><span className="text-gray-400 dark:text-white/30 text-sm">Yuklanmoqda...</span></div>
                ) : (
                    <>
                        <div className="flex items-end gap-2 mb-1">
                            {currency === "USD" && <span className="text-3xl font-bold mb-1.5 text-blue-400 dark:text-blue-300/60">$</span>}
                            <span className="text-5xl font-black tracking-tighter text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-cyan-500 dark:from-blue-400 dark:to-cyan-300">
                                <AnimatedCounter value={Math.round(Number(balance))} />
                            </span>
                            {currency === "UZS" && <span className="text-2xl font-bold mb-1.5 text-blue-400 dark:text-blue-300/60">so&apos;m</span>}
                        </div>
                    </>
                )}
                <div className="flex gap-3 mt-5">
                    <motion.button onClick={onDeposit} whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.96 }}
                        className="flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-gradient-to-r from-blue-600 to-cyan-500
                            hover:from-blue-500 hover:to-cyan-400 text-white font-bold text-sm shadow-lg shadow-blue-500/20 transition-all">
                        <Plus size={16} />{t("deposit_btn")}
                    </motion.button>
                    <motion.button onClick={onTransfer} whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.96 }}
                        className="flex items-center gap-2 px-5 py-2.5 rounded-2xl
                            bg-gray-100/80 dark:bg-white/8 border border-gray-200 dark:border-white/10
                            hover:bg-blue-50 dark:hover:bg-white/12 text-gray-700 dark:text-white/70
                            font-bold text-sm transition-all">
                        <Send size={16} />Yuborish
                    </motion.button>
                    <motion.button onClick={onWithdraw} whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.96 }}
                        className="flex items-center gap-2 px-5 py-2.5 rounded-2xl
                            bg-gray-100/80 dark:bg-white/8 border border-gray-200 dark:border-white/10
                            hover:bg-blue-50 dark:hover:bg-white/12 text-gray-700 dark:text-white/70
                            font-bold text-sm transition-all">
                        <ArrowUpRight size={16} />Yechish
                    </motion.button>
                </div>
            </div>
        </motion.div>
    );
}

// ─────────────────────────────────────────────────────────────────────────────
// Main: AlkhPayContent
// ─────────────────────────────────────────────────────────────────────────────
export function AlkhPayContent() {
    const t = useTranslations("Pay");
    const [wallet, setWallet]         = useState<WalletData | null>(null);
    const [loading, setLoading]       = useState(true);
    const [depositOpen, setDepositOpen]   = useState(false);
    const [transferOpen, setTransferOpen] = useState(false);
    const [withdrawOpen, setWithdrawOpen] = useState(false);
    const [createSafeOpen, setCreateSafeOpen] = useState(false);
    const [txFilter, setTxFilter]     = useState<TxFilter>("all");
    const [activeTab, setActiveTab]   = useState<"wallet" | "safe">("wallet");

    const reload = useCallback(() => {
        fetch("/api/pay/wallet").then((r) => r.json()).then(setWallet);
    }, []);

    useEffect(() => {
        fetch("/api/pay/wallet").then((r) => r.json()).then(setWallet).finally(() => setLoading(false));
    }, []);

    function handleBalanceUpdate(newBalance: string) {
        setWallet((prev) => { reload(); return prev ? { ...prev, balance: newBalance } : prev; });
    }

    const currency = asCur(wallet?.currency);

    // Filterlangan tranzaksiyalar
    const filteredTx = (wallet?.transactions ?? []).filter(tx => {
        if (txFilter === "in")  return IN_TYPES.includes(tx.type);
        if (txFilter === "out") return OUT_TYPES.includes(tx.type);
        return true;
    });

    function handleSafeAction(id: string, action: "deposit" | "withdraw", amount: number) {
        setWallet(prev => {
            if (!prev) return prev;
            const safes = prev.safes.map(s => {
                if (s.id !== id) return s;
                const newBal = action === "deposit" ? Number(s.balance) + amount : Number(s.balance) - amount;
                return { ...s, balance: String(newBal), isCompleted: newBal >= Number(s.targetAmount) };
            });
            const newWalletBal = action === "deposit"
                ? Number(prev.balance) - amount
                : Number(prev.balance) + amount;
            reload();
            return { ...prev, balance: String(newWalletBal), safes };
        });
    }

    return (
        <>
            <AnimatedBackground />
            <div className="min-h-screen">
                <AlkhPayNavbar />

                <div className="container mx-auto px-4 max-w-xl py-6">
                    {/* Test banner */}
                    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                        className="flex items-start gap-2.5 bg-amber-50/80 dark:bg-amber-500/8
                            border border-amber-200/80 dark:border-amber-500/15
                            rounded-2xl px-4 py-3 mb-5 backdrop-blur-sm">
                        <AlertCircle size={15} className="text-amber-500 dark:text-amber-400 mt-0.5 shrink-0" />
                        <p className="text-amber-700 dark:text-amber-300/70 text-xs leading-relaxed">{t("test_mode_banner")}</p>
                    </motion.div>

                    {/* Balans kartasi */}
                    <BalanceCard
                        balance={wallet?.balance ?? "0"}
                        currency={currency}
                        loading={loading}
                        onDeposit={() => setDepositOpen(true)}
                        onTransfer={() => setTransferOpen(true)}
                        onWithdraw={() => setWithdrawOpen(true)}
                        t={t}
                    />

                    {/* Tab: Hamyon | Seyflar */}
                    <div className="flex gap-1 bg-gray-100/80 dark:bg-white/5 rounded-2xl p-1 mb-5">
                        {(["wallet", "safe"] as const).map((tab) => (
                            <button key={tab} onClick={() => setActiveTab(tab)}
                                className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-bold transition-all
                                    ${activeTab === tab
                                        ? "bg-white dark:bg-white/10 text-blue-600 dark:text-blue-400 shadow-sm"
                                        : "text-gray-500 dark:text-white/30 hover:text-gray-700 dark:hover:text-white/50"}`}>
                                {tab === "wallet" ? <><Wallet size={14} />Tranzaksiyalar</> : <><Shield size={14} />Seyflar {wallet?.safes.length ? `(${wallet.safes.length})` : ""}</>}
                            </button>
                        ))}
                    </div>

                    {/* ── HAMYON TABI ── */}
                    {activeTab === "wallet" && (
                        <>
                            {/* Statistika */}
                            {!loading && wallet && <StatsCard transactions={wallet.transactions} currency={currency} />}

                            {/* Filter */}
                            <div className="flex gap-2 mb-4">
                                {(["all", "in", "out"] as TxFilter[]).map((f) => (
                                    <button key={f} onClick={() => setTxFilter(f)}
                                        className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all
                                            ${txFilter === f
                                                ? "bg-blue-500 text-white shadow-sm shadow-blue-500/30"
                                                : "bg-gray-100 dark:bg-white/5 text-gray-500 dark:text-white/30 hover:bg-gray-200 dark:hover:bg-white/10"}`}>
                                        {f === "all" ? "Hammasi" : f === "in" ? "↓ Kirim" : "↑ Chiqim"}
                                    </button>
                                ))}
                            </div>

                            {/* Tranzaksiya ro'yxati */}
                            <div className="space-y-2">
                                {loading ? (
                                    <div className="flex justify-center py-12"><Loader2 size={24} className="animate-spin text-blue-400/40" /></div>
                                ) : filteredTx.length === 0 ? (
                                    <div className="flex flex-col items-center gap-3 py-14 text-gray-300 dark:text-white/20">
                                        <Wallet size={36} />
                                        <p className="text-sm">{t("history_empty")}</p>
                                    </div>
                                ) : filteredTx.map((tx, i) => {
                                    const meta = TX_META[tx.type] ?? { icon: Zap, color: "#9CA3AF", sign: "+" as const, label: tx.type };
                                    const Icon = meta.icon;
                                    return (
                                        <motion.div key={tx.id}
                                            initial={{ opacity: 0, x: -15 }} animate={{ opacity: 1, x: 0 }}
                                            transition={{ delay: i * 0.035, type: "spring", stiffness: 300, damping: 25 }}
                                            className="flex items-center gap-4 bg-white/60 dark:bg-white/[0.03]
                                                border border-gray-100 dark:border-white/[0.05]
                                                hover:bg-white/80 dark:hover:bg-white/[0.05]
                                                backdrop-blur-sm rounded-2xl px-4 py-3.5 transition-colors">
                                            <div className="w-10 h-10 rounded-2xl flex items-center justify-center shrink-0"
                                                style={{ backgroundColor: meta.color + "18" }}>
                                                <Icon size={18} style={{ color: meta.color }} />
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <p className="text-gray-900 dark:text-white text-sm font-semibold truncate">
                                                    {tx.description || meta.label}
                                                </p>
                                                <p className="text-gray-400 dark:text-white/30 text-xs mt-0.5">{timeAgo(tx.createdAt)}</p>
                                            </div>
                                            <div className="text-right shrink-0">
                                                <p className={`font-bold text-sm ${meta.sign === "+" ? "text-emerald-500 dark:text-emerald-400" : "text-red-500 dark:text-red-400"}`}>
                                                    {meta.sign}{money(tx.amount, asCur(tx.currency))}
                                                </p>
                                                <p className="text-gray-300 dark:text-white/20 text-xs mt-0.5">{money(tx.balanceAfter, asCur(tx.currency))}</p>
                                            </div>
                                        </motion.div>
                                    );
                                })}
                            </div>

                            {/* Tez orada */}
                            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5 }}
                                className="mt-6 bg-white/40 dark:bg-white/[0.02] border border-dashed border-blue-200/60 dark:border-white/8
                                    backdrop-blur-sm rounded-2xl p-5 flex items-center gap-4">
                                <Zap size={22} className="text-blue-400/40 shrink-0" />
                                <div>
                                    <p className="text-gray-500 dark:text-white/40 text-sm font-semibold">Tez orada</p>
                                    <p className="text-gray-400 dark:text-white/20 text-xs mt-0.5">
                                        Kartaga avtomatik pul yechish, eSport turnir to&apos;lovlari...
                                    </p>
                                </div>
                            </motion.div>
                        </>
                    )}

                    {/* ── SEYFLAR TABI ── */}
                    {activeTab === "safe" && (
                        <>
                            {/* Yangi seyf tugmasi */}
                            <motion.button onClick={() => setCreateSafeOpen(true)}
                                initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                                whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}
                                className="w-full mb-4 py-3 rounded-2xl
                                    bg-gradient-to-r from-blue-600/10 to-cyan-500/10
                                    hover:from-blue-600/20 hover:to-cyan-500/20
                                    border border-blue-400/20 hover:border-blue-400/40
                                    text-blue-600 dark:text-blue-400 font-bold text-sm
                                    flex items-center justify-center gap-2 transition-all">
                                <Plus size={16} /> Yangi seyf yaratish
                            </motion.button>

                            {/* Seyflar ro'yxati */}
                            {loading ? (
                                <div className="flex justify-center py-12"><Loader2 size={24} className="animate-spin text-blue-400/40" /></div>
                            ) : !wallet?.safes.length ? (
                                <div className="flex flex-col items-center gap-3 py-14 text-gray-300 dark:text-white/20">
                                    <Shield size={40} />
                                    <p className="text-sm">Hali seyflar yo&apos;q</p>
                                    <p className="text-xs text-center">Maqsadli jamg&apos;arma uchun seyf yarating</p>
                                </div>
                            ) : (
                                <div className="space-y-3">
                                    {wallet.safes.map(safe => (
                                        <SafeCard key={safe.id} safe={safe}
                                            currency={currency}
                                            onAction={handleSafeAction} />
                                    ))}
                                </div>
                            )}
                        </>
                    )}
                </div>
            </div>

            {/* Modallar */}
            <AnimatePresence>
                {depositOpen && <DepositModal currency={currency} onClose={() => setDepositOpen(false)} onSuccess={handleBalanceUpdate} />}
            </AnimatePresence>
            <AnimatePresence>
                {transferOpen && <TransferModal balance={wallet?.balance ?? "0"} currency={currency} onClose={() => setTransferOpen(false)} onSuccess={handleBalanceUpdate} />}
            </AnimatePresence>
            <AnimatePresence>
                {withdrawOpen && <WithdrawModal balance={wallet?.balance ?? "0"} currency={currency} onClose={() => setWithdrawOpen(false)} onSuccess={handleBalanceUpdate} />}
            </AnimatePresence>
            <AnimatePresence>
                {createSafeOpen && <CreateSafeModal currency={currency} onClose={() => setCreateSafeOpen(false)} onCreate={(safe) => {
                    setWallet(prev => prev ? { ...prev, safes: [safe, ...prev.safes] } : prev);
                }} />}
            </AnimatePresence>
        </>
    );
}
