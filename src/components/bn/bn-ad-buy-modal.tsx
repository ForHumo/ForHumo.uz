"use client";

// BN Reklama banner sotib olish modal.
// Foydalanuvchi: rasm upload + sarlavha + havola + kunlar soni.
// Jonli narx (CBU USD/UZS kursi + soliq) real vaqt ko'rsatiladi.
// Wallet balansidan yechib banner yaratadi va bo'sh slot'ga qo'yadi.

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useLocale } from "next-intl";
import { X, Upload, Loader2, CheckCircle2, Sparkles, DollarSign, Info } from "lucide-react";
import { BN } from "@/lib/bn-theme";
import { formatMoney } from "@/lib/money";

interface Props {
    open: boolean;
    onClose: () => void;
    onSuccess?: () => void;
}

interface Price {
    days: number;
    netUsdPerDay: number;
    grossUsdPerDay: number;
    grossUsdTotal: number;
    usdUzsRate: number;
    grossUzsPerDay: number;
    grossUzsTotal: number;
    itPark: boolean;
    breakdown: { dividendPct: number; turnoverPct: number; };
}

export function BnAdBuyModal({ open, onClose, onSuccess }: Props) {
    const locale = useLocale();
    const [imageUrl, setImageUrl] = useState("");
    const [uploading, setUploading] = useState(false);
    const [title, setTitle] = useState("");
    const [ctaUrl, setCtaUrl] = useState("");
    const [days, setDays] = useState(1);
    const [price, setPrice] = useState<Price | null>(null);
    const [busy, setBusy] = useState(false);
    const [err, setErr] = useState<string | null>(null);
    const [done, setDone] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const t = (u: string, r: string, e: string) => locale === "ru" ? r : locale === "en" ? e : u;

    useEffect(() => {
        if (!open) return;
        (async () => {
            try {
                const r = await fetch(`/api/bn/ads/price?days=${days}`);
                if (!r.ok) throw new Error();
                setPrice(await r.json());
            } catch { setPrice(null); }
        })();
    }, [open, days]);

    useEffect(() => {
        if (!open) {
            setImageUrl(""); setTitle(""); setCtaUrl(""); setDays(1);
            setErr(null); setDone(false);
        }
    }, [open]);

    async function upload(file: File) {
        setUploading(true); setErr(null);
        try {
            const fd = new FormData();
            fd.append("file", file);
            fd.append("kind", "ad");
            const r = await fetch("/api/bn/upload", { method: "POST", body: fd });
            const d = await r.json();
            if (!r.ok) throw new Error(d?.error || "upload_failed");
            setImageUrl(d.url);
        } catch (e) {
            setErr(e instanceof Error ? e.message : "upload_failed");
        } finally {
            setUploading(false);
        }
    }

    async function submit() {
        if (!imageUrl || !title.trim() || !ctaUrl.trim()) return;
        setBusy(true); setErr(null);
        try {
            const r = await fetch("/api/bn/ads", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ imageUrl, title: title.trim(), ctaUrl: ctaUrl.trim(), days }),
            });
            const d = await r.json();
            if (!r.ok) {
                const msg =
                    d?.error === "insufficient_balance" ? t("Hamyonda pul yetmadi", "Недостаточно средств", "Insufficient balance") :
                    d?.error === "all_slots_busy" ? t("Barcha slot band, keyinroq urinib ko'ring", "Все слоты заняты", "All slots busy") :
                    d?.error === "invalid_image" ? t("Rasm noto'g'ri", "Неверное изображение", "Invalid image") :
                    d?.error === "invalid_url" ? t("Havola noto'g'ri (http/https)", "Неверная ссылка", "Invalid URL") :
                    d?.error === "invalid_title" ? t("Sarlavha juda qisqa", "Слишком короткий заголовок", "Title too short") :
                    t("Xatolik", "Ошибка", "Error");
                setErr(msg);
                return;
            }
            setDone(true);
            setTimeout(() => { onSuccess?.(); onClose(); }, 1500);
        } catch {
            setErr(t("Tarmoq xatosi", "Ошибка сети", "Network error"));
        } finally {
            setBusy(false);
        }
    }

    if (!open || typeof document === "undefined") return null;

    return createPortal(
        <div
            className="fixed inset-0 z-[9999] flex items-center justify-center p-4 overflow-y-auto"
            style={{ background: "rgba(0,0,0,0.65)" }}
            onClick={() => !busy && !uploading && onClose()}
        >
            <div
                className="w-full max-w-[520px] rounded-2xl overflow-hidden my-8"
                style={{ background: BN.surface, border: `1px solid ${BN.border}` }}
                onClick={e => e.stopPropagation()}
            >
                {/* Header */}
                <div className="p-5 flex items-start justify-between gap-3" style={{ borderBottom: `1px solid ${BN.border}` }}>
                    <div>
                        <div className="flex items-center gap-2">
                            <Sparkles className="w-5 h-5" style={{ color: BN.gold }} />
                            <div className="text-[16px] font-bold" style={{ color: BN.text }}>
                                {t("Reklama qo'yish", "Разместить рекламу", "Place an ad")}
                            </div>
                        </div>
                        <div className="text-[12px] mt-1" style={{ color: BN.text2 }}>
                            {t(
                                "Bosh sahifada 5 ta slot — bo'sh slot avto-tanlanadi",
                                "На главной 5 слотов — свободный выбирается автоматически",
                                "5 slots on the home page — free slot auto-selected",
                            )}
                        </div>
                    </div>
                    <button onClick={onClose} disabled={busy || uploading} className="p-1 rounded-lg" style={{ color: BN.text3 }}>
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {done ? (
                    <div className="p-8 flex flex-col items-center gap-3">
                        <CheckCircle2 className="w-16 h-16" style={{ color: BN.ok }} />
                        <div className="text-[15px] font-semibold" style={{ color: BN.text }}>
                            {t("Reklama joylandi!", "Реклама размещена!", "Ad placed!")}
                        </div>
                    </div>
                ) : (
                    <>
                        <div className="p-5 space-y-4">
                            {/* Image upload */}
                            <div>
                                <label className="text-[12px] font-semibold" style={{ color: BN.text2 }}>
                                    {t("Rasm (banner fon)", "Изображение (фон)", "Image (banner background)")}
                                </label>
                                <input
                                    ref={fileInputRef}
                                    type="file"
                                    accept="image/*"
                                    className="hidden"
                                    onChange={e => { const f = e.target.files?.[0]; if (f) upload(f); }}
                                />
                                {imageUrl ? (
                                    <div className="mt-2 relative rounded-xl overflow-hidden aspect-[16/6]" style={{ border: `1px solid ${BN.border}` }}>
                                        <img src={imageUrl} alt="preview" className="w-full h-full object-cover" />
                                        <button onClick={() => setImageUrl("")} className="absolute top-2 right-2 w-8 h-8 rounded-full flex items-center justify-center" style={{ background: "rgba(0,0,0,0.7)", color: "#fff" }}>
                                            <X className="w-4 h-4" />
                                        </button>
                                    </div>
                                ) : (
                                    <button
                                        onClick={() => fileInputRef.current?.click()}
                                        disabled={uploading}
                                        className="mt-2 w-full aspect-[16/6] rounded-xl border-2 border-dashed flex flex-col items-center justify-center gap-2 disabled:opacity-50"
                                        style={{ borderColor: BN.border, color: BN.text3 }}
                                    >
                                        {uploading ? <Loader2 className="w-6 h-6 animate-spin" /> : <Upload className="w-6 h-6" />}
                                        <span className="text-[12px]">
                                            {uploading ? t("Yuklanmoqda...", "Загрузка...", "Uploading...") : t("Rasm yuklash (max 5MB, 1200×450 tavsiya)", "Загрузить (макс 5MB)", "Upload (max 5MB)")}
                                        </span>
                                    </button>
                                )}
                            </div>

                            {/* Title */}
                            <div>
                                <label className="text-[12px] font-semibold" style={{ color: BN.text2 }}>
                                    {t("Sarlavha", "Заголовок", "Title")} <span className="opacity-60">({title.length}/80)</span>
                                </label>
                                <input
                                    value={title}
                                    onChange={e => setTitle(e.target.value.slice(0, 80))}
                                    placeholder={t("Aksiya, chegirma yoki mahsulotingiz haqida", "О вашем товаре или акции", "About your product or promo")}
                                    className="mt-1.5 w-full h-11 rounded-xl px-3 text-[13px] outline-none"
                                    style={{ background: BN.surfaceUp, border: `1px solid ${BN.border}`, color: BN.text }}
                                />
                            </div>

                            {/* CTA URL */}
                            <div>
                                <label className="text-[12px] font-semibold" style={{ color: BN.text2 }}>
                                    {t("\"Batafsil\" havolasi", "Ссылка «Подробнее»", "\"Learn more\" URL")}
                                </label>
                                <input
                                    type="url"
                                    value={ctaUrl}
                                    onChange={e => setCtaUrl(e.target.value)}
                                    placeholder="https://bozornarxida.uz/p/mahsulotingiz"
                                    className="mt-1.5 w-full h-11 rounded-xl px-3 text-[13px] outline-none"
                                    style={{ background: BN.surfaceUp, border: `1px solid ${BN.border}`, color: BN.text }}
                                />
                            </div>

                            {/* Days */}
                            <div>
                                <label className="text-[12px] font-semibold" style={{ color: BN.text2 }}>
                                    {t("Kunlar soni", "Дней", "Days")}
                                </label>
                                <div className="mt-2 flex gap-2 flex-wrap">
                                    {[1, 3, 7, 14, 30].map(d => (
                                        <button
                                            key={d}
                                            onClick={() => setDays(d)}
                                            className="h-10 min-w-[52px] px-3 rounded-lg text-[13px] font-semibold"
                                            style={{ background: days === d ? BN.gold : BN.surfaceUp, color: days === d ? BN.onGold : BN.text2 }}
                                        >
                                            {d}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Price breakdown */}
                            {price && (
                                <div className="rounded-xl p-4" style={{ background: BN.surfaceUp, border: `1px solid ${BN.border}` }}>
                                    <div className="flex items-center justify-between mb-2">
                                        <span className="text-[13px] font-semibold" style={{ color: BN.text }}>
                                            {t("Jami narx", "Итого", "Total")}
                                        </span>
                                        <span className="text-[20px] font-black" style={{ color: BN.gold }}>
                                            {formatMoney(price.grossUzsTotal, "UZS")}
                                        </span>
                                    </div>
                                    <div className="text-[11px] space-y-1" style={{ color: BN.text3 }}>
                                        <div className="flex justify-between">
                                            <span>{t("Kunlik", "В день", "Per day")}:</span>
                                            <span>{formatMoney(price.grossUzsPerDay, "UZS")} (~${price.grossUsdPerDay.toFixed(2)})</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span>{t("USD kursi (CBU)", "Курс USD", "USD rate")}:</span>
                                            <span>{price.usdUzsRate.toLocaleString()} so'm</span>
                                        </div>
                                        <div className="flex items-center gap-1 mt-2 pt-2" style={{ borderTop: `1px dashed ${BN.border}` }}>
                                            <Info className="w-3 h-3" />
                                            <span>{t("Sof foyda platformaga", "Чистая прибыль платформе", "Net to platform")}: ${price.netUsdPerDay * days}</span>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {err && <p className="text-[12px]" style={{ color: BN.err }}>{err}</p>}
                        </div>

                        <div className="p-4 flex gap-2" style={{ background: BN.surfaceUp, borderTop: `1px solid ${BN.border}` }}>
                            <button
                                onClick={onClose}
                                disabled={busy}
                                className="flex-1 h-11 rounded-xl text-[14px] font-medium"
                                style={{ background: "transparent", color: BN.text2, border: `1px solid ${BN.border}` }}
                            >
                                {t("Bekor", "Отмена", "Cancel")}
                            </button>
                            <button
                                onClick={submit}
                                disabled={busy || !imageUrl || !title.trim() || !ctaUrl.trim() || !price}
                                className="flex-1 h-11 rounded-xl text-[14px] font-bold flex items-center justify-center gap-2 disabled:opacity-50"
                                style={{ background: BN.gold, color: BN.onGold }}
                            >
                                {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <><DollarSign className="w-4 h-4" />{t("Sotib olish", "Оплатить", "Purchase")}</>}
                            </button>
                        </div>
                    </>
                )}
            </div>
        </div>,
        document.body,
    );
}
