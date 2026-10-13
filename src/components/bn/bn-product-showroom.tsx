"use client";

// Bozor Narxida — mahsulot VITRINASI (premium hero + scroll hikoya).
//
// Dizayn: canvas "2-variant: premium vitrina". Fon — mahsulot videosi yoki rasmi
// (sotuvchi rasmidan yasalgan xira "atmosfera" ustida), chap tomonda narx va
// harakatlar. Desktop'da 4 bob: 01 Asosiy → 02 Narx → 03 Olish → 04 Sotuvchi.
// Scroll qilganda media ramkasi 3D aylanadi, 3-bobda doira shaklida "ochiladi".
// Mobil'da media tepada, ma'lumot paneli uning ustiga suriladi.
//
// Qoidalar:
//  - prefers-reduced-motion → animatsiya yo'q, video avtomatik o'ynamaydi.
//  - Save-Data / sekin tarmoq → video avtomatik o'ynamaydi (faqat poster + Play).
//  - Transform faqat media qatlamlarida — kontent (modal ochuvchi tugmalar) hech
//    qachon transform/backdrop-filter ostida emas (fixed modal'lar buzilmasin).
//  - BN layout'da window emas, `[data-bn-scroll-root]` scroll bo'ladi (bn-scroll.ts).

import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties, type ReactNode } from "react";
import {
    motion, useMotionTemplate, useMotionValue, useMotionValueEvent, useReducedMotion, useTransform,
    type MotionValue,
} from "framer-motion";
import { useTranslations } from "next-intl";
import {
    BadgeCheck, Bell, BellRing, Check, ChevronDown, ChevronRight, Clock, Eye, Globe, Heart, Loader2,
    MapPin, Minus, Navigation, Package, Pause, Play, Plus, Share2, Shield, ShoppingCart, Star, Store,
    TrendingDown, TrendingUp, Truck, Volume2, VolumeX,
} from "lucide-react";
import { BnLink } from "./bn-nav";
import { BnShopChatButton } from "./bn-shop-chat-button";
import { BnSellerCallButton } from "./bn-seller-call-button";
import { BnProductDealChip } from "./bn-product-deal-chip";
import { BnOneClickBuy } from "./bn-one-click-buy";
import { useShopLocationText } from "./bn-cards";
import { getBnScrollRoot, onBnScroll } from "./bn-scroll";
import { bnToast } from "./bn-toast";
import { TelegramLogo, WhatsAppLogo, HumoNexusLogo } from "@/components/brand-icons";
import { BN, fmtPrice, groupThousands, priceRankOf, TIER_META } from "@/lib/bn-theme";
import type { BnProductDTO, BnShopDTO } from "@/lib/bn-data";

// ── Turlar ──────────────────────────────────────────────────────────────────

type MediaItem = { kind: "video" | "image"; src: string };

export interface BnShowroomProps {
    product: BnProductDTO;
    shop: BnShopDTO | null;
    others: BnProductDTO[];
    locale: string;
    /** Joriy birlik narxi (ulgurji bo'lsa — tanlangan pog'ona narxi) */
    unitPrice: number;
    qty: number;
    minQty: number;
    onQtyChange: (next: number) => void;
    wholesaleTiers: { minQty: number; price: number }[];
    fav: boolean;
    favBusy: boolean;
    onToggleFav: () => void;
    onShare: () => void;
    priceWatch: boolean;
    pwBusy: boolean;
    onTogglePriceWatch: () => void;
    cartBusy: boolean;
    cartDone: boolean;
    onAddToCart: () => void;
    onBuyNow: () => void;
    onStartInspect: () => void;
    matureRevealed: boolean;
    onAcceptMature: () => void;
    soldRecent: number;
    buyersRecent: number;
    viewersRecent: number;
}

// ── Kichik yordamchilar ─────────────────────────────────────────────────────

const clamp01 = (v: number) => Math.min(1, Math.max(0, v));
const seg = (p: number, a: number, b: number) => clamp01((p - a) / (b - a));
const ease = (t: number) => t * t * (3 - 2 * t);
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

/** Sarlavhani 2 qatorga bo'lamiz: sans + serif urg'u (dizayndagi kabi). */
function splitTitle(title: string): [string, string] {
    const t = title.trim();
    const sep = t.match(/\s[—–-]\s|,\s|\s\(/);
    if (sep && sep.index !== undefined && sep.index > 3) {
        const head = t.slice(0, sep.index).trim();
        let tail = t.slice(sep.index + sep[0].length).trim();
        if (sep[0].includes("(")) tail = tail.replace(/\)\s*$/, "");
        if (tail) return [head, tail];
    }
    const words = t.split(/\s+/);
    if (words.length >= 4) {
        const k = words.length >= 6 ? 3 : 2;
        return [words.slice(0, -k).join(" "), words.slice(-k).join(" ")];
    }
    return [t, ""];
}

function digitsOnly(phone?: string | null): string {
    return (phone ?? "").replace(/\D/g, "");
}

function mmss(sec: number): string {
    const s = Math.max(0, Math.round(sec));
    return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}

function useIsDesktop(): boolean {
    const [v, setV] = useState(false);
    useEffect(() => {
        const mq = window.matchMedia("(min-width: 1024px)");
        const read = () => setV(mq.matches);
        read();
        mq.addEventListener("change", read);
        return () => mq.removeEventListener("change", read);
    }, []);
    return v;
}

/** Tarmoq tejash rejimi yoki sekin tarmoq — video avtomatik yuklanmasin. */
function useSaveData(): boolean {
    const [v, setV] = useState(false);
    useEffect(() => {
        const c = (navigator as Navigator & { connection?: { saveData?: boolean; effectiveType?: string } }).connection;
        setV(!!c && (c.saveData === true || c.effectiveType === "slow-2g" || c.effectiveType === "2g"));
    }, []);
    return v;
}

/** Bo'lim bo'ylab scroll progressi (0..1) va bo'lim tepasidan o'tilgan px. React render'siz. */
function useSectionScroll(ref: React.RefObject<HTMLElement | null>) {
    const progress = useMotionValue(0);
    const offset = useMotionValue(0);
    useEffect(() => {
        const el = ref.current;
        if (!el) return;
        let raf = 0;
        const update = () => {
            raf = 0;
            const root = getBnScrollRoot();
            const rect = el.getBoundingClientRect();
            const rootTop = root ? root.getBoundingClientRect().top : 0;
            const vh = root ? root.clientHeight : window.innerHeight;
            const top = rect.top - rootTop;
            offset.set(Math.max(0, -top));
            progress.set(clamp01(-top / Math.max(1, rect.height - vh)));
        };
        const onScroll = () => { if (!raf) raf = requestAnimationFrame(update); };
        update();
        const off = onBnScroll(onScroll);
        return () => { off(); if (raf) cancelAnimationFrame(raf); };
    }, [ref, progress, offset]);
    return { progress, offset };
}

// ── Asosiy komponent ────────────────────────────────────────────────────────

