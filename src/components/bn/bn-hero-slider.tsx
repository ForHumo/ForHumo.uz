"use client";

// Bosh sahifa reklama banner slayderi — REAL (BnAdBanner API'dan).
// 5 slot: to'lgan slotlar sotuvchi bannerlari, bo'sh slot'lar "Bu yerda
// sizning reklamangiz" placeholder + "Reklama qo'yish" tugma.
// Har banner ko'rilganda impressions++, "Batafsil" bosilganda clicks++.

import { useState, useEffect, useCallback, useRef } from "react";
import { ChevronRight, Sparkles, Plus } from "lucide-react";
import { useLocale } from "next-intl";
import { BN } from "@/lib/bn-theme";
import { BnLink } from "./bn-nav";
import { BnAdBuyModal } from "./bn-ad-buy-modal";

interface Banner {
    id: string; slot: number; imageUrl: string; title: string; ctaUrl: string; shopSlug: string | null;
}

const AUTO_MS = 5500;
const SWIPE_THRESHOLD = 40;
const TOTAL_SLOTS = 5;

const PLACEHOLDER_GRADIENTS: [string, string][] = [
    ["#F5B301", "#B8860B"],
    ["#28282F", "#17171B"],
    ["#3D2E15", "#1F1F25"],
    ["#B8860B", "#F5B301"],
    ["#15803D", "#0F5E2F"],
];

