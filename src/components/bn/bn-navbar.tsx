"use client";

// BN pastki navbar — LiquidGlass uslubidagi drag + spring pill.
// Bosish = darhol navigatsiya. Barmoq bilan surish = pill jonli suriladi,
// bosim ko'targanda o'sha tabga o'tadi.

import { useState, useRef, useEffect, useLayoutEffect, useCallback, type PointerEvent as ReactPointerEvent } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Home, LayoutGrid, Heart, ShoppingCart } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { BN } from "@/lib/bn-theme";
import { useBnPath, useBnHref } from "./bn-nav";

interface Item {
    href: string;
    label: string;
    icon?: LucideIcon;
    iconSrc?: string;
    iconSrcAlt?: string;
}

const ITEMS: Item[] = [
    { href: "/",           label: "Asosiy",     icon: Home },
    { href: "/katalog",    label: "Katalog",    icon: LayoutGrid },
    { href: "/sevimlilar", label: "Sevimlilar", icon: Heart },
    { href: "/savat",      label: "Savat",      icon: ShoppingCart },
    { href: "/nexus",      label: "Nexus",      iconSrc: "/logos/humo-nexus.png", iconSrcAlt: "Humo Nexus" },
];

/** Swipe navigatsiya uchun tartib. `bn-swipe-nav.tsx` shu ro'yxatdan foydalanadi. */
export const NAV_ORDER = ITEMS.map(i => i.href);

const useIsoLayoutEffect = typeof window !== "undefined" ? useLayoutEffect : useEffect;