export function BnProductShowroom(props: BnShowroomProps) {
    const {
        product: p, shop, others, locale, unitPrice, qty, minQty, onQtyChange, wholesaleTiers,
        fav, favBusy, onToggleFav, onShare, priceWatch, pwBusy, onTogglePriceWatch,
        cartBusy, cartDone, onAddToCart, onBuyNow, onStartInspect,
        matureRevealed, onAcceptMature, soldRecent, buyersRecent, viewersRecent,
    } = props;
    const t = useTranslations("bn.product");
    const ts = useTranslations("bn.product.showroom");
    const locText = useShopLocationText();
    const still = useReducedMotion() ?? false;
    const isDesktop = useIsDesktop();
    const saveData = useSaveData();

    // ── Media ro'yxati: avval video(lar), keyin rasmlar ──
    const media = useMemo<MediaItem[]>(() => [
        ...(p.videos ?? []).filter(Boolean).map(src => ({ kind: "video" as const, src })),
        ...p.images.filter(Boolean).map(src => ({ kind: "image" as const, src })),
    ], [p.videos, p.images]);
    const [active, setActive] = useState(0);
    const current = media[active] ?? null;
    const poster = p.images[0] ?? null;
    const ambientSrc = current?.kind === "image" ? current.src : poster;
    // "Ochilish" qatlami — keyingi rasm; bo'lmasa shu rasmning yaqin ko'rinishi
    const revealSrc = useMemo(() => {
        const imgs = media.filter(m => m.kind === "image").map(m => m.src);
        if (imgs.length === 0) return null;
        const curImg = current?.kind === "image" ? current.src : imgs[0];
        const next = imgs.find(s => s !== curImg);
        return { src: next ?? curImg, zoom: !next };
    }, [media, current]);
    const [ratio, setRatio] = useState(0.8);
    const blurred = !!p.isMature && !matureRevealed;

    // ── Video holati ──
    const videoRef = useRef<HTMLVideoElement | null>(null);
    const autoplayOk = !still && !saveData && !blurred;
    const [playing, setPlaying] = useState(false);
    const [muted, setMuted] = useState(true);
    const [duration, setDuration] = useState<number | null>(null);
    useEffect(() => {
        const v = videoRef.current;
        if (!v) return;
        v.muted = muted;
    }, [muted, current]);
    // Avto-o'ynatish faqat JS orqali: SSR HTML'da `autoPlay` bo'lsa, brauzer videoni
    // gidratsiyadan OLDIN boshlab yuborardi — reduced-motion / Save-Data foydalanuvchilarida
    // ham, va `playing` holati noto'g'ri qolardi.
    const [mounted, setMounted] = useState(false);
    useEffect(() => setMounted(true), []);
    // Gidratsiyadan OLDIN sodir bo'lgan media hodisalari (load / loadedmetadata)
    // React'ga yetib kelmaydi — holatni element'dan to'g'ridan o'qiymiz.
    const imgRef = useRef<HTMLImageElement | null>(null);
    useEffect(() => {
        setDuration(null);
        const im = imgRef.current;
        if (im && im.complete && im.naturalWidth && im.naturalHeight) setRatio(clampRatio(im.naturalWidth / im.naturalHeight));
        const v = videoRef.current;
        if (v && v.readyState >= 1) {
            if (v.videoWidth && v.videoHeight) setRatio(clampRatio(v.videoWidth / v.videoHeight));
            if (Number.isFinite(v.duration)) setDuration(v.duration);
        }
    }, [current?.src]);
    useEffect(() => {
        const v = videoRef.current;
        if (!v || !mounted) { setPlaying(false); return; }
        if (autoplayOk) {
            void v.play().then(() => setPlaying(true)).catch(() => setPlaying(false));
        } else {
            v.pause();
            setPlaying(false);
        }
    }, [autoplayOk, current, mounted]);
    const togglePlay = useCallback(() => {
        const v = videoRef.current;
        if (!v) return;
        if (v.paused) void v.play().catch(() => { /* foydalanuvchi bosishi kerak */ });
        else v.pause();
    }, []);

    // ── Scroll → harakat ──
    const trackRef = useRef<HTMLElement | null>(null);
    const { progress, offset } = useSectionScroll(trackRef);
    const [step, setStep] = useState(1);
    useMotionValueEvent(progress, "change", v => {
        const s = Math.min(4, Math.round(v * 3) + 1);
        setStep(prev => (prev === s ? prev : s));
    });

    // Desktop: 3D aylanish + ochilish. Mobil: parallaks.
    const frameRotY = useTransform(progress, v => isDesktop
        ? lerp(-16, 0, ease(seg(v, 0, 0.33))) + lerp(0, 8, ease(seg(v, 0.68, 1))) : 0);
    const frameRotX = useTransform(progress, v => isDesktop ? lerp(4, 0, ease(seg(v, 0, 0.33))) : 0);
    const frameRotZ = useTransform([progress, offset] as MotionValue<number>[], ([v, o]: number[]) => isDesktop
        ? lerp(3, -2, ease(seg(v, 0, 0.33)))
        : lerp(3, -6, ease(clamp01(o / 420))));
    const frameScale = useTransform([progress, offset] as MotionValue<number>[], ([v, o]: number[]) => isDesktop
        ? lerp(0.94, 1.04, ease(seg(v, 0, 0.33))) - 0.06 * ease(seg(v, 0.68, 1))
        : lerp(1, 0.86, ease(clamp01(o / 420))));
    const frameX = useTransform(progress, v => isDesktop
        ? lerp(0, -20, ease(seg(v, 0, 0.33))) + lerp(0, -30, ease(seg(v, 0.68, 1))) : 0);
    const frameY = useTransform([progress, offset] as MotionValue<number>[], ([v, o]: number[]) => isDesktop
        ? lerp(0, 20, ease(seg(v, 0, 0.33)))
        : lerp(0, -70, ease(clamp01(o / 420))));
    const revealR = useTransform(progress, v => isDesktop ? lerp(0, 112, ease(seg(v, 0.36, 0.62))) : 0);
    const revealClip = useMotionTemplate`circle(${revealR}% at 72% 50%)`;
    const revealRotY = useTransform(progress, v => lerp(14, 0, ease(seg(v, 0.36, 0.62))) + lerp(0, 6, ease(seg(v, 0.68, 1))));
    const revealScale = useTransform(progress, v => lerp(0.9, 1, ease(seg(v, 0.36, 0.62))) + 0.04 * ease(seg(v, 0.68, 1)));
    const revealX = useTransform(progress, v => lerp(60, 0, ease(seg(v, 0.36, 0.62))) + lerp(0, -30, ease(seg(v, 0.68, 1))));
    const ambientScale = useTransform(progress, v => 1.25 + 0.12 * v);
    const dimMobile = useTransform(offset, o => isDesktop ? 0 : 0.55 * ease(clamp01(o / 420)));

    const frameStyle: CSSProperties | Record<string, unknown> = still
        ? { transform: isDesktop ? "perspective(1400px) rotateY(-8deg)" : undefined }
        : { rotateY: frameRotY, rotateX: frameRotX, rotate: frameRotZ, scale: frameScale, x: frameX, y: frameY, transformPerspective: 1400 };

    // ── Narx tahlili ──
    const rank = priceRankOf(unitPrice, p.marketAvgPrice);
    const pct = p.marketAvgPrice ? Math.round(((unitPrice - p.marketAvgPrice) / p.marketAvgPrice) * 100) : 0;
    const rankLabel = rank === "cheap" ? ts("cheaperBy", { pct: Math.abs(pct) })
        : rank === "expensive" ? ts("pricierBy", { pct: Math.abs(pct) })
        : rank === "fair" ? t("atMarketPrice") : null;
    const othersSorted = useMemo(() => others.slice().sort((a, b) => a.price - b.price), [others]);
    const meter = useMemo(() => buildMeter(unitPrice, p.marketAvgPrice, othersSorted.map(o => o.price)), [unitPrice, p.marketAvgPrice, othersSorted]);

    // ── Aloqa havolalari ──
    const phone = shop?.phoneVerified ? digitsOnly(shop.phone) : "";
    const canMessenger = phone.length >= 9;
    const productUrl = `https://bozornarxida.uz/d/${p.shopSlug || shop?.slug || ""}/${p.slug}`;
    const prefill = t("negotiablePrefill", { title: p.title, price: groupThousands(unitPrice) });
    const waHref = canMessenger ? `https://wa.me/${phone}?text=${encodeURIComponent(`${prefill}\n${productUrl}`)}` : null;
    const waPlainHref = canMessenger ? `https://wa.me/${phone}?text=${encodeURIComponent(`${p.title} — ${productUrl}`)}` : null;
    // t.me/+<raqam> — sotuvchi Telegram'iga to'g'ridan (raqam orqali topish yoqilgan bo'lsa)
    const tgHref = canMessenger ? `https://t.me/+${phone}` : null;
    const lat = shop?.lat ?? p.shopLat ?? null;
    const lng = shop?.lng ?? p.shopLng ?? null;
    const directionsHref = lat != null && lng != null
        ? `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}` : null;
    const verified = (shop?.verifiedTier && shop.verifiedTier !== "NONE") || (p.shopVerifiedTier && p.shopVerifiedTier !== "NONE") || p.shopVerified;
    const placeText = shop ? locText(shop) : (p.marketName ?? p.city);
    const tier = shop ? TIER_META[shop.tier] : null;

    const [titleHead, titleTail] = splitTitle(p.title);
    const outOfStock = p.stock < 1;

    // Mobil pastki panel — foydalanuvchi hero tugmalaridan PASTGA o'tganda chiqadi,
    // sayt footer'i ko'ringanda yashirinadi. IntersectionObserver emas, scroll'da
    // o'lchaymiz: tez "fling"da element bitta kadrda sakrab o'tilsa IO xabar bermaydi.
    const heroActionsRef = useRef<HTMLDivElement | null>(null);
    const [barHidden, setBarHidden] = useState(true);
    useEffect(() => {
        let raf = 0;
        const check = () => {
            raf = 0;
            const el = heroActionsRef.current;
            if (!el) return;
            const vh = window.innerHeight;
            const pastHero = el.getBoundingClientRect().bottom < 0;
            const footer = document.querySelector("[data-bn-scroll-root] footer");
            const footerIn = !!footer && footer.getBoundingClientRect().top < vh;
            const hide = !pastHero || footerIn;
            setBarHidden(prev => (prev === hide ? prev : hide));
        };
        const onScroll = () => { if (!raf) raf = requestAnimationFrame(check); };
        check();
        const off = onBnScroll(onScroll);
        return () => { off(); if (raf) cancelAnimationFrame(raf); };
    }, []);

    const chapterCls = "py-7 lg:py-24 lg:min-h-[100svh] lg:flex lg:items-center";
    // Ustun media ramkasiga hech qachon yetmasin (ramka chap cheti ≈ 53vw − siljish)
    const colCls = "w-full lg:max-w-[min(600px,calc(46vw-60px))] lg:ml-[max(24px,6.6vw)]";

    return (
        <>
            <section
                ref={trackRef}
                className="bn-stage relative"
                style={{ background: "#0B0F0E" }}
                aria-label={p.title}
            >
                {/* ═══ SAHNA — yopishqoq media ═══ */}
                <div className="sticky top-0 h-[100vh] h-[100svh] overflow-hidden">
                    {/* Atmosfera: sotuvchi rasmining o'zidan */}
                    {ambientSrc ? (
                        <motion.div className="absolute inset-0" style={still || !isDesktop ? { scale: 1.25 } : { scale: ambientScale }}>
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                                src={ambientSrc}
                                alt=""
                                className="w-full h-full object-cover"
                                style={{ filter: isDesktop ? "blur(60px) saturate(1.5) brightness(0.42)" : "blur(36px) saturate(1.4) brightness(0.45)" }}
                            />
                        </motion.div>
                    ) : null}
                    <div
                        className="absolute inset-0"
                        style={{ background: "radial-gradient(45% 55% at 72% 46%, rgba(80,102,137,0.35) 0%, rgba(80,102,137,0) 70%), radial-gradient(40% 40% at 14% 86%, rgba(36,67,63,0.55) 0%, rgba(36,67,63,0) 70%)" }}
                    />
                    {/* Ingichka vertikal chiziqlar (desktop) */}
                    <div className="hidden lg:block absolute inset-y-0 left-1/2 w-px" style={{ background: "rgba(255,255,255,0.07)" }} />
                    <div className="hidden lg:block absolute inset-y-0 left-8 w-px" style={{ background: "rgba(255,255,255,0.07)" }} />
                    <div className="hidden lg:block absolute inset-y-0 right-8 w-px" style={{ background: "rgba(255,255,255,0.07)" }} />

                    {/* Asosiy media ramkasi */}
                    <div className="absolute left-1/2 top-[84px] -translate-x-1/2 lg:left-auto lg:right-[7vw] lg:top-1/2 lg:translate-x-0 lg:-translate-y-1/2">
                        <motion.div
                            className="bn-stage-frame relative rounded-[26px] lg:rounded-[30px] overflow-hidden will-change-transform"
                            style={{
                                ...(frameStyle as object),
                                ["--r" as string]: ratio,
                                aspectRatio: String(ratio),
                                background: "#151B1A",
                                boxShadow: "0 46px 90px rgba(0,0,0,0.55), 0 0 0 1px rgba(255,255,255,0.12)",
                            }}
                        >
                            {current?.kind === "video" && !blurred ? (
                                <video
                                    key={current.src}
                                    ref={videoRef}
                                    src={current.src}
                                    poster={poster ?? undefined}
                                    muted
                                    loop
                                    playsInline
                                    preload={mounted && autoplayOk ? "auto" : "metadata"}
                                    className="w-full h-full object-cover"
                                    onPlay={() => setPlaying(true)}
                                    onPause={() => setPlaying(false)}
                                    onLoadedMetadata={e => {
                                        const v = e.currentTarget;
                                        if (v.videoWidth && v.videoHeight) setRatio(clampRatio(v.videoWidth / v.videoHeight));
                                        if (Number.isFinite(v.duration)) setDuration(v.duration);
                                    }}
                                />
                            ) : (current?.kind === "image" || poster) ? (
                                // eslint-disable-next-line @next/next/no-img-element
                                <img
                                    ref={imgRef}
                                    key={current?.kind === "image" ? current.src : poster ?? ""}
                                    src={current?.kind === "image" ? current.src : (poster ?? "")}
                                    alt={p.title}
                                    className="w-full h-full object-cover"
                                    style={blurred ? { filter: "blur(28px)" } : undefined}
                                    onLoad={e => {
                                        const im = e.currentTarget;
                                        if (im.naturalWidth && im.naturalHeight) setRatio(clampRatio(im.naturalWidth / im.naturalHeight));
                                    }}
                                />
                            ) : (
                                <div className="w-full h-full grid place-items-center" style={{ color: BN.text3 }}>
                                    <Package className="w-14 h-14" />
                                </div>
                            )}
                        </motion.div>
                    </div>

                    {/* Ochilish qatlami (desktop, 3-bob) — iliq fon + keyingi rasm */}
                    {isDesktop && !still && revealSrc && !blurred && (
                        <motion.div
                            className="absolute inset-0"
                            style={{
                                clipPath: revealClip,
                                WebkitClipPath: revealClip,
                                background: "radial-gradient(45% 55% at 70% 50%, #8C6A2A 0%, rgba(140,106,42,0) 70%), radial-gradient(30% 35% at 22% 78%, #3A2C14 0%, rgba(58,44,20,0) 70%), #15110A",
                            }}
                        >
                            <div className="absolute right-[7vw] top-1/2 -translate-y-1/2">
                                <motion.div
                                    className="bn-stage-frame relative rounded-[30px] overflow-hidden"
                                    style={{
                                        rotateY: revealRotY, scale: revealScale, x: revealX, transformPerspective: 1400,
                                        ["--r" as string]: ratio,
                                        aspectRatio: String(ratio),
                                        boxShadow: "0 46px 90px rgba(0,0,0,0.6), 0 0 0 1px rgba(255,255,255,0.14)",
                                    }}
                                >
                                    {/* eslint-disable-next-line @next/next/no-img-element */}
                                    <img
                                        src={revealSrc.src}
                                        alt=""
                                        className="w-full h-full object-cover"
                                        style={revealSrc.zoom ? { transform: "scale(1.4)" } : undefined}
                                    />
                                </motion.div>
                            </div>
                        </motion.div>
                    )}

                    {/* O'qish uchun soya: desktop — chapdan, mobil — tepadan */}
                    <div
                        className="hidden lg:block absolute inset-0"
                        style={{ background: "linear-gradient(90deg, rgba(8,12,11,0.88) 0%, rgba(8,12,11,0.7) 44%, rgba(8,12,11,0) 68%)" }}
                    />
                    <div
                        className="lg:hidden absolute inset-x-0 top-0 h-40"
                        style={{ background: "linear-gradient(180deg, rgba(8,12,11,0.6) 0%, rgba(8,12,11,0) 100%)" }}
                    />
                    <motion.div className="lg:hidden absolute inset-0" style={{ background: "#0B0F0E", opacity: still ? 0 : dimMobile }} />
                </div>

                {/* ═══ KONTENT — sahna ustidan aylanadi ═══ */}
                <div className="relative -mt-[100vh] -mt-[100svh]">
                    {/* Mobil: media ustidagi bo'sh joy + media boshqaruvi */}
                    <div className="lg:hidden relative h-[58vh] h-[58svh]">
                        <MediaControls
                            className="absolute inset-x-4 bottom-12"
                            media={media}
                            active={active}
                            onPick={setActive}
                            current={current}
                            playing={playing}
                            muted={muted}
                            duration={duration}
                            onTogglePlay={togglePlay}
                            onToggleMute={() => setMuted(m => !m)}
                            blurred={blurred}
                            compact
                        />
                    </div>

                    <div className="relative rounded-t-[28px] lg:rounded-none px-4 pt-3 pb-6 lg:p-0 bg-[rgba(14,18,17,0.96)] lg:bg-transparent border-t border-white/[0.12] lg:border-t-0">
                        <div className="lg:hidden mx-auto mb-4 w-10 h-1 rounded-full" style={{ background: "rgba(255,255,255,0.28)" }} />

                        {/* ── 01 · Asosiy ── */}
                        <section className={`${chapterCls} relative lg:pt-[120px]`}>
                            <div className={colCls}>
                                <div className="flex items-center gap-2.5 text-[13.5px]">
                                    {(p.shopSlug || shop?.slug) && (
                                        <BnLink
                                            href={`/d/${p.shopSlug || shop?.slug}`}
                                            className="inline-flex items-center gap-1.5 h-9 px-3 rounded-full font-bold transition-colors hover:bg-white/15"
                                            style={{ background: "rgba(255,255,255,0.10)", border: "1px solid rgba(255,255,255,0.18)", color: BN.text }}
                                        >
                                            <span className="truncate max-w-[220px]">{shop?.name ?? p.shopName}</span>
                                            {verified && (
                                                <BadgeCheck className="w-4 h-4 flex-shrink-0" style={{ color: BN.info }} aria-label={ts("verified")} />
                                            )}
                                        </BnLink>
                                    )}
                                    <span className="flex-1" />
                                    <RoundBtn label={fav ? t("favSaved") : t("fav")} onClick={onToggleFav} disabled={favBusy} pressed={fav}>
                                        <Heart className="w-[18px] h-[18px]" style={{ fill: fav ? BN.err : "none", color: fav ? BN.err : undefined }} />
                                    </RoundBtn>
                                    <RoundBtn label={t("share")} onClick={onShare}>
                                        <Share2 className="w-[18px] h-[18px]" />
                                    </RoundBtn>
                                </div>
                                {placeText && (
                                    <p className="mt-2 flex items-center gap-1.5 text-[13.5px] min-w-0" style={{ color: BN.text3 }}>
                                        <MapPin className="w-3.5 h-3.5 flex-shrink-0" />
                                        <span className="truncate">{placeText}</span>
                                    </p>
                                )}

                                <h1 className="mt-4 lg:mt-5 leading-[1.05] tracking-[-0.03em] text-[34px] sm:text-[42px] lg:text-[clamp(40px,4vw,58px)]">
                                    <span className="bn-display-sans block font-light">{titleHead}</span>
                                    {titleTail && <span className="block font-normal">{titleTail}</span>}
                                </h1>

                                <div className="mt-5">
                                    <BnProductDealChip productSlug={p.slug} />
                                </div>

                                {p.isWholesale && (
                                    <div className="inline-flex items-center gap-2 h-8 px-3 mb-3 rounded-full text-[12.5px] font-bold"
                                        style={{ background: BN.goldSoft, color: BN.gold, border: `1px solid ${BN.goldEdge}` }}>
                                        <Package className="w-3.5 h-3.5" />
                                        {t("wholesaleBadge")} · {t("wholesaleMin", { qty: minQty })}
                                    </div>
                                )}

                                <div className="flex items-center gap-3 flex-wrap">
                                    <span className="text-[32px] lg:text-[38px] font-semibold tracking-[-0.02em] tabular-nums leading-none">
                                        {groupThousands(unitPrice)} <span className="text-[16px] lg:text-[18px] font-medium">{t("currencySom")}</span>
                                    </span>
                                    {p.isWholesale ? (
                                        <span className="text-[14px]" style={{ color: BN.text3 }}>{t("perUnit")}</span>
                                    ) : p.oldPrice && p.oldPrice > p.price && p.oldPrice <= p.price * 20 ? (
                                        <span className="text-[17px] line-through tabular-nums" style={{ color: BN.text3 }}>
                                            {groupThousands(p.oldPrice)}
                                        </span>
                                    ) : null}
                                    {rankLabel && (
                                        <PriceTag rank={rank!} label={rankLabel}
                                            avg={rank === "fair" && p.marketAvgPrice ? ts("avgShort", { price: groupThousands(p.marketAvgPrice) }) : null} />
                                    )}
                                </div>

                                {p.isWholesale && wholesaleTiers.length > 0 && (
                                    <WholesaleTiers tiers={wholesaleTiers} qty={qty} />
                                )}

                                {p.description && (
                                    <p className="mt-5 max-w-[520px] text-[15.5px] lg:text-[17px] leading-relaxed line-clamp-3" style={{ color: BN.text2 }}>
                                        {p.description}
                                    </p>
                                )}

                                {blurred && (
                                    <div className="mt-5 p-4 rounded-2xl max-w-[520px]" style={{ background: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.16)" }}>
                                        <span className="inline-block px-3 py-1 rounded-full text-[12px] font-black mb-2" style={{ background: "#DC2626", color: "#fff" }}>
                                            {t("matureBadge")}
                                        </span>
                                        <p className="text-[15px] font-bold">{t("matureTitle")}</p>
                                        <p className="text-[13.5px] mt-1 mb-3" style={{ color: BN.text2 }}>{t("matureAsk")}</p>
                                        <button
                                            type="button"
                                            onClick={onAcceptMature}
                                            className="h-11 px-5 rounded-full text-[14px] font-bold"
                                            style={{ background: BN.gold, color: BN.onGold }}
                                        >
                                            {t("matureConfirm")}
                                        </button>
                                    </div>
                                )}

                                {/* Miqdor (zaxira > 1 yoki ulgurji) */}
                                {!outOfStock && (p.stock > 1 || p.isWholesale) && (
                                    <div className="mt-6 flex items-center gap-3 text-[14px]" style={{ color: BN.text2 }}>
                                        <span>{t("stockLabel")} <b style={{ color: BN.text }}>{p.stock} {t("stockUnit")}</b></span>
                                        <div className="flex items-center rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.16)" }}>
                                            <QtyBtn label={ts("qtyLess")} onClick={() => onQtyChange(Math.max(minQty, qty - 1))} disabled={qty <= minQty}><Minus className="w-4 h-4" /></QtyBtn>
                                            <span className="w-10 text-center font-bold tabular-nums" style={{ color: BN.text }} aria-live="polite">{qty}</span>
                                            <QtyBtn label={ts("qtyMore")} onClick={() => onQtyChange(Math.min(p.stock, qty + 1))} disabled={qty >= p.stock}><Plus className="w-4 h-4" /></QtyBtn>
                                        </div>
                                        {p.isWholesale && (
                                            <span className="tabular-nums">= <b style={{ color: BN.text }}>{fmtPrice(unitPrice * qty)}</b></span>
                                        )}
                                    </div>
                                )}

                                {/* Asosiy harakatlar */}
                                <div ref={heroActionsRef} className="mt-6 lg:mt-7 grid grid-cols-2 gap-2.5 lg:flex lg:flex-wrap">
                                    <button
                                        type="button"
                                        onClick={onBuyNow}
                                        disabled={cartBusy || outOfStock}
                                        className="h-[54px] px-7 inline-flex items-center justify-center gap-2 rounded-full text-[15px] font-extrabold transition-transform active:scale-[0.98] disabled:opacity-60"
                                        style={{ background: BN.gold, color: BN.onGold }}
                                    >
                                        {cartBusy ? <Loader2 className="w-5 h-5 animate-spin" /> : null}
                                        {outOfStock ? ts("outOfStock") : ts("buyNow")}
                                    </button>
                                    {p.allowInspect && !outOfStock && (
                                        <GlassBtn onClick={onStartInspect} disabled={cartBusy}>
                                            <Clock className="w-[18px] h-[18px] flex-shrink-0" />
                                            <span className="lg:hidden">{ts("reserveShort")}</span>
                                            <span className="hidden lg:inline">{ts("reserve")}</span>
                                        </GlassBtn>
                                    )}
                                    {!outOfStock && (
                                        <GlassBtn onClick={onAddToCart} disabled={cartBusy} label={cartDone ? t("addedToCart") : t("addToCart")} iconOnlyLg>
                                            {cartDone ? <Check className="w-[18px] h-[18px] flex-shrink-0" style={{ color: BN.ok }} /> : <ShoppingCart className="w-[18px] h-[18px] flex-shrink-0" />}
                                            <span className="lg:sr-only">{cartDone ? t("addedToCart") : t("addToCart")}</span>
                                        </GlassBtn>
                                    )}
                                    {p.allowPickup && directionsHref && (
                                        <GlassLink href={directionsHref} external>
                                            <MapPin className="w-[18px] h-[18px]" />
                                            {ts("pickup")}
                                        </GlassLink>
                                    )}
                                </div>
                                {cartDone && (
                                    <BnLink href="/savat" className="inline-block mt-3 text-[13.5px] font-bold" style={{ color: BN.gold }}>
                                        {t("goToCart")}
                                    </BnLink>
                                )}

                                {/* Aloqa */}
                                <div className="mt-3 flex flex-wrap gap-2">
                                    {tgHref && (
                                        <ContactPill href={tgHref} external label={ts("telegramAria")}>
                                            <TelegramLogo size={20} />Telegram
                                        </ContactPill>
                                    )}
                                    {waPlainHref && (
                                        <ContactPill href={waPlainHref} external label={ts("whatsappAria")}>
                                            <WhatsAppLogo size={20} />WhatsApp
                                        </ContactPill>
                                    )}
                                    {p.isNegotiable && (
                                        <span className="[&>button]:!h-11 [&>button]:!px-4 [&>button]:!rounded-full [&>button]:!text-[14px] [&>button]:!font-semibold [&>button]:!gap-2 [&>button]:!bg-white/[0.08] [&>button]:!border [&>button]:!border-white/[0.16] [&>button]:!text-[color:var(--bn-text)]">
                                            <BnShopChatButton
                                                shopSlug={p.shopSlug}
                                                shopName={p.shopName}
                                                triggerLabel={ts("negotiate")}
                                                product={{ id: p.id, title: p.title, price: unitPrice, imageUrl: p.images?.[0] ?? null }}
                                            />
                                        </span>
                                    )}
                                </div>

                                {/* Ishonch qatori */}
                                <div className="mt-6 flex flex-wrap gap-x-5 gap-y-2 text-[13px] lg:hidden" style={{ color: BN.text3 }}>
                                    {p.allowDelivery && (
                                        <span className="inline-flex items-center gap-1.5"><Truck className="w-4 h-4" />{t("wayDelivery")}</span>
                                    )}
                                    {p.allowInspect && (
                                        <span className="inline-flex items-center gap-1.5"><Eye className="w-4 h-4" />{t("wayInspect")}</span>
                                    )}
                                    <span className="inline-flex items-center gap-1.5"><Shield className="w-4 h-4" />{t("wayEscrowText")}</span>
                                </div>
                            </div>

                            {/* Desktop: media boshqaruvi, scroll ishorasi, bob hisoblagichi */}
                            <MediaControls
                                className="hidden lg:flex flex-col absolute top-[50vh] top-[50svh] -translate-y-1/2 right-[max(8px,calc(3.5vw-28px))]"
                                media={media}
                                active={active}
                                onPick={setActive}
                                current={current}
                                playing={playing}
                                muted={muted}
                                duration={duration}
                                onTogglePlay={togglePlay}
                                onToggleMute={() => setMuted(m => !m)}
                                blurred={blurred}
                            />
                        </section>

                        {/* ── 02 · Narx ── */}
                        {/* Narx kuzatuvi va ijtimoiy isbot har doim kerak — bob doim chiqadi,
                            o'lchagich faqat ma'lumot bo'lsa */}
                        <section className={chapterCls} aria-labelledby="bn-sr-price">
                            <div className={colCls}>
                                <ChapterHead n="02" kicker={ts("chapterPrice")} id="bn-sr-price" a={ts("priceQ1")} b={ts("priceQ2")} />
                                {meter ? (
                                    <>
                                        <p className="mt-3 text-[15px]" style={{ color: BN.text2 }}>
                                            {othersSorted.length > 0
                                                ? ts("meterBasis", { n: othersSorted.length + 1 })
                                                : ts("meterBasisAvg")}
                                        </p>
                                        <MarketMeter meter={meter} price={unitPrice} />
                                    </>
                                ) : (
                                    <p className="mt-3 max-w-[520px] text-[15px] leading-relaxed" style={{ color: BN.text2 }}>
                                        {ts("meterEmpty")}
                                    </p>
                                )}
                                <SocialProof buyers={buyersRecent} sold={soldRecent} viewers={viewersRecent} />
                                <button
                                    type="button"
                                    onClick={onTogglePriceWatch}
                                    disabled={pwBusy}
                                    aria-pressed={priceWatch}
                                    className="mt-5 h-12 px-5 inline-flex items-center gap-2 rounded-full text-[14px] font-bold transition-colors disabled:opacity-60"
                                    style={{
                                        background: priceWatch ? BN.goldSoft : "rgba(255,255,255,0.10)",
                                        border: `1px solid ${priceWatch ? BN.goldEdge : "rgba(255,255,255,0.22)"}`,
                                        color: priceWatch ? BN.gold : BN.text,
                                    }}
                                >
                                    {priceWatch ? <BellRing className="w-[18px] h-[18px]" /> : <Bell className="w-[18px] h-[18px]" />}
                                    {priceWatch ? t("watchOn") : t("watchOff")}
                                </button>
                            </div>
                        </section>

                        {/* ── 03 · Olish ── */}
                        <section className={chapterCls} aria-labelledby="bn-sr-get">
                            <div className={colCls}>
                                <ChapterHead n="03" kicker={ts("chapterGet")} id="bn-sr-get" a={ts("getQ1")} b={ts("getQ2")} />
                                <ul className="mt-6 flex flex-col gap-2">
                                    {p.allowPickup && (
                                        <WayRow icon={<Store className="w-5 h-5" />} title={t("wayPickup")} text={ts("pickupText")}
                                            side={<span style={{ color: BN.ok }}>{t("wayPickupFree")}</span>} />
                                    )}
                                    {p.allowDelivery && (
                                        <WayRow icon={<Truck className="w-5 h-5" />} title={t("wayDelivery")} text={t("wayDeliveryText")} />
                                    )}
                                    {p.allowInspect && (
                                        <WayRow icon={<Eye className="w-5 h-5" />} title={t("wayInspect")} text={t("wayInspectText")} highlight
                                            side={!outOfStock ? (
                                                <button type="button" onClick={onStartInspect} disabled={cartBusy}
                                                    className="h-10 px-4 rounded-full text-[13.5px] font-bold disabled:opacity-60"
                                                    style={{ background: BN.gold, color: BN.onGold }}>
                                                    {ts("reserveShort")}
                                                </button>
                                            ) : null} />
                                    )}
                                    <WayRow icon={<Shield className="w-5 h-5" />} title={t("wayEscrow")} text={t("wayEscrowText")} />
                                </ul>

                                {!outOfStock && (
                                    <BnOneClickBuy productId={p.id} qty={qty} disabled={cartBusy} className="mt-4 max-w-[420px] [&>button]:!rounded-full [&>button]:!h-[52px]" />
                                )}

                                {p.isNegotiable && (
                                    <div className="mt-7">
                                        <p className="text-[13.5px] font-bold" style={{ color: BN.text3 }}>{ts("negotiateTitle")}</p>
                                        <p className="mt-2 px-4 py-3.5 rounded-[18px] rounded-bl-md text-[14.5px] leading-relaxed"
                                            style={{ background: "rgba(255,255,255,0.09)", border: "1px solid rgba(255,255,255,0.16)" }}>
                                            {prefill}
                                        </p>
                                        <div className="mt-3 flex flex-wrap gap-2">
                                            {/* Ilova ichidagi taklif — sotuvchiga albatta yetadi */}
                                            <span className="[&>button]:!h-[50px] [&>button]:!px-5 [&>button]:!rounded-full [&>button]:!text-[15px] [&>button]:!font-bold [&>button]:!gap-2">
                                                <BnShopChatButton
                                                    shopSlug={p.shopSlug}
                                                    shopName={p.shopName}
                                                    triggerLabel={ts("offerInApp")}
                                                    product={{ id: p.id, title: p.title, price: unitPrice, imageUrl: p.images?.[0] ?? null }}
                                                />
                                            </span>
                                            {waHref && (
                                                <ContactPill href={waHref} external big label={ts("sendWhatsapp")}>
                                                    <WhatsAppLogo size={22} />{ts("sendWhatsapp")}
                                                </ContactPill>
                                            )}
                                            {/* Telegram raqam havolasi matn qabul qilmaydi — xabarni nusxalab, sotuvchi chatini ochamiz */}
                                            {tgHref && (
                                                <ContactPill href={tgHref} external big label={ts("sendTelegram")}
                                                    onClick={() => {
                                                        void navigator.clipboard?.writeText(prefill).then(
                                                            () => bnToast(ts("messageCopied"), "success"),
                                                            () => { /* clipboard ruxsat berilmadi */ },
                                                        );
                                                    }}>
                                                    <TelegramLogo size={22} />{ts("sendTelegram")}
                                                </ContactPill>
                                            )}
                                        </div>
                                    </div>
                                )}
                            </div>
                        </section>

                        {/* ── 04 · Sotuvchi ── */}
                        <section className={chapterCls} aria-labelledby="bn-sr-seller">
                            <div className={colCls}>
                                <ChapterHead n="04" kicker={ts("chapterSeller")} id="bn-sr-seller" a={ts("sellerQ1")} b={ts("sellerQ2")} />
                                {shop && (
                                    <div className="mt-6 p-4 lg:p-5 rounded-[22px]" style={{ background: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.16)" }}>
                                        <BnLink href={`/d/${shop.slug}`} className="group flex items-center gap-3.5">
                                            <span className="w-14 h-14 rounded-2xl overflow-hidden flex-shrink-0 grid place-items-center" style={{ background: "rgba(255,255,255,0.12)" }}>
                                                {shop.logoUrl ? (
                                                    // eslint-disable-next-line @next/next/no-img-element
                                                    <img src={shop.logoUrl} alt="" className="w-full h-full object-cover" />
                                                ) : (
                                                    <Store className="w-6 h-6" style={{ color: BN.text3 }} />
                                                )}
                                            </span>
                                            <span className="flex-1 min-w-0">
                                                <span className="flex items-center gap-1.5 text-[17px] font-bold">
                                                    <span className="truncate">{shop.name}</span>
                                                    {verified && <BadgeCheck className="w-[18px] h-[18px] flex-shrink-0" style={{ color: BN.info }} aria-label={ts("verified")} />}
                                                    {tier && shop.tier !== "NEW" && (
                                                        <span className="px-2 py-0.5 rounded-full text-[11.5px] font-bold flex-shrink-0" style={{ background: "rgba(255,255,255,0.12)", color: BN.text2 }}>
                                                            {tier.label}
                                                        </span>
                                                    )}
                                                </span>
                                                <span className="flex items-center gap-1.5 mt-1 text-[13.5px]" style={{ color: BN.text3 }}>
                                                    {shop.locationType === "IN_MARKET" ? <Store className="w-3.5 h-3.5 flex-shrink-0" />
                                                        : shop.locationType === "STANDALONE" ? <MapPin className="w-3.5 h-3.5 flex-shrink-0" />
                                                        : <Globe className="w-3.5 h-3.5 flex-shrink-0" />}
                                                    <span className="truncate">{locText(shop)}</span>
                                                </span>
                                                {shop.ratingCount > 0 && (
                                                    <span className="flex items-center gap-1 mt-1 text-[13px]" style={{ color: BN.text2 }}>
                                                        <Star className="w-3.5 h-3.5 fill-current" style={{ color: BN.gold }} />
                                                        {shop.rating.toFixed(1)} · {t("sellerRatings", { n: shop.ratingCount, p: shop.productCount })}
                                                    </span>
                                                )}
                                            </span>
                                            <ChevronRight className="w-5 h-5 flex-shrink-0" style={{ color: BN.text3 }} />
                                        </BnLink>
                                        <div className="grid grid-cols-2 gap-2 mt-4 [&_button]:!rounded-full">
                                            <BnSellerCallButton
                                                sellerId={shop.sellerId}
                                                shopName={shop.name}
                                                shopLogo={shop.logoUrl}
                                                ownerUsername={shop.ownerUsername}
                                                workHours={shop.workHours}
                                                product={{ id: p.id, title: p.title, image: p.images?.[0] ?? null }}
                                            />
                                            {shop.ownerUsername ? (
                                                <a
                                                    href={`https://forhumo.uz/${locale}/nexus?dm=${shop.ownerUsername}`}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="flex items-center justify-center gap-2 h-11 rounded-full text-[13.5px] font-bold"
                                                    style={{ background: "rgba(255,255,255,0.12)", color: BN.text }}
                                                >
                                                    <HumoNexusLogo size={18} />
                                                    {t("sellerMessage")}
                                                </a>
                                            ) : directionsHref ? (
                                                <GlassLink href={directionsHref} external small>
                                                    <Navigation className="w-4 h-4" />{ts("directions")}
                                                </GlassLink>
                                            ) : null}
                                        </div>
                                        {shop.ownerUsername && directionsHref && (
                                            <a href={directionsHref} target="_blank" rel="noopener noreferrer"
                                                className="mt-2 flex items-center justify-center gap-2 h-11 rounded-full text-[13.5px] font-bold"
                                                style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.14)", color: BN.text }}>
                                                <Navigation className="w-4 h-4" />{ts("directions")}
                                            </a>
                                        )}
                                    </div>
                                )}

                                {othersSorted.length > 0 && (
                                    <div className="mt-4 rounded-[20px] overflow-hidden" style={{ border: "1px solid rgba(255,255,255,0.14)" }}>
                                        <p className="px-4 pt-3.5 pb-1 text-[13px] font-bold" style={{ color: BN.text3 }}>{t("othersTitle")}</p>
                                        {othersSorted.slice(0, 3).map(o => {
                                            const d = Math.round(((o.price - unitPrice) / unitPrice) * 100);
                                            return (
                                                <BnLink
                                                    key={o.id}
                                                    href={o.shopSlug ? `/d/${o.shopSlug}/${o.slug}` : `/p/${o.slug}`}
                                                    className="flex items-center gap-3 px-4 py-3 transition-colors hover:bg-white/5"
                                                    style={{ borderTop: "1px solid rgba(255,255,255,0.10)" }}
                                                >
                                                    <span className="flex-1 min-w-0">
                                                        <span className="block text-[15px] font-bold truncate">{o.shopName}</span>
                                                        <span className="block mt-0.5 text-[12.5px] truncate" style={{ color: BN.text3 }}>{o.marketName ?? o.city}</span>
                                                    </span>
                                                    <span className="text-right flex-shrink-0">
                                                        <span className="block text-[15px] font-bold tabular-nums">{groupThousands(o.price)}</span>
                                                        {d !== 0 && (
                                                            <span className="block text-[12.5px] font-semibold tabular-nums" style={{ color: d < 0 ? BN.ok : BN.warn }}>
                                                                {d < 0 ? ts("cheaperBy", { pct: Math.abs(d) }) : `+${d}%`}
                                                            </span>
                                                        )}
                                                    </span>
                                                </BnLink>
                                            );
                                        })}
                                    </div>
                                )}

                                <div className="mt-6 flex flex-wrap gap-2.5">
                                    {!outOfStock && (
                                        <button
                                            type="button"
                                            onClick={onBuyNow}
                                            disabled={cartBusy}
                                            className="h-[54px] px-7 inline-flex items-center gap-2 rounded-full text-[15px] font-extrabold transition-transform active:scale-[0.98] disabled:opacity-60"
                                            style={{ background: BN.gold, color: BN.onGold }}
                                        >
                                            {ts("finalBuy", { price: `${groupThousands(unitPrice * qty)} ${t("currencySom")}` })}
                                        </button>
                                    )}
                                    <a
                                        href={`https://forhumo.uz/${locale}/nexus?bnProduct=${p.slug}&text=${encodeURIComponent(p.title)}`}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="h-[54px] px-5 inline-flex items-center gap-2 rounded-full text-[14.5px] font-bold"
                                        style={{ background: "rgba(255,255,255,0.10)", border: "1px solid rgba(255,255,255,0.22)", color: BN.text }}
                                    >
                                        <HumoNexusLogo size={20} />
                                        {t("shareOnNexus")}
                                    </a>
                                </div>
                            </div>
                        </section>
                    </div>
                </div>

                {/* Desktop: bob hisoblagichi (sahna ustida, o'ng pastda) */}
                <div className="hidden lg:flex sticky bottom-8 justify-start pl-[max(24px,6.6vw)] -mt-14 h-14 pointer-events-none" aria-hidden="true">
                    <div className="flex items-center gap-3.5">
                        <span className="text-[13px] font-bold tabular-nums" style={{ color: BN.text2 }}>0{step} / 04</span>
                        <span className="relative w-[120px] h-0.5 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.2)" }}>
                            <motion.span className="absolute inset-y-0 left-0 w-full origin-left" style={{ background: BN.text, scaleX: progress }} />
                        </span>
                        <span
                            className="hidden xl:inline-flex items-center gap-1 text-[12px] font-semibold uppercase tracking-[0.08em] transition-opacity duration-300"
                            style={{ color: BN.text3, opacity: step === 1 ? 1 : 0 }}
                        >
                            {ts("scrollHint")}
                            <ChevronDown className="w-4 h-4" />
                        </span>
                    </div>
                </div>
            </section>

            {/* Mobil: pastki xarid paneli (navbar ustida) */}
            {!outOfStock && (
                <div
                    className={`bn-stage lg:hidden fixed inset-x-0 z-40 px-4 transition-[transform,opacity] duration-300 ${barHidden ? "translate-y-6 opacity-0 pointer-events-none" : "translate-y-0 opacity-100"}`}
                    style={{ bottom: "calc(max(14px, env(safe-area-inset-bottom)) + 74px)" }}
                    aria-hidden={barHidden}
                >
                    <div className="mx-auto max-w-[440px] flex items-center gap-2 p-1.5 rounded-full"
                        style={{ background: "rgba(14, 18, 17, 0.92)", border: "1px solid rgba(255,255,255,0.14)", boxShadow: "0 12px 36px rgba(0,0,0,0.4)" }}>
                        {waPlainHref && (
                            <a href={waPlainHref} target="_blank" rel="noopener noreferrer" aria-label={ts("whatsappAria")}
                                tabIndex={barHidden ? -1 : 0}
                                className="w-12 h-12 grid place-items-center rounded-full flex-shrink-0" style={{ background: "rgba(255,255,255,0.08)" }}>
                                <WhatsAppLogo size={26} />
                            </a>
                        )}
                        {p.allowInspect && (
                            <button type="button" onClick={onStartInspect} disabled={cartBusy} tabIndex={barHidden ? -1 : 0}
                                className="flex-1 h-12 rounded-full text-[14.5px] font-bold disabled:opacity-60"
                                style={{ background: "rgba(255,255,255,0.12)", border: "1px solid rgba(255,255,255,0.2)", color: BN.text }}>
                                {ts("reserveShort")}
                            </button>
                        )}
                        <button type="button" onClick={onBuyNow} disabled={cartBusy} tabIndex={barHidden ? -1 : 0}
                            className="flex-[1.3] h-12 rounded-full text-[14.5px] font-extrabold inline-flex items-center justify-center gap-2 disabled:opacity-60"
                            style={{ background: BN.gold, color: BN.onGold }}>
                            {cartBusy && <Loader2 className="w-4 h-4 animate-spin" />}
                            {ts("buyNow")}
                        </button>
                    </div>
                </div>
            )}
        </>
    );
}

