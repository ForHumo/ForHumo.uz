"use client";

// BN Reklama banner sotib olish modal.
// Foydalanuvchi: rasm upload + sarlavha + havola + kunlar soni.
// Jonli narx (CBU USD/UZS kursi + soliq) real vaqt ko'rsatiladi.
// Wallet balansidan yechib banner yaratadi va bo'sh slot'ga qo'yadi.

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useLocale } from "next-intl";
import { X, Upload, Loader2, CheckCircle2, Sparkles, RotateCw, ZoomIn, ZoomOut, Store as StoreIcon } from "lucide-react";
import { BN } from "@/lib/bn-theme";
import { formatMoney } from "@/lib/money";
import { BnSelect } from "./bn-select";
import { BnLink } from "./bn-nav";

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

interface MyShop { slug: string; name: string; }
interface MyShopProduct { slug: string; title: string; }

export function BnAdBuyModal({ open, onClose, onSuccess }: Props) {
    const locale = useLocale();
    const [imageUrl, setImageUrl] = useState("");
    const [uploading, setUploading] = useState(false);
    const [title, setTitle] = useState("");
    const [detailText, setDetailText] = useState("");
    const [rotation, setRotation] = useState(0);        // 0/90/180/270
    const [scale, setScale] = useState(1);              // 1.0..2.0
    const [ctaUrl, setCtaUrl] = useState("");
    const [days, setDays] = useState(1);
    const [price, setPrice] = useState<Price | null>(null);
    const [busy, setBusy] = useState(false);
    const [err, setErr] = useState<string | null>(null);
    const [done, setDone] = useState(false);
    const [myShops, setMyShops] = useState<MyShop[]>([]);
    const [pickedShop, setPickedShop] = useState<string>("");
    const [shopProducts, setShopProducts] = useState<MyShopProduct[]>([]);
    const [pickedProduct, setPickedProduct] = useState<string>("");
    const [notSeller, setNotSeller] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const t = (u: string, r: string, e: string) => locale === "ru" ? r : locale === "en" ? e : u;

    // Sotuvchining o'z do'konlari (havola avto-tanlash uchun)
    useEffect(() => {
        if (!open) return;
        (async () => {
            try {
                const r = await fetch("/api/bn/seller/my-shops", { cache: "no-store" });
                if (!r.ok) { setNotSeller(true); return; }
                const d = await r.json();
                const shops = (d?.shops ?? []) as MyShop[];
                setMyShops(shops);
                if (shops.length === 0) setNotSeller(true);
                else {
                    setNotSeller(false);
                    setPickedShop(shops[0].slug);
                }
            } catch { setNotSeller(true); }
        })();
    }, [open]);

    // Tanlangan do'konning mahsulotlari
    useEffect(() => {
        if (!pickedShop) return;
        (async () => {
            try {
                const r = await fetch(`/api/bn/seller/my-shops/${pickedShop}/products`, { cache: "no-store" });
                if (!r.ok) { setShopProducts([]); return; }
                const d = await r.json();
                setShopProducts((d?.products ?? []) as MyShopProduct[]);
            } catch { setShopProducts([]); }
        })();
        setPickedProduct("");
    }, [pickedShop]);

    // Havolani avto-hisoblash: do'kon yoki do'kon+mahsulot
    useEffect(() => {
        if (!pickedShop) return;
        const base = `https://bozornarxida.uz/d/${pickedShop}`;
        setCtaUrl(pickedProduct ? `${base}/${pickedProduct}` : base);
    }, [pickedShop, pickedProduct]);

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
            setImageUrl(""); setTitle(""); setDetailText("");
            setCtaUrl(""); setDays(1);
            setErr(null); setDone(false);
            setRotation(0); setScale(1);
            setPickedShop(""); setPickedProduct("");
            setShopProducts([]);
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
                body: JSON.stringify({
                    imageUrl,
                    title: title.trim(),
                    detailText: detailText.trim(),
                    ctaUrl: ctaUrl.trim(),
                    days,
                }),
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
            className="bn-scope bn-overlay-in fixed inset-0 z-[9999] flex items-center justify-center p-4 overflow-y-auto"
            style={{ background: "rgba(0,0,0,0.65)" }}
            onClick={() => !busy && !uploading && onClose()}
        >
            <div
                className="bn-panel-in w-full max-w-[520px] rounded-2xl overflow-hidden my-8"
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
                ) : notSeller ? (
                    <div className="p-8 flex flex-col items-center gap-4 text-center">
                        <div className="w-14 h-14 rounded-2xl grid place-items-center"
                            style={{ background: BN.goldSoft, color: BN.gold }}>
                            <StoreIcon className="w-7 h-7" />
                        </div>
                        <div>
                            <div className="text-[15px] font-black" style={{ color: BN.text }}>
                                {t("Faqat sotuvchilar reklama joylashi mumkin",
                                   "Только продавцы могут размещать рекламу",
                                   "Only sellers can place ads")}
                            </div>
                            <div className="text-[12.5px] mt-2 max-w-[380px]" style={{ color: BN.text2 }}>
                                {t("Reklama joylash uchun avval Bozor Narxida'da rasmiy do'kon oching. Reklama havolasi faqat sizning do'koningizga bo'ladi.",
                                   "Чтобы разместить рекламу, откройте официальный магазин на Bozor Narxida. Ссылка ведёт только на ваш магазин.",
                                   "To place ads, first open an official Bozor Narxida shop. The link points only to your shop.")}
                            </div>
                        </div>
                        <div className="flex gap-2 w-full">
                            <button onClick={onClose}
                                className="flex-1 h-11 rounded-xl text-[14px] font-medium"
                                style={{ background: "transparent", color: BN.text2, border: `1px solid ${BN.border}` }}>
                                {t("Yopish", "Закрыть", "Close")}
                            </button>
                            <BnLink href="/sotuvchi"
                                className="flex-1 h-11 rounded-xl text-[14px] font-bold inline-flex items-center justify-center"
                                style={{ background: BN.gold, color: BN.onGold }}>
                                {t("Do'kon ochish", "Открыть магазин", "Open shop")}
                            </BnLink>
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
                                    <div className="mt-2 space-y-2">
                                        <div className="relative rounded-xl overflow-hidden aspect-[16/6]"
                                            style={{ border: `1px solid ${BN.border}`, background: BN.surfaceUp }}>
                                            <img src={imageUrl} alt="preview"
                                                className="w-full h-full object-cover transition-transform"
                                                style={{ transform: `rotate(${rotation}deg) scale(${scale})` }}
                                            />
                                            <button onClick={() => { setImageUrl(""); setRotation(0); setScale(1); }}
                                                className="absolute top-2 right-2 w-8 h-8 rounded-full flex items-center justify-center"
                                                style={{ background: "rgba(0,0,0,0.7)", color: "#fff" }}>
                                                <X className="w-4 h-4" />
                                            </button>
                                        </div>
                                        {/* Tahrirlash asboblari — burish/kattalashtirish */}
                                        <div className="flex items-center gap-1.5 flex-wrap">
                                            {[0, 90, 180, 270].map(deg => (
                                                <button
                                                    key={deg}
                                                    onClick={() => setRotation(deg)}
                                                    className="h-8 px-2.5 rounded-lg text-[11px] font-bold flex items-center gap-1"
                                                    style={{
                                                        background: rotation === deg ? BN.gold : BN.surfaceUp,
                                                        color: rotation === deg ? BN.onGold : BN.text2,
                                                        border: `1px solid ${rotation === deg ? BN.gold : BN.border}`,
                                                    }}
                                                >
                                                    <RotateCw className="w-3 h-3" /> {deg}°
                                                </button>
                                            ))}
                                            <div className="flex-1" />
                                            <button
                                                onClick={() => setScale(s => Math.max(0.5, +(s - 0.1).toFixed(2)))}
                                                disabled={scale <= 0.5}
                                                className="w-8 h-8 rounded-lg grid place-items-center disabled:opacity-40"
                                                style={{ background: BN.surfaceUp, color: BN.text2 }}
                                                aria-label="Kichraytirish"
                                            >
                                                <ZoomOut className="w-4 h-4" />
                                            </button>
                                            <span className="text-[11px] tabular-nums w-10 text-center" style={{ color: BN.text3 }}>
                                                {Math.round(scale * 100)}%
                                            </span>
                                            <button
                                                onClick={() => setScale(s => Math.min(2, +(s + 0.1).toFixed(2)))}
                                                disabled={scale >= 2}
                                                className="w-8 h-8 rounded-lg grid place-items-center disabled:opacity-40"
                                                style={{ background: BN.surfaceUp, color: BN.text2 }}
                                                aria-label="Kattalashtirish"
                                            >
                                                <ZoomIn className="w-4 h-4" />
                                            </button>
                                        </div>
                                        <div className="text-[10px]" style={{ color: BN.text3 }}>
                                            Eslatma: burish va o&apos;lchash faqat ko&apos;rinishga ta&apos;sir qiladi. Original rasm o&apos;zgarmaydi.
                                        </div>
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

                            {/* Asosiy sarlavha (qisqa, katta matn) */}
                            <div>
                                <label className="text-[12px] font-semibold" style={{ color: BN.text2 }}>
                                    {t("Asosiy sarlavha (katta matn)", "Основной заголовок (крупный)", "Main title (large)")}
                                    <span className="opacity-60"> ({title.length}/40)</span>
                                </label>
                                <input
                                    value={title}
                                    onChange={e => setTitle(e.target.value.slice(0, 40))}
                                    placeholder={t("Aksiya! 20% chegirma",
                                                   "Акция! Скидка 20%",
                                                   "Sale! 20% off")}
                                    className="mt-1.5 w-full h-11 rounded-xl px-3 text-[13px] outline-none"
                                    style={{ background: BN.surfaceUp, border: `1px solid ${BN.border}`, color: BN.text }}
                                />
                            </div>

                            {/* Batafsil matn (kichik, izohli) */}
                            <div>
                                <label className="text-[12px] font-semibold" style={{ color: BN.text2 }}>
                                    {t("Batafsil (kichik matn)", "Подробнее (мелкий текст)", "Detail (small text)")}
                                    <span className="opacity-60"> ({detailText.length}/80)</span>
                                </label>
                                <input
                                    value={detailText}
                                    onChange={e => setDetailText(e.target.value.slice(0, 80))}
                                    placeholder={t("Faqat 3 kun · Chorsu bozori",
                                                   "Только 3 дня · Рынок Чорсу",
                                                   "3 days only · Chorsu market")}
                                    className="mt-1.5 w-full h-11 rounded-xl px-3 text-[13px] outline-none"
                                    style={{ background: BN.surfaceUp, border: `1px solid ${BN.border}`, color: BN.text }}
                                />
                            </div>

                            {/* CTA — do'kon (majburiy) va mahsulot (ixtiyoriy) */}
                            <div>
                                <label className="text-[12px] font-semibold" style={{ color: BN.text2 }}>
                                    {t("\"Batafsil\" — mening do'konim",
                                       "«Подробнее» — мой магазин",
                                       "\"Learn more\" — my shop")}
                                </label>
                                <div className="mt-1.5 grid grid-cols-1 sm:grid-cols-2 gap-2">
                                    <BnSelect
                                        value={pickedShop}
                                        onChange={setPickedShop}
                                        placeholder={t("Do'kon tanlang", "Выберите магазин", "Choose shop")}
                                        options={myShops.map(s => ({ value: s.slug, label: s.name, hint: s.slug }))}
                                        ariaLabel="Do'kon"
                                    />
                                    <BnSelect
                                        value={pickedProduct}
                                        onChange={setPickedProduct}
                                        placeholder={t("(ixtiyoriy) mahsulot", "(опц.) товар", "(optional) product")}
                                        options={[
                                            { value: "", label: t("Do'konning bosh sahifasi", "Главная страница магазина", "Shop home page") },
                                            ...shopProducts.map(p => ({ value: p.slug, label: p.title })),
                                        ]}
                                        ariaLabel="Mahsulot"
                                        disabled={!pickedShop}
                                    />
                                </div>
                                {ctaUrl && (
                                    <div className="mt-1.5 text-[11px] truncate" style={{ color: BN.text3 }}>
                                        {ctaUrl}
                                    </div>
                                )}
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

                            {/* Narx — sotuvchi uchun sodda: faqat jami + kunlik.
                                USD kurs / sof foyda ko'rsatilmaydi (sotuvchi boshini og'ritmaslik + shaffoflik). */}
                            {price && (
                                <div className="rounded-xl p-4" style={{ background: BN.surfaceUp, border: `1px solid ${BN.border}` }}>
                                    <div className="flex items-center justify-between mb-2">
                                        <span className="text-[13px] font-semibold" style={{ color: BN.text }}>
                                            {t("Jami narx", "Итого", "Total")}
                                        </span>
                                        <span className="text-[22px] font-black" style={{ color: BN.gold }}>
                                            {formatMoney(price.grossUzsTotal, "UZS")}
                                        </span>
                                    </div>
                                    <div className="text-[11.5px] flex justify-between" style={{ color: BN.text3 }}>
                                        <span>{t("Kunlik", "В день", "Per day")}:</span>
                                        <span>{formatMoney(price.grossUzsPerDay, "UZS")} × {days} {t("kun", "дн.", "days")}</span>
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
                                {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Sparkles className="w-4 h-4" />{t("Reklama joylash", "Разместить рекламу", "Place ad")}</>}
                            </button>
                        </div>
                    </>
                )}
            </div>
        </div>,
        document.body,
    );
}
