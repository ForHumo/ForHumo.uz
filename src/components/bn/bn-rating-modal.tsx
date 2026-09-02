"use client";

// BN COMPLETED buyurtmadan keyin sotuvchi rating modali.
// 5-yulduz + ixtiyoriy matn. Portal orqali stacking context'dan chiqadi.
// Auto-open: buyurtma sahifasida COMPLETED bo'lsa va foydalanuvchi hali sharh
// yozmagan bo'lsa 1.5 sek delay bilan ochiladi. localStorage'da dismiss saqlanadi.

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useLocale } from "next-intl";
import { Star, X, Send, CheckCircle2 } from "lucide-react";
import { BN } from "@/lib/bn-theme";

interface Props {
    orderId: string;
    shopName: string;
    /** Foydalanuvchi allaqachon shu do'kon uchun sharh yozganmi (server tekshirgan). */
    alreadyRated: boolean;
    /** Auto-open — buyurtma detali sahifasida COMPLETED bo'lsa true berish. */
    autoOpen?: boolean;
}

const dismissKey = (id: string) => `bn-rating-dismissed-${id}`;

export function BnRatingModal({ orderId, shopName, alreadyRated, autoOpen }: Props) {
    const locale = useLocale();
    const [open, setOpen] = useState(false);
    const [rating, setRating] = useState(0);
    const [hover, setHover] = useState(0);
    const [text, setText] = useState("");
    const [submitting, setSubmitting] = useState(false);
    const [done, setDone] = useState(false);
    const shownRef = useRef(false);

    useEffect(() => {
        if (!autoOpen || alreadyRated || shownRef.current) return;
        try {
            if (localStorage.getItem(dismissKey(orderId))) return;
        } catch { /* localStorage yo'q — davom */ }
        shownRef.current = true;
        const t = setTimeout(() => setOpen(true), 1500);
        return () => clearTimeout(t);
    }, [autoOpen, alreadyRated, orderId]);

    if (alreadyRated) return null;

    async function submit() {
        if (rating < 1) return;
        setSubmitting(true);
        try {
            const r = await fetch(`/api/bn/orders/${orderId}/rate`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ rating, text: text.trim() || undefined }),
            });
            if (!r.ok) throw new Error();
            setDone(true);
            setTimeout(() => setOpen(false), 1500);
        } catch {
            alert(locale === "ru" ? "Ошибка" : locale === "en" ? "Error" : "Xatolik");
        } finally {
            setSubmitting(false);
        }
    }

    function dismiss() {
        try { localStorage.setItem(dismissKey(orderId), "1"); } catch { /* noop */ }
        setOpen(false);
    }

    const t = (u: string, r: string, e: string) => locale === "ru" ? r : locale === "en" ? e : u;

    if (typeof document === "undefined") return null;

    if (!open) {
        // Manual trigger tugma (agar auto-open ishlamagan bo'lsa)
        return (
            <button
                onClick={() => setOpen(true)}
                className="inline-flex items-center gap-2 h-11 px-4 rounded-xl text-[14px] font-semibold"
                style={{ background: BN.gold, color: BN.onGold }}
            >
                <Star className="w-4 h-4" fill="currentColor" />
                {t("Sotuvchini baholash", "Оценить продавца", "Rate seller")}
            </button>
        );
    }

    return createPortal(
        <div
            className="fixed inset-0 z-[9999] flex items-center justify-center p-4"
            style={{ background: "rgba(0,0,0,0.65)" }}
            onClick={dismiss}
        >
            <div
                className="w-full max-w-[440px] rounded-2xl overflow-hidden"
                style={{ background: BN.surface, border: `1px solid ${BN.border}` }}
                onClick={e => e.stopPropagation()}
            >
                <div className="p-5 flex items-start justify-between gap-3" style={{ borderBottom: `1px solid ${BN.border}` }}>
                    <div>
                        <div className="text-[16px] font-bold" style={{ color: BN.text }}>
                            {t("Sotuvchini baholang", "Оцените продавца", "Rate the seller")}
                        </div>
                        <div className="text-[13px] mt-1" style={{ color: BN.text2 }}>
                            {shopName}
                        </div>
                    </div>
                    <button onClick={dismiss} className="p-1 rounded-lg hover:bg-white/5" style={{ color: BN.text3 }}>
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {done ? (
                    <div className="p-8 flex flex-col items-center gap-3">
                        <CheckCircle2 className="w-16 h-16" style={{ color: BN.ok }} />
                        <div className="text-[15px] font-semibold" style={{ color: BN.text }}>
                            {t("Rahmat! Bahoingiz saqlandi.", "Спасибо! Оценка сохранена.", "Thanks! Your rating is saved.")}
                        </div>
                    </div>
                ) : (
                    <>
                        <div className="p-5 space-y-4">
                            {/* Stars */}
                            <div className="flex justify-center gap-2">
                                {[1, 2, 3, 4, 5].map(n => (
                                    <button
                                        key={n}
                                        onMouseEnter={() => setHover(n)}
                                        onMouseLeave={() => setHover(0)}
                                        onClick={() => setRating(n)}
                                        className="p-1 transition-transform hover:scale-110"
                                    >
                                        <Star
                                            className="w-10 h-10"
                                            fill={(hover || rating) >= n ? BN.gold : "none"}
                                            stroke={(hover || rating) >= n ? BN.gold : BN.text3}
                                            strokeWidth={1.5}
                                        />
                                    </button>
                                ))}
                            </div>
                            <div className="text-center text-[12px]" style={{ color: BN.text3 }}>
                                {rating === 0 && t("Yulduzni tanlang", "Выберите звёзды", "Pick a star")}
                                {rating === 1 && t("Yomon", "Плохо", "Poor")}
                                {rating === 2 && t("Qoniqarsiz", "Неудовлетворительно", "Fair")}
                                {rating === 3 && t("O'rtacha", "Средне", "OK")}
                                {rating === 4 && t("Yaxshi", "Хорошо", "Good")}
                                {rating === 5 && t("Ajoyib!", "Отлично!", "Excellent!")}
                            </div>

                            {/* Text */}
                            <textarea
                                value={text}
                                onChange={e => setText(e.target.value.slice(0, 1000))}
                                placeholder={t("Sharhingiz (ixtiyoriy)...", "Ваш отзыв (по желанию)...", "Your review (optional)...")}
                                rows={3}
                                className="w-full rounded-xl p-3 text-[13px] resize-none outline-none"
                                style={{ background: BN.surfaceUp, border: `1px solid ${BN.border}`, color: BN.text }}
                            />
                            <div className="text-[11px] text-right" style={{ color: BN.text3 }}>
                                {text.length}/1000
                            </div>
                        </div>

                        <div className="p-4 flex gap-2" style={{ background: BN.surfaceUp, borderTop: `1px solid ${BN.border}` }}>
                            <button
                                onClick={dismiss}
                                className="flex-1 h-11 rounded-xl text-[14px] font-medium"
                                style={{ background: "transparent", color: BN.text2, border: `1px solid ${BN.border}` }}
                            >
                                {t("Keyinroq", "Позже", "Later")}
                            </button>
                            <button
                                onClick={submit}
                                disabled={rating < 1 || submitting}
                                className="flex-1 h-11 rounded-xl text-[14px] font-semibold flex items-center justify-center gap-2"
                                style={{
                                    background: rating < 1 || submitting ? BN.surfaceUp : BN.gold,
                                    color: rating < 1 || submitting ? BN.text3 : BN.onGold,
                                    opacity: rating < 1 || submitting ? 0.5 : 1,
                                }}
                            >
                                <Send className="w-4 h-4" />
                                {submitting ? t("Yuborilyapti...", "Отправка...", "Sending...") : t("Yuborish", "Отправить", "Submit")}
                            </button>
                        </div>
                    </>
                )}
            </div>
        </div>,
        document.body,
    );
}