// ── Bozor narxi o'lchagichi ─────────────────────────────────────────────────

interface Meter {
    lo: number; hi: number; avg: number;
    cheapEdge: number; expEdge: number; pos: (v: number) => number;
}

function buildMeter(price: number, marketAvg: number | null, otherPrices: number[]): Meter | null {
    const prices = [price, ...otherPrices].filter(n => Number.isFinite(n) && n > 0);
    const avg = marketAvg && marketAvg > 0
        ? marketAvg
        : otherPrices.length > 0 ? prices.reduce((a, b) => a + b, 0) / prices.length : null;
    if (!avg) return null;
    let lo = Math.min(...prices, avg * 0.88);
    let hi = Math.max(...prices, avg * 1.16);
    const pad = (hi - lo) * 0.06;
    lo = Math.max(0, lo - pad);
    hi = hi + pad;
    const pos = (v: number) => Math.min(100, Math.max(0, ((v - lo) / (hi - lo)) * 100));
    return { lo, hi, avg, cheapEdge: pos(avg * 0.92), expEdge: pos(avg * 1.12), pos };
}

function roundNice(n: number): number {
    const step = n >= 1_000_000 ? 10_000 : n >= 100_000 ? 1_000 : 100;
    return Math.round(n / step) * step;
}

function MarketMeter({ meter, price }: { meter: Meter; price: number }) {
    const ts = useTranslations("bn.product.showroom");
    const pricePos = meter.pos(price);
    const avgPos = meter.pos(meter.avg);
    const labelPos = (v: number) => Math.min(84, Math.max(16, v));
    return (
        <div className="mt-6 p-5 rounded-[22px] max-w-[540px]" style={{ background: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.16)" }}>
            <div
                role="img"
                aria-label={ts("meterAria", {
                    price: groupThousands(price), avg: groupThousands(roundNice(meter.avg)),
                    lo: groupThousands(roundNice(meter.lo)), hi: groupThousands(roundNice(meter.hi)),
                })}
                className="relative h-[100px]"
            >
                <span className="absolute top-0 -translate-x-1/2 px-2.5 py-1 rounded-lg text-[12.5px] font-extrabold whitespace-nowrap tabular-nums"
                    style={{ left: `${labelPos(pricePos)}%`, background: "#F4F0E6", color: "#17140F" }}>
                    {ts("thisPrice")} · {groupThousands(price)}
                </span>
                <div className="absolute top-[42px] inset-x-0 h-2 flex gap-[3px]">
                    <span className="rounded-l-full" style={{ width: `${meter.cheapEdge}%`, background: "rgba(91,203,135,0.75)" }} />
                    <span className="flex-1" style={{ background: "rgba(245,212,106,0.75)" }} />
                    <span className="rounded-r-full" style={{ width: `${100 - meter.expEdge}%`, background: "rgba(245,154,85,0.75)" }} />
                </div>
                <span className="absolute top-[35px] -translate-x-1/2 w-[22px] h-[22px] rounded-full"
                    style={{ left: `${pricePos}%`, background: "#F4F0E6", border: "5px solid #1A2120" }} />
                <span className="absolute top-[36px] w-0.5 h-5" style={{ left: `${avgPos}%`, background: "#F4F0E6" }} />
                <span className="absolute top-[70px] left-0 text-[12.5px] tabular-nums" style={{ color: BN.text3 }}>{groupThousands(roundNice(meter.lo))}</span>
                <span className="absolute top-[70px] -translate-x-1/2 text-[12.5px] font-bold whitespace-nowrap tabular-nums" style={{ left: `${labelPos(avgPos)}%` }}>
                    {ts("avgShort", { price: groupThousands(roundNice(meter.avg)) })}
                </span>
                <span className="absolute top-[70px] right-0 text-[12.5px] tabular-nums" style={{ color: BN.text3 }}>{groupThousands(roundNice(meter.hi))}</span>
            </div>
            <div className="flex flex-wrap gap-x-5 gap-y-1.5 text-[13px]" style={{ color: BN.text2 }}>
                <Legend color="rgba(91,203,135,0.9)" label={ts("zoneCheap")} />
                <Legend color="rgba(245,212,106,0.9)" label={ts("zoneFair")} />
                <Legend color="rgba(245,154,85,0.9)" label={ts("zoneExpensive")} />
            </div>
        </div>
    );
}

function Legend({ color, label }: { color: string; label: string }) {
    return (
        <span className="inline-flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-[3px]" style={{ background: color }} />
            {label}
        </span>
    );
}

// ── Kichik bo'laklar ────────────────────────────────────────────────────────

function clampRatio(r: number): number {
    return Math.min(1.5, Math.max(0.56, r));
}

function PriceTag({ rank, label, avg }: { rank: "cheap" | "fair" | "expensive"; label: string; avg: string | null }) {
    const c = rank === "cheap"
        ? { bg: "rgba(91,203,135,0.16)", fg: BN.ok, Icon: TrendingDown }
        : rank === "expensive"
            ? { bg: "rgba(245,154,85,0.16)", fg: BN.warn, Icon: TrendingUp }
            : { bg: "rgba(245,212,106,0.16)", fg: BN.gold, Icon: Minus };
    return (
        <span
            className="inline-flex items-center gap-1.5 h-[30px] pl-4 pr-3 rounded-r-lg text-[13px] font-bold"
            style={{ background: c.bg, color: c.fg, clipPath: "polygon(9px 0, 100% 0, 100% 100%, 9px 100%, 0 50%)" }}
        >
            <c.Icon className="w-3.5 h-3.5" strokeWidth={2.6} />
            {label}{avg ? ` · ${avg}` : ""}
        </span>
    );
}

function WholesaleTiers({ tiers, qty }: { tiers: { minQty: number; price: number }[]; qty: number }) {
    const t = useTranslations("bn.product");
    return (
        <div className="mt-4 max-w-[420px] rounded-2xl p-3" style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.14)" }}>
            <p className="text-[12px] font-bold uppercase tracking-wider mb-2" style={{ color: BN.text3 }}>{t("wholesaleTiers")}</p>
            <div className="space-y-1">
                {tiers.map((tier, i) => {
                    const next = tiers[i + 1];
                    const range = next ? `${tier.minQty}–${next.minQty - 1}` : `${tier.minQty}+`;
                    const on = qty >= tier.minQty && (!next || qty < next.minQty);
                    return (
                        <div key={i} className="flex items-center justify-between text-[13.5px] rounded-lg px-2 py-1"
                            style={{ background: on ? BN.goldSoft : "transparent", color: on ? BN.gold : BN.text2, fontWeight: on ? 800 : 500 }}>
                            <span>{range} {t("stockUnit")}</span>
                            <span className="tabular-nums">{fmtPrice(tier.price)} / {t("perUnitShort")}</span>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}

function SocialProof({ buyers, sold, viewers }: { buyers: number; sold: number; viewers: number }) {
    const t = useTranslations("bn.product");
    // Prioritet: noyob xaridorlar > sotilgan dona > ko'ruvchilar (manipulyatsiyasiz chegaralar)
    const row = buyers >= 3 ? { n: buyers, text: t("buyersRecent") }
        : sold >= 3 ? { n: sold, text: t("soldRecent") }
        : viewers >= 20 ? { n: viewers, text: t("viewersRecent") } : null;
    if (!row) return null;
    return (
        <p className="mt-4 flex items-center gap-2 text-[14px]" style={{ color: BN.text2 }}>
            <Eye className="w-4 h-4" style={{ color: BN.gold }} />
            <b className="tabular-nums" style={{ color: BN.text }}>{row.n}</b> {row.text}
        </p>
    );
}

function ChapterHead({ n, kicker, id, a, b }: { n: string; kicker: string; id: string; a: string; b: string }) {
    return (
        <>
            <div className="text-[13px] font-bold uppercase tracking-[0.12em]" style={{ color: BN.gold }}>{n} — {kicker}</div>
            <h2 id={id} className="mt-3 text-[34px] lg:text-[50px] leading-[1.05] tracking-[-0.03em] font-light">
                {a} <span className="bn-display font-normal">{b}</span>
            </h2>
        </>
    );
}

function WayRow({ icon, title, text, side, highlight }: { icon: ReactNode; title: string; text: string; side?: ReactNode; highlight?: boolean }) {
    return (
        <li className="flex items-center gap-3.5 px-4 py-3.5 rounded-[18px]"
            style={{
                background: highlight ? "rgba(245,212,106,0.12)" : "rgba(255,255,255,0.06)",
                border: `1px solid ${highlight ? "rgba(245,212,106,0.45)" : "rgba(255,255,255,0.14)"}`,
            }}>
            <span className="flex-shrink-0" style={{ color: highlight ? BN.gold : BN.text2 }}>{icon}</span>
            <span className="flex-1 min-w-0">
                <span className="block text-[15.5px] font-bold">{title}</span>
                <span className="block mt-0.5 text-[13.5px]" style={{ color: BN.text3 }}>{text}</span>
            </span>
            {side && <span className="flex-shrink-0 text-[14px] font-bold">{side}</span>}
        </li>
    );
}

function RoundBtn({ label, onClick, disabled, pressed, children }: {
    label: string; onClick: () => void; disabled?: boolean; pressed?: boolean; children: ReactNode;
}) {
    return (
        <button
            type="button"
            onClick={onClick}
            disabled={disabled}
            aria-label={label}
            aria-pressed={pressed}
            title={label}
            className="w-11 h-11 grid place-items-center rounded-full transition-colors hover:bg-white/15 disabled:opacity-60"
            style={{ background: "rgba(255,255,255,0.10)", border: "1px solid rgba(255,255,255,0.18)", color: BN.text }}
        >
            {children}
        </button>
    );
}

function GlassBtn({ onClick, disabled, label, iconOnlyLg, children }: {
    onClick: () => void; disabled?: boolean; label?: string; iconOnlyLg?: boolean; children: ReactNode;
}) {
    return (
        <button
            type="button"
            onClick={onClick}
            disabled={disabled}
            aria-label={iconOnlyLg ? label : undefined}
            title={iconOnlyLg ? label : undefined}
            className={`h-[54px] px-3 lg:px-5 inline-flex items-center justify-center gap-2 rounded-full text-[14px] lg:text-[15px] font-bold whitespace-nowrap transition-colors hover:bg-white/20 disabled:opacity-60 ${iconOnlyLg ? "lg:w-[54px] lg:px-0" : ""}`}
            style={{ background: "rgba(255,255,255,0.13)", border: "1px solid rgba(255,255,255,0.24)", color: BN.text }}
        >
            {children}
        </button>
    );
}

function GlassLink({ href, external, small, children }: { href: string; external?: boolean; small?: boolean; children: ReactNode }) {
    return (
        <a
            href={href}
            {...(external ? { target: "_blank", rel: "noopener noreferrer" } : {})}
            className={`${small ? "h-11 text-[13.5px]" : "h-[54px] px-3 lg:px-5 text-[14px] lg:text-[15px]"} inline-flex items-center justify-center gap-2 rounded-full font-bold whitespace-nowrap transition-colors hover:bg-white/20`}
            style={{ background: "rgba(255,255,255,0.13)", border: "1px solid rgba(255,255,255,0.24)", color: BN.text }}
        >
            {children}
        </a>
    );
}

function ContactPill({ href, external, big, label, onClick, children }: {
    href: string; external?: boolean; big?: boolean; label: string; onClick?: () => void; children: ReactNode;
}) {
    return (
        <a
            href={href}
            aria-label={label}
            onClick={onClick}
            {...(external ? { target: "_blank", rel: "noopener noreferrer" } : {})}
            className={`${big ? "h-[50px] px-5 text-[15px]" : "h-11 px-4 text-[14px]"} inline-flex items-center gap-2 rounded-full font-semibold transition-colors hover:bg-white/15`}
            style={{ background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.16)", color: BN.text }}
        >
            {children}
        </a>
    );
}

function QtyBtn({ label, onClick, disabled, children }: { label: string; onClick: () => void; disabled?: boolean; children: ReactNode }) {
    return (
        <button type="button" onClick={onClick} disabled={disabled} aria-label={label}
            className="w-11 h-11 grid place-items-center transition-opacity disabled:opacity-30" style={{ color: BN.text }}>
            {children}
        </button>
    );
}

function MediaControls({
    className = "", media, active, onPick, current, playing, muted, duration, onTogglePlay, onToggleMute, compact, blurred,
}: {
    className?: string;
    media: MediaItem[];
    active: number;
    onPick: (i: number) => void;
    current: MediaItem | null;
    playing: boolean;
    muted: boolean;
    duration: number | null;
    onTogglePlay: () => void;
    onToggleMute: () => void;
    compact?: boolean;
    /** 18+ darvozasi yopiq — kichik rasmlar ham xira */
    blurred?: boolean;
}) {
    const ts = useTranslations("bn.product.showroom");
    // 18+ darvozasi yopiq bo'lsa video umuman render qilinmaydi — boshqaruv ham kerak emas
    const isVideo = current?.kind === "video" && !blurred;
    if (media.length <= 1 && !isVideo) return null;
    const glass: CSSProperties = { background: "rgba(16,21,20,0.55)", border: "1px solid rgba(255,255,255,0.22)", color: BN.text };

    if (compact) {
        return (
            <div className={`flex items-center gap-2 ${className}`}>
                {isVideo && (
                    <button type="button" onClick={onTogglePlay} aria-label={playing ? ts("pause") : ts("play")}
                        className="h-11 px-3.5 inline-flex items-center gap-1.5 rounded-full text-[13px] font-bold" style={glass}>
                        {playing ? <Pause className="w-3.5 h-3.5" fill="currentColor" /> : <Play className="w-3.5 h-3.5" fill="currentColor" />}
                        {ts("video")}{duration ? ` · ${mmss(duration)}` : ""}
                    </button>
                )}
                {media.length > 1 && (
                    <div className="flex items-center gap-1" role="group" aria-label={ts("mediaGroup")}>
                        {media.map((m, i) => (
                            <button key={`${m.src}-${i}`} type="button" onClick={() => onPick(i)}
                                aria-label={ts("mediaN", { n: i + 1 })} aria-current={i === active}
                                className="h-11 min-w-6 grid place-items-center px-1.5">
                                <span className="block h-1.5 rounded-full transition-all"
                                    style={{ width: i === active ? 18 : 6, background: i === active ? BN.text : "rgba(244,240,230,0.45)" }} />
                            </button>
                        ))}
                    </div>
                )}
                <span className="flex-1" />
                {isVideo && (
                    <button type="button" onClick={onToggleMute} aria-label={muted ? ts("unmute") : ts("mute")}
                        className="w-11 h-11 grid place-items-center rounded-full" style={glass}>
                        {muted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
                    </button>
                )}
            </div>
        );
    }

    return (
        <div className={`items-center gap-2 ${className}`}>
            {/* Barcha media — vertikal tasma, sig'masa aylanadi */}
            <div className="flex flex-col items-center gap-2 max-h-[min(392px,52vh)] overflow-y-auto bn-noscroll p-0.5" role="group" aria-label={ts("mediaGroup")}>
            {media.map((m, i) => (
                <button key={`${m.src}-${i}`} type="button" onClick={() => onPick(i)}
                    aria-label={m.kind === "video" ? ts("video") : ts("mediaN", { n: i + 1 })} aria-current={i === active}
                    className="relative w-[52px] h-[52px] xl:w-[60px] xl:h-[60px] flex-shrink-0 rounded-[14px] overflow-hidden grid place-items-center transition-transform hover:scale-[1.04]"
                    style={{ border: i === active ? `2px solid ${BN.text}` : "1px solid rgba(255,255,255,0.22)", background: "rgba(255,255,255,0.10)" }}>
                    {m.kind === "image" ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={m.src} alt="" className="w-full h-full object-cover" style={blurred ? { filter: "blur(10px)" } : undefined} />
                    ) : (
                        <Play className="w-[18px] h-[18px]" fill="currentColor" style={{ color: BN.text }} />
                    )}
                </button>
            ))}
            </div>
            {isVideo && (
                <>
                    <button type="button" onClick={onTogglePlay} aria-label={playing ? ts("pause") : ts("play")}
                        className="mt-2 w-11 h-11 grid place-items-center rounded-full" style={glass}>
                        {playing ? <Pause className="w-4 h-4" fill="currentColor" /> : <Play className="w-4 h-4" fill="currentColor" />}
                    </button>
                    <button type="button" onClick={onToggleMute} aria-label={muted ? ts("unmute") : ts("mute")}
                        className="w-11 h-11 grid place-items-center rounded-full" style={glass}>
                        {muted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
                    </button>
                    {duration ? <span className="text-[12.5px] font-bold tabular-nums" style={{ color: BN.text }}>{mmss(duration)}</span> : null}
                </>
            )}
        </div>
    );
}
