"use client";

// Nexus reklama sotib olish modal (BN AD ni Nexus'ga moslashtirilgan).
// Formula/narx BN bilan bir xil (computeAdPrice) — dizayn Nexus (dark purple/blue/pink gradient).
// 3 slot feed'da aylanadi. Bo'sh slot avto-tanlanadi.

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useLocale } from "next-intl";
import { X, Upload, Loader2, CheckCircle2, Sparkles, DollarSign, Info, ExternalLink } from "lucide-react";
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
    breakdown: { dividendPct: number; turnoverPct: number };
}

// Nexus gradient (bn-hero'dan ilhom)
const NX_GRADIENT = "linear-gradient(135deg, #2B3EE8 0%, #6D28D9 50%, #EC4899 100%)";
const NX_GLASS_BG = "rgba(255,255,255,0.06)";
const NX_GLASS_BORDER = "rgba(255,255,255,0.14)";

export function NxAdBuyModal({ open, onClose, onSuccess }: Props) {
    const locale = useLocale();
    const [imageUrl, setImageUrl] = useState("");
    const [uploading, setUploading] = useState(false);
    const [title, setTitle] = useState("");
    const [body, setBody] = useState("");
    const [ctaText, setCtaText] = useState("");
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
                const r = await fetch(`/api/nexus/ads/price?days=${days}`);
                if (!r.ok) throw new Error();
                setPrice(await r.json());
            } catch { setPrice(null); }
        })();
    }, [open, days]);

    useEffect(() => {
        if (!open) {
            setImageUrl(""); setTitle(""); setBody(""); setCtaText(""); setCtaUrl(""); setDays(1);
            setErr(null); setDone(false);
        }
    }, [open]);

    async function upload(file: File) {
        setUploading(true); setErr(null);
        try {
            const fd = new FormData();
            fd.append("file", file);
            fd.append("kind", "ad");
            // Reuse BN upload endpoint (Vercel Blob wrapper, auth-only)
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
            const r = await fetch("/api/nexus/ads", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    imageUrl,
                    title: title.trim(),
                    body: body.trim() || undefined,
                    ctaText: ctaText.trim() || undefined,
                    ctaUrl: ctaUrl.trim(),
                    days,
                }),
            });
            const d = await r.json();
            if (!r.ok) {
                const msg =
                    d?.error === "insufficient_balance" ? t("Hamyonda pul yetmadi", "Недостаточно средств", "Insufficient balance") :
                    d?.error === "all_slots_busy" ? t("Barcha 3 slot band, keyinroq urinib ko'ring", "Все 3 слота заняты", "All 3 slots busy") :
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
            style={{ background: "rgba(0,0,0,0.75)", backdropFilter: "blur(4px)" }}
            onClick={() => !busy && !uploading && onClose()}
        >
            <div
                className="w-full max-w-[560px] rounded-3xl overflow-hidden my-8 text-white"
                style={{ background: "#0a0f1e", border: `1px solid ${NX_GLASS_BORDER}` }}
                onClick={e => e.stopPropagation()}
            >
                {/* Header — Nexus gradient banner */}
                <div className="relative p-5 overflow-hidden" style={{ background: NX_GRADIENT }}>
                    <div
                        className="absolute -top-16 -right-16 w-48 h-48 rounded-full pointer-events-none"
                        style={{ background: "radial-gradient(circle, rgba(255,255,255,0.3) 0%, transparent 70%)" }}
                    />
                    <div className="relative flex items-start justify-between gap-3">
                        <div>
                            <div className="flex items-center gap-2 mb-1">
                                <span
                                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-widest"
                                    style={{ background: "rgba(255,255,255,0.22)", backdropFilter: "blur(6px)" }}
                                >
                                    <Sparkles className="w-2.5 h-2.5" /> Nexus AD
                                </span>
                            </div>
                            <h2 className="text-[20px] font-black leading-tight">
                                {t("Feed reklamasi joylash", "Реклама в ленте", "Place a feed ad")}
                            </h2>
                            <p className="text-[12px] mt-1 opacity-90">
                                {t(
                                    "3 slot — bo'sh slot avto-tanlanadi. Har 15 postdan keyin ko'rinadi.",
                                    "3 слота — свободный выбирается автоматически. Показывается каждые 15 постов.",
                                    "3 slots — free slot auto-selected. Shows every 15 posts.",
                                )}
                            </p>
                        </div>
                        <button
                            onClick={onClose}
                            disabled={busy || uploading}
                            className="w-8 h-8 rounded-full grid place-items-center transition-colors"
                            style={{ background: "rgba(255,255,255,0.15)", color: "#fff" }}
                        >
                            <X className="w-4 h-4" />
                        </button>
                    </div>
                </div>

                {done ? (
                    <div className="p-10 flex flex-col items-center gap-3">
                        <div
                            className="w-20 h-20 rounded-full grid place-items-center"
                            style={{ background: "rgba(16,185,129,0.15)" }}
                        >
                            <CheckCircle2 className="w-10 h-10" style={{ color: "#10b981" }} />
                        </div>
                        <div className="text-[16px] font-black">
                            {t("Reklama joylandi!", "Реклама размещена!", "Ad placed!")}
                        </div>
                        <p className="text-[12px] text-white/60 text-center max-w-sm">
                            {t(
                                "Reklamangiz feed'da bir necha daqiqada ko'rina boshlaydi.",
                                "Реклама появится в ленте через несколько минут.",
                                "Your ad will appear in the feed within a few minutes.",
                            )}
                        </p>
                    </div>
                ) : (
                    <>
                        <div className="p-5 space-y-4">
                            {/* Image upload */}
                            <div>
                                <label className="text-[12px] font-bold text-white/80">
                                    {t("Rasm (post uslub, 1:1 tavsiya)", "Изображение (1:1)", "Image (1:1 recommended)")}
                                </label>
                                <input
                                    ref={fileInputRef}
                                    type="file"
                                    accept="image/*"
                                    className="hidden"
                                    onChange={e => { const f = e.target.files?.[0]; if (f) upload(f); }}
                                />
                                {imageUrl ? (
                                    <div className="mt-2 relative rounded-2xl overflow-hidden aspect-square max-w-[220px] mx-auto" style={{ border: `1px solid ${NX_GLASS_BORDER}` }}>
                                        {/* eslint-disable-next-line @next/next/no-img-element */}
                                        <img src={imageUrl} alt="preview" className="w-full h-full object-cover" />
                                        <button
                                            onClick={() => setImageUrl("")}
                                            className="absolute top-2 right-2 w-8 h-8 rounded-full flex items-center justify-center"
                                            style={{ background: "rgba(0,0,0,0.7)", color: "#fff" }}
                                        >
                                            <X className="w-4 h-4" />
                                        </button>
                                    </div>
                                ) : (
                                    <button
                                        onClick={() => fileInputRef.current?.click()}
                                        disabled={uploading}
                                        className="mt-2 w-full aspect-square max-w-[220px] mx-auto rounded-2xl border-2 border-dashed flex flex-col items-center justify-center gap-2 disabled:opacity-50"
                                        style={{ borderColor: NX_GLASS_BORDER, color: "rgba(255,255,255,0.55)", background: NX_GLASS_BG }}
                                    >
                                        {uploading ? <Loader2 className="w-6 h-6 animate-spin" /> : <Upload className="w-6 h-6" />}
                                        <span className="text-[11px] px-4 text-center">
                                            {uploading
                                                ? t("Yuklanmoqda...", "Загрузка...", "Uploading...")
                                                : t("Rasm yuklash (max 5MB)", "Загрузить (макс 5MB)", "Upload (max 5MB)")}
                                        </span>
                                    </button>
                                )}
                            </div>

                            {/* Title */}
                            <div>
                                <label className="text-[12px] font-bold text-white/80">
                                    {t("Sarlavha", "Заголовок", "Title")} <span className="opacity-50">({title.length}/100)</span>
                                </label>
                                <input
                                    value={title}
                                    onChange={e => setTitle(e.target.value.slice(0, 100))}
                                    placeholder={t("Kanal, video yoki mahsulotingiz haqida", "О канале, видео или товаре", "About your channel, video, or product")}
                                    className="mt-1.5 w-full h-11 rounded-xl px-3 text-[13px] outline-none text-white"
                                    style={{ background: NX_GLASS_BG, border: `1px solid ${NX_GLASS_BORDER}` }}
                                />
                            </div>

                            {/* Body (optional) */}
                            <div>
                                <label className="text-[12px] font-bold text-white/80">
                                    {t("Qisqa tavsif", "Описание", "Description")} <span className="opacity-50">({body.length}/280)</span>
                                </label>
                                <textarea
                                    value={body}
                                    onChange={e => setBody(e.target.value.slice(0, 280))}
                                    rows={2}
                                    placeholder={t("Ixtiyoriy — o'quvchini nima kutmoqda", "Опционально — что ждёт читателя", "Optional — what awaits the reader")}
                                    className="mt-1.5 w-full rounded-xl px-3 py-2 text-[13px] outline-none text-white resize-none"
                                    style={{ background: NX_GLASS_BG, border: `1px solid ${NX_GLASS_BORDER}` }}
                                />
                            </div>

                            {/* CTA text + URL */}
                            <div className="grid grid-cols-[110px_1fr] gap-2">
                                <div>
                                    <label className="text-[12px] font-bold text-white/80">
                                        {t("Tugma", "Кнопка", "Button")}
                                    </label>
                                    <input
                                        value={ctaText}
                                        onChange={e => setCtaText(e.target.value.slice(0, 20))}
                                        placeholder={t("Batafsil", "Подробнее", "Learn more")}
                                        className="mt-1.5 w-full h-11 rounded-xl px-3 text-[12.5px] outline-none text-white"
                                        style={{ background: NX_GLASS_BG, border: `1px solid ${NX_GLASS_BORDER}` }}
                                    />
                                </div>
                                <div>
                                    <label className="text-[12px] font-bold text-white/80 flex items-center gap-1">
                                        <ExternalLink className="w-3 h-3" /> {t("Havola", "Ссылка", "URL")}
                                    </label>
                                    <input
                                        type="url"
                                        value={ctaUrl}
                                        onChange={e => setCtaUrl(e.target.value)}
                                        placeholder="https://forhumo.uz/nexus/v/..."
                                        className="mt-1.5 w-full h-11 rounded-xl px-3 text-[13px] outline-none text-white"
                                        style={{ background: NX_GLASS_BG, border: `1px solid ${NX_GLASS_BORDER}` }}
                                    />
                                </div>
                            </div>

                            {/* Days */}
                            <div>
                                <label className="text-[12px] font-bold text-white/80">
                                    {t("Kunlar", "Дней", "Days")}
                                </label>
                                <div className="mt-2 flex gap-2 flex-wrap">
                                    {[1, 3, 7, 14, 30].map(d => {
                                        const active = days === d;
                                        return (
                                            <button
                                                key={d}
                                                onClick={() => setDays(d)}
                                                className="h-10 min-w-[52px] px-3 rounded-xl text-[13px] font-black transition-all"
                                                style={{
                                                    background: active ? NX_GRADIENT : NX_GLASS_BG,
                                                    color: "#fff",
                                                    border: `1px solid ${active ? "transparent" : NX_GLASS_BORDER}`,
                                                    boxShadow: active ? "0 6px 20px rgba(109,40,217,0.4)" : "none",
                                                }}
                                            >
                                                {d}
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>

                            {/* Price breakdown */}
                            {price && (
                                <div
                                    className="rounded-2xl p-4"
                                    style={{ background: NX_GLASS_BG, border: `1px solid ${NX_GLASS_BORDER}` }}
                                >
                                    <div className="flex items-center justify-between mb-3">
                                        <span className="text-[13px] font-black text-white">
                                            {t("Jami narx", "Итого", "Total")}
                                        </span>
                                        <span
                                            className="text-[22px] font-black"
                                            style={{
                                                background: NX_GRADIENT,
                                                WebkitBackgroundClip: "text",
                                                WebkitTextFillColor: "transparent",
                                            }}
                                        >
                                            {formatMoney(price.grossUzsTotal, "UZS")}
                                        </span>
                                    </div>
                                    <div className="text-[11px] space-y-1 text-white/60">
                                        <div className="flex justify-between">
                                            <span>{t("Kunlik", "В день", "Per day")}:</span>
                                            <span>{formatMoney(price.grossUzsPerDay, "UZS")} (~${price.grossUsdPerDay.toFixed(2)})</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span>{t("USD kursi (CBU)", "Курс USD", "USD rate")}:</span>
                                            <span>{price.usdUzsRate.toLocaleString()} so&apos;m</span>
                                        </div>
                                        <div
                                            className="flex items-center gap-1 mt-2 pt-2 text-white/50"
                                            style={{ borderTop: `1px dashed ${NX_GLASS_BORDER}` }}
                                        >
                                            <Info className="w-3 h-3" />
                                            <span>{t("Sof foyda platformaga", "Чистая прибыль платформе", "Net to platform")}: ${price.netUsdPerDay * days}</span>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {err && <p className="text-[12px]" style={{ color: "#f87171" }}>{err}</p>}
                        </div>

                        <div className="p-4 flex gap-2" style={{ background: "rgba(255,255,255,0.03)", borderTop: `1px solid ${NX_GLASS_BORDER}` }}>
                            <button
                                onClick={onClose}
                                disabled={busy}
                                className="flex-1 h-11 rounded-xl text-[13px] font-black"
                                style={{ background: "transparent", color: "rgba(255,255,255,0.7)", border: `1px solid ${NX_GLASS_BORDER}` }}
                            >
                                {t("Bekor", "Отмена", "Cancel")}
                            </button>
                            <button
                                onClick={submit}
                                disabled={busy || !imageUrl || !title.trim() || !ctaUrl.trim() || !price}
                                className="flex-1 h-11 rounded-xl text-[13px] font-black flex items-center justify-center gap-2 disabled:opacity-50 text-white"
                                style={{
                                    background: NX_GRADIENT,
                                    boxShadow: "0 8px 24px rgba(109,40,217,0.4)",
                                }}
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
