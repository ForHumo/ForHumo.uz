"use client";

// BN "Ko'rib olish" hold modal (K4) — xaridor mahsulotni 24h ushlagach shu
// modal chiqadi: kod, 24h countdown, "qanday ishlaydi" izoh, bekor qilish.

import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { X, Clock, Loader2, Eye, CheckCircle2, Copy, ChevronRight } from "lucide-react";
import { useTranslations } from "next-intl";
import { BN } from "@/lib/bn-theme";

interface Hold {
    code: string;
    expiresAt: string;
    productTitle?: string;
}

export function BnInspectHoldModal({ hold, onClose, onCancelled }: {
    hold: Hold;
    onClose: () => void;
    onCancelled?: () => void;
}) {
    const t = useTranslations("bn.inspect");
    const [mounted, setMounted] = useState(false);
    const [now, setNow] = useState(() => Date.now());
    const [cancelling, setCancelling] = useState(false);
    const [copied, setCopied] = useState(false);

    useEffect(() => { setMounted(true); }, []);
    useEffect(() => {
        const id = setInterval(() => setNow(Date.now()), 1000);
        return () => clearInterval(id);
    }, []);
    if (!mounted) return null;

    const expMs = new Date(hold.expiresAt).getTime();
    const remain = Math.max(0, expMs - now);
    const totalMs = 24 * 3600 * 1000;
    const pct = Math.min(100, Math.max(0, ((totalMs - remain) / totalMs) * 100));
    const hours = Math.floor(remain / 3600000);
    const mins = Math.floor((remain % 3600000) / 60000);
    const secs = Math.floor((remain % 60000) / 1000);
    const expired = remain <= 0;

    async function copy() {
        try {
            await navigator.clipboard.writeText(hold.code);
            setCopied(true);
            setTimeout(() => setCopied(false), 1500);
        } catch { /* noop */ }
    }

    async function cancel() {
        if (!confirm(t("cancelConfirm"))) return;
        setCancelling(true);
        try {
            const r = await fetch(`/api/bn/inspect/${hold.code}/cancel`, { method: "POST" });
            if (r.ok) {
                onCancelled?.();
                onClose();
            }
        } finally { setCancelling(false); }
    }

    const content = (
        <div
            className="bn-scope fixed inset-0 z-[9999] flex items-end sm:items-center justify-center p-2 sm:p-4"
            style={{ background: "rgba(0,0,0,0.7)" }}
            onClick={onClose}
        >
            <div
                className="w-full max-w-md rounded-3xl overflow-hidden"
                style={{ background: BN.surface, border: `1px solid ${BN.borderGold}` }}
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header */}
                <div className="flex items-center gap-3 p-4" style={{ borderBottom: `1px solid ${BN.border}` }}>
                    <span
                        className="w-10 h-10 rounded-xl grid place-items-center flex-shrink-0"
                        style={{ background: BN.goldSoft, color: BN.gold }}
                    >
                        <Eye className="w-4 h-4" />
                    </span>
                    <div className="flex-1 min-w-0">
                        <p className="text-[15px] font-black">{t("yourCode")}</p>
                        {hold.productTitle && (
                            <p className="text-[11.5px] line-clamp-1" style={{ color: BN.text3 }}>{hold.productTitle}</p>
                        )}
                    </div>
                    <button onClick={onClose} className="p-1" style={{ color: BN.text3 }}>
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Kod */}
                <div className="p-5 text-center">
                    <button
                        onClick={copy}
                        className="inline-flex items-center gap-3 mx-auto mb-4 px-6 py-4 rounded-2xl text-[32px] font-black tabular-nums tracking-wider transition-transform active:scale-95"
                        style={{ background: BN.goldSoft, color: BN.gold, border: `2px dashed ${BN.borderGold}` }}
                    >
                        {hold.code}
                        {copied
                            ? <CheckCircle2 className="w-6 h-6" style={{ color: BN.ok }} />
                            : <Copy className="w-5 h-5 opacity-60" />}
                    </button>
                    <p className="text-[13px]" style={{ color: BN.text2 }}>{t("showAtShop")}</p>
                </div>

                {/* Timer */}
                <div className="px-5 pb-4">
                    <div className="flex items-center justify-between mb-2">
                        <span className="text-[12px] font-black flex items-center gap-1" style={{ color: BN.text2 }}>
                            <Clock className="w-3.5 h-3.5" /> {t("timeLeft")}
                        </span>
                        <span
                            className="text-[15px] tabular-nums font-black"
                            style={{ color: expired ? BN.err : hours < 3 ? BN.err : BN.text }}
                        >
                            {expired
                                ? t("expired")
                                : `${String(hours).padStart(2, "0")}:${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`}
                        </span>
                    </div>
                    <div className="h-2 rounded-full overflow-hidden" style={{ background: `${BN.text3}22` }}>
                        <div
                            className="h-full transition-all"
                            style={{
                                width: `${pct}%`,
                                background: expired ? BN.err : pct > 80 ? BN.err : pct > 50 ? BN.gold : BN.ok,
                            }}
                        />
                    </div>
                </div>

                {/* Qanday ishlaydi */}
                <div className="px-5 pb-4">
                    <p className="text-[12px] font-black uppercase tracking-wide mb-2" style={{ color: BN.text3 }}>
                        {t("howItWorks")}
                    </p>
                    <ol className="space-y-1.5 text-[12.5px]" style={{ color: BN.text2 }}>
                        {[t("step1"), t("step2"), t("step3")].map((step, i) => (
                            <li key={i} className="flex gap-2">
                                <span
                                    className="w-5 h-5 rounded-full grid place-items-center flex-shrink-0 text-[10px] font-black"
                                    style={{ background: BN.goldSoft, color: BN.gold }}
                                >{i + 1}</span>
                                <span>{step}</span>
                            </li>
                        ))}
                    </ol>
                </div>

                {/* Footer */}
                <div className="p-4 flex items-center gap-2" style={{ borderTop: `1px solid ${BN.border}` }}>
                    <button
                        onClick={cancel}
                        disabled={cancelling || expired}
                        className="flex-1 h-11 rounded-xl text-[13px] font-black flex items-center justify-center gap-1.5 disabled:opacity-60"
                        style={{ background: BN.errSoft, color: BN.err }}
                    >
                        {cancelling ? <Loader2 className="w-4 h-4 animate-spin" /> : <><X className="w-4 h-4" /> {t("cancelBtn")}</>}
                    </button>
                    <button
                        onClick={onClose}
                        className="flex-1 h-11 rounded-xl text-[13px] font-black flex items-center justify-center gap-1"
                        style={{ background: BN.gold, color: BN.onGold }}
                    >
                        Yopish <ChevronRight className="w-4 h-4" />
                    </button>
                </div>
            </div>
        </div>
    );

    return createPortal(content, document.body);
}