export function BnHeroSlider() {
    const locale = useLocale();
    const [banners, setBanners] = useState<(Banner | null)[]>(Array(TOTAL_SLOTS).fill(null));
    const [loading, setLoading] = useState(true);
    const [idx, setIdx] = useState(0);
    const [paused, setPaused] = useState(false);
    const [progress, setProgress] = useState(0);
    const [buyOpen, setBuyOpen] = useState(false);
    const impressedRef = useRef<Set<string>>(new Set());
    const dragRef = useRef<{ x: number; y: number; active: boolean } | null>(null);

    const t = (u: string, r: string, e: string) => locale === "ru" ? r : locale === "en" ? e : u;

    useEffect(() => {
        (async () => {
            try {
                const r = await fetch("/api/bn/ads/active");
                if (!r.ok) throw new Error();
                const d = await r.json();
                setBanners(Array.isArray(d.banners) ? d.banners : Array(TOTAL_SLOTS).fill(null));
            } catch {
                setBanners(Array(TOTAL_SLOTS).fill(null));
            } finally {
                setLoading(false);
            }
        })();
    }, []);

    const go = useCallback((n: number) => {
        setIdx(((n % TOTAL_SLOTS) + TOTAL_SLOTS) % TOTAL_SLOTS);
        setProgress(0);
    }, []);

    // Impression track (bir marta per session per banner)
    useEffect(() => {
        const b = banners[idx];
        if (!b) return;
        if (impressedRef.current.has(b.id)) return;
        impressedRef.current.add(b.id);
        fetch(`/api/bn/ads/${b.id}/impression`, { method: "POST", keepalive: true }).catch(() => null);
    }, [idx, banners]);

    // Progress bar
    useEffect(() => {
        if (paused || loading) return;
        setProgress(0);
        const start = performance.now();
        let raf = 0;
        const tick = (time: number) => {
            const p = Math.min(100, ((time - start) / AUTO_MS) * 100);
            setProgress(p);
            if (p >= 100) {
                setIdx(i => (i + 1) % TOTAL_SLOTS);
                return;
            }
            raf = requestAnimationFrame(tick);
        };
        raf = requestAnimationFrame(tick);
        return () => cancelAnimationFrame(raf);
    }, [paused, idx, loading]);

    function onPointerDown(e: React.PointerEvent) {
        dragRef.current = { x: e.clientX, y: e.clientY, active: true };
        setPaused(true);
    }
    function onPointerUp(e: React.PointerEvent) {
        const d = dragRef.current;
        dragRef.current = null;
        if (!d?.active) { setPaused(false); return; }
        const dx = e.clientX - d.x;
        const dy = e.clientY - d.y;
        setPaused(false);
        if (Math.abs(dy) > Math.abs(dx)) return;
        if (Math.abs(dx) < SWIPE_THRESHOLD) return;
        go(dx < 0 ? idx + 1 : idx - 1);
    }

    function handleCtaClick(bannerId: string) {
        fetch(`/api/bn/ads/${bannerId}/click`, { method: "POST", keepalive: true }).catch(() => null);
    }

    return (
        <>
            <section
                className="relative overflow-hidden rounded-3xl mb-8 select-none"
                style={{ border: `1px solid ${BN.border}`, touchAction: "pan-y" }}
                onMouseEnter={() => setPaused(true)}
                onMouseLeave={() => setPaused(false)}
                onPointerDown={onPointerDown}
                onPointerUp={onPointerUp}
                onPointerCancel={() => { dragRef.current = null; setPaused(false); }}
                data-no-swipe
            >
                <div
                    className="flex transition-transform duration-500 ease-out"
                    style={{ transform: `translateX(-${idx * 100}%)` }}
                >
                    {banners.map((b, i) => (
                        <div key={i} className="w-full flex-shrink-0" style={{ minHeight: 210 }}>
                            {b ? (
                                // Haqiqiy reklama — rasm fon + overlay + CTA
                                <div className="relative w-full" style={{ minHeight: 210 }}>
                                    <img src={b.imageUrl} alt={b.title} className="absolute inset-0 w-full h-full object-cover" />
                                    <div
                                        className="absolute inset-0"
                                        style={{ background: "linear-gradient(135deg, rgba(0,0,0,0.55) 0%, rgba(0,0,0,0.15) 60%, rgba(0,0,0,0.55) 100%)" }}
                                    />
                                    <div className="relative flex flex-col justify-end p-6 sm:p-8 md:p-10 min-h-[210px]">
                                        <div className="inline-flex items-center gap-1 h-6 px-2 rounded-md text-[10px] font-bold w-max mb-2" style={{ background: "rgba(255,255,255,0.9)", color: "#0A0E27" }}>
                                            AD
                                        </div>
                                        <h2 className="text-[22px] sm:text-[28px] md:text-[32px] font-black tracking-tight leading-[1.1] mb-3 text-white max-w-[600px]">
                                            {b.title}
                                        </h2>
                                        <a
                                            href={b.ctaUrl}
                                            target={b.ctaUrl.startsWith("http") && !b.ctaUrl.includes("bozornarxida.uz") ? "_blank" : "_self"}
                                            rel="noopener noreferrer sponsored"
                                            onClick={() => handleCtaClick(b.id)}
                                            className="inline-flex items-center gap-2 h-11 px-5 rounded-2xl text-[14px] font-black transition-transform active:scale-[0.97] w-max"
                                            style={{ background: BN.gold, color: BN.onGold }}
                                        >
                                            {t("Batafsil", "Подробнее", "Learn more")}
                                            <ChevronRight className="w-4 h-4" />
                                        </a>
                                    </div>
                                </div>
                            ) : (
                                // Bo'sh slot — "Bu yerda sizning reklamangiz"
                                <div
                                    className="w-full h-full grid grid-cols-1 md:grid-cols-[1fr_auto] items-center gap-4 p-6 sm:p-8 md:p-10"
                                    style={{
                                        minHeight: 210,
                                        background: `linear-gradient(135deg, ${PLACEHOLDER_GRADIENTS[i][0]} 0%, ${PLACEHOLDER_GRADIENTS[i][1]} 100%)`,
                                        color: "#F6F4F0",
                                    }}
                                >
                                    <div className="min-w-0">
                                        <div className="inline-flex items-center gap-1 h-6 px-2 rounded-md text-[10px] font-bold w-max mb-2" style={{ background: "rgba(255,255,255,0.2)", color: "#fff" }}>
                                            SLOT {i + 1} · {t("BO'SH", "СВОБОДНО", "AVAILABLE")}
                                        </div>
                                        <h2 className="text-[22px] sm:text-[28px] md:text-[32px] font-black tracking-tight leading-[1.1] mb-2">
                                            {t("Bu yerda sizning reklamangiz", "Здесь ваша реклама", "Your ad could be here")}
                                        </h2>
                                        <p className="text-[13px] sm:text-[14.5px] max-w-[520px] leading-relaxed opacity-90 mb-4">
                                            {t(
                                                "Kunlik mijozlar Sizning reklamangizni ko'radi",
                                                "Ежедневные клиенты увидят вашу рекламу",
                                                "Daily buyers will see your ad",
                                            )}
                                        </p>
                                        <button
                                            onClick={() => setBuyOpen(true)}
                                            className="inline-flex items-center gap-2 h-11 px-5 rounded-2xl text-[14px] font-black transition-transform active:scale-[0.97]"
                                            style={{ background: "#F6F4F0", color: "#1C1913" }}
                                        >
                                            <Plus className="w-4 h-4" />
                                            {t("Reklama qo'yish", "Разместить рекламу", "Place an ad")}
                                        </button>
                                    </div>
                                    <div className="hidden md:block text-[120px] font-black leading-none opacity-15" aria-hidden="true">
                                        <Sparkles className="w-32 h-32" style={{ color: "#F6F4F0" }} />
                                    </div>
                                </div>
                            )}
                        </div>
                    ))}
                </div>

                {/* Progress bar segmentlari */}
                <div className="absolute left-4 right-4 bottom-3 flex items-center gap-1.5">
                    {Array(TOTAL_SLOTS).fill(0).map((_, i) => (
                        <button
                            key={i}
                            type="button"
                            onClick={() => go(i)}
                            aria-label={`Slot ${i + 1}`}
                            className="flex-1 h-1 rounded-full overflow-hidden transition-opacity"
                            style={{ background: "rgba(255,255,255,0.28)" }}
                        >
                            <span
                                className="block h-full rounded-full"
                                style={{
                                    width: i < idx ? "100%" : i === idx ? `${progress}%` : "0%",
                                    background: "#fff",
                                    transition: i === idx ? "none" : "width 0.3s",
                                }}
                            />
                        </button>
                    ))}
                </div>
            </section>

            <BnAdBuyModal open={buyOpen} onClose={() => setBuyOpen(false)} onSuccess={() => location.reload()} />
        </>
    );
}