export function BnNavbar() {
    const router = useRouter();
    const to = useBnHref();
    const path = useBnPath();

    const wrapRef = useRef<HTMLDivElement>(null);
    const btnRefs = useRef<Array<HTMLButtonElement | null>>([]);
    const dragActive = useRef(false);
    const draggedRef = useRef(false);

    const [pill, setPill] = useState<{ x: number; w: number; ready: boolean }>({ x: 0, w: 0, ready: false });

    const activeIdx = Math.max(0, ITEMS.findIndex(it =>
        it.href === "/" ? path === "/" : path.startsWith(it.href)
    ));

    const measure = useCallback(() => {
        const btn = btnRefs.current[activeIdx];
        const wrap = wrapRef.current;
        if (!btn || !wrap) return;
        const b = btn.getBoundingClientRect();
        const w = wrap.getBoundingClientRect();
        setPill({ x: b.left - w.left, w: b.width, ready: true });
    }, [activeIdx]);

    useIsoLayoutEffect(() => { measure(); }, [measure]);

    useEffect(() => {
        window.addEventListener("resize", measure);
        return () => window.removeEventListener("resize", measure);
    }, [measure]);

    const pickAt = useCallback((clientX: number): number => {
        for (let i = 0; i < btnRefs.current.length; i++) {
            const el = btnRefs.current[i];
            if (!el) continue;
            const r = el.getBoundingClientRect();
            const isEdge = i === 0 || i === btnRefs.current.length - 1;
            const pad = isEdge ? 30 : 4;
            if (clientX >= r.left - pad && clientX <= r.right + pad) return i;
        }
        return -1;
    }, []);

    // Preview pill (drag paytida, aslida navigatsiya qilmasdan)
    const [previewIdx, setPreviewIdx] = useState<number | null>(null);
    const shownIdx = previewIdx ?? activeIdx;

    // shownIdx o'zgarganda pill'ni ko'chirish
    useEffect(() => {
        const btn = btnRefs.current[shownIdx];
        const wrap = wrapRef.current;
        if (!btn || !wrap) return;
        const b = btn.getBoundingClientRect();
        const w = wrap.getBoundingClientRect();
        setPill(p => ({ ...p, x: b.left - w.left, w: b.width }));
    }, [shownIdx]);

    function buzz() {
        try { navigator.vibrate?.(8); } catch { /* ignore */ }
    }

    function navigate(idx: number) {
        const it = ITEMS[idx];
        if (!it) return;
        router.push(to(it.href));
        buzz();
    }

    function onPointerDown(e: ReactPointerEvent<HTMLDivElement>) {
        try { e.currentTarget.setPointerCapture(e.pointerId); } catch { /* ignore */ }
        dragActive.current = true;
        draggedRef.current = false;
        const idx = pickAt(e.clientX);
        if (idx >= 0 && idx !== activeIdx) setPreviewIdx(idx);
    }
    function onPointerMove(e: ReactPointerEvent<HTMLDivElement>) {
        if (!dragActive.current) return;
        if (e.pointerType === "mouse" && e.buttons === 0) { dragActive.current = false; setPreviewIdx(null); return; }
        const idx = pickAt(e.clientX);
        if (idx >= 0) {
            if (idx !== shownIdx) draggedRef.current = true;
            setPreviewIdx(idx);
        }
    }
    function onPointerUp(e: ReactPointerEvent<HTMLDivElement>) {
        dragActive.current = false;
        try { e.currentTarget.releasePointerCapture(e.pointerId); } catch { /* ignore */ }
        const target = previewIdx ?? pickAt(e.clientX);
        setPreviewIdx(null);
        if (target >= 0 && target !== activeIdx) navigate(target);
    }
    function onPointerCancel() {
        dragActive.current = false;
        setPreviewIdx(null);
    }

    return (
        <nav
            className="fixed inset-x-0 bottom-0 z-50 pointer-events-none"
            style={{ paddingBottom: "max(14px, env(safe-area-inset-bottom))" }}
        >
            <div className="mx-auto max-w-[440px] px-4">
                <div
                    ref={wrapRef}
                    role="tablist"
                    aria-label="Asosiy navigatsiya"
                    onPointerDown={onPointerDown}
                    onPointerMove={onPointerMove}
                    onPointerUp={onPointerUp}
                    onPointerCancel={onPointerCancel}
                    className="pointer-events-auto relative flex items-stretch p-1.5 rounded-[26px] select-none touch-none"
                    style={{
                        background: BN.glass,
                        backdropFilter: "blur(24px) saturate(180%)",
                        WebkitBackdropFilter: "blur(24px) saturate(180%)",
                        border: `1px solid ${BN.border}`,
                        boxShadow: BN.shadow,
                    }}
                >
                    {/* Suyuq pill indikator */}
                    <motion.div
                        aria-hidden="true"
                        className="absolute rounded-[20px] pointer-events-none"
                        initial={false}
                        animate={pill.ready ? { x: pill.x, width: pill.w, opacity: 1 } : { opacity: 0 }}
                        transition={{
                            x:       { type: "spring", stiffness: 380, damping: 32, mass: 0.9 },
                            width:   { type: "spring", stiffness: 220, damping: 26, mass: 1.1 },
                            opacity: { duration: 0.15 },
                        }}
                        style={{
                            left: 0,
                            top: 6,
                            bottom: 6,
                            background: BN.goldSoft,
                            border: `1px solid ${BN.goldEdge}`,
                        }}
                    />

                    {ITEMS.map((it, i) => {
                        const active = i === shownIdx;
                        return (
                            <button
                                key={it.href}
                                ref={el => { btnRefs.current[i] = el; }}
                                role="tab"
                                aria-selected={i === activeIdx}
                                type="button"
                                onClick={() => { if (!draggedRef.current) navigate(i); }}
                                aria-label={it.label}
                                className="relative z-10 flex flex-col items-center justify-center gap-1 flex-1 h-[52px] rounded-2xl focus:outline-none"
                                style={{
                                    color: active ? BN.gold : BN.text3,
                                    transition: "color 220ms ease",
                                }}
                            >
                                {it.iconSrc ? (
                                    // eslint-disable-next-line @next/next/no-img-element
                                    <img
                                        src={it.iconSrc}
                                        alt={it.iconSrcAlt ?? ""}
                                        width={20}
                                        height={20}
                                        className="w-[20px] h-[20px] object-contain pointer-events-none"
                                        style={{
                                            filter: active ? "none" : "grayscale(1) opacity(0.75)",
                                            transition: "filter .15s",
                                        }}
                                    />
                                ) : it.icon ? (
                                    <it.icon
                                        className="w-[19px] h-[19px] pointer-events-none"
                                        strokeWidth={active ? 2.4 : 1.9}
                                    />
                                ) : null}
                                <span
                                    className="text-[10px] leading-none pointer-events-none"
                                    style={{ fontWeight: active ? 800 : 600 }}
                                >
                                    {it.label}
                                </span>
                            </button>
                        );
                    })}
                </div>
            </div>
        </nav>
    );
}
