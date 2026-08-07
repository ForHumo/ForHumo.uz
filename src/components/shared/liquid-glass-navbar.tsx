"use client";

// ─────────────────────────────────────────────────────────────────────────────
// LiquidGlassNavbar — iOS 26 uslubidagi glassmorphism drag/swipe navbar.
//
// Xususiyatlar:
//   • Glassmorphism fon (backdrop-blur + saturate, shaffof oq/qora)
//   • Bosish, ushlab surish (drag), swipe — hammasi bir xil ishlaydi
//   • "Liquid" cho'zilish effekti: X va width uchun alohida spring — o'tishda
//     old chekka orqasidan tezroq keladi (elastik his beradi)
//   • Touch (pointer/mouse) hodisalari — mobil + desktop
//   • Haptic feedback (navigator.vibrate) — qo'llanadigan qurilmalarda
//   • Kunduzgi + tungi tema (tint prop)
//   • Klaviatura: ← → tugmalari (a11y)
//   • SSR-safe, next.js 15 App Router uchun mos ("use client")
//
// Foydalanish namunasi eng pastda.
// ─────────────────────────────────────────────────────────────────────────────

import {
    useState, useRef, useEffect, useCallback, useLayoutEffect,
    type ReactNode, type KeyboardEvent as ReactKeyboardEvent,
    type PointerEvent as ReactPointerEvent,
} from "react";
import { motion } from "framer-motion";

// ── Interfeys ───────────────────────────────────────────────────────────────

export interface LiquidNavItem {
    /** Yagona identifikator */
    key: string;
    /** Tugmada ko'rinadigan matn */
    label: string;
    /** Ixtiyoriy ikonka (Lucide, SVG va h.k.) */
    icon?: ReactNode;
}

export interface LiquidGlassNavbarProps {
    items: LiquidNavItem[];
    /** Joriy aktiv element keyi */
    value: string;
    /** Aktiv o'zgarganda chaqiriladi */
    onChange: (key: string) => void;
    /** Yorug' (oq shaffof) yoki qorong'i tema */
    tint?: "light" | "dark";
    /** Aktiv element matn rangi (tint=light bo'lganda) */
    accent?: string;
    /** Haptic feedback (default true) */
    haptic?: boolean;
    className?: string;
    ariaLabel?: string;
}

// ── Ichki: SSR-safe layout effect ───────────────────────────────────────────

const useIsoLayoutEffect = typeof window !== "undefined" ? useLayoutEffect : useEffect;

// ── Komponent ───────────────────────────────────────────────────────────────

export function LiquidGlassNavbar({
    items,
    value,
    onChange,
    tint = "light",
    accent = "#0A0A0A",
    haptic = true,
    className = "",
    ariaLabel = "Navigation",
}: LiquidGlassNavbarProps) {
    const wrapRef = useRef<HTMLDivElement>(null);
    const btnRefs = useRef<Array<HTMLButtonElement | null>>([]);
    const dragActiveRef = useRef(false);

    const [pill, setPill] = useState<{ x: number; w: number; ready: boolean }>({
        x: 0, w: 0, ready: false,
    });

    const activeIdx = Math.max(0, items.findIndex(i => i.key === value));

    // ── Aktiv tugmani o'lchash va pill'ni o'sha joyga qo'yish ───────────────
    const measure = useCallback(() => {
        const btn = btnRefs.current[activeIdx];
        const wrap = wrapRef.current;
        if (!btn || !wrap) return;
        const bRect = btn.getBoundingClientRect();
        const wRect = wrap.getBoundingClientRect();
        setPill({ x: bRect.left - wRect.left, w: bRect.width, ready: true });
    }, [activeIdx]);

    useIsoLayoutEffect(() => { measure(); }, [measure, items.length]);

    // Oyna o'lchami / shrift o'zgarishida qayta o'lchash
    useEffect(() => {
        window.addEventListener("resize", measure);
        // Shrift yuklangach o'lcham o'zgarishi mumkin
        if ("fonts" in document) {
            document.fonts.ready.then(() => measure()).catch(() => { });
        }
        return () => window.removeEventListener("resize", measure);
    }, [measure]);

    // ── Haptic ──────────────────────────────────────────────────────────────
    const buzz = useCallback(() => {
        if (!haptic) return;
        if (typeof navigator !== "undefined" && typeof navigator.vibrate === "function") {
            try { navigator.vibrate(10); } catch { /* ignore */ }
        }
    }, [haptic]);

    // ── Aktiv o'zgartirish ─────────────────────────────────────────────────
    const setActive = useCallback((key: string) => {
        if (key === value) return;
        onChange(key);
        buzz();
    }, [value, onChange, buzz]);

    // ── Ushbu X koordinata qaysi tugmaga tegishli? ──────────────────────────
    const pickAt = useCallback((clientX: number): string | null => {
        const wrap = wrapRef.current;
        if (!wrap) return null;
        for (let i = 0; i < btnRefs.current.length; i++) {
            const el = btnRefs.current[i];
            if (!el) continue;
            const r = el.getBoundingClientRect();
            // Chekka elementlarda oz kengroq mintaqa — chetdan sirg'anib chiqmasin
            const isEdge = i === 0 || i === btnRefs.current.length - 1;
            const pad = isEdge ? 24 : 4;
            if (clientX >= r.left - pad && clientX <= r.right + pad) return items[i].key;
        }
        return null;
    }, [items]);

    // ── Drag hodisalari ────────────────────────────────────────────────────
    function onPointerDown(e: ReactPointerEvent<HTMLDivElement>) {
        try { e.currentTarget.setPointerCapture(e.pointerId); } catch { /* ignore */ }
        dragActiveRef.current = true;
        const key = pickAt(e.clientX);
        if (key) setActive(key);
    }
    function onPointerMove(e: ReactPointerEvent<HTMLDivElement>) {
        if (!dragActiveRef.current) return;
        // Mouse tugmasi bo'shab qolgan bo'lsa — tugating
        if (e.pointerType === "mouse" && e.buttons === 0) {
            dragActiveRef.current = false;
            return;
        }
        const key = pickAt(e.clientX);
        if (key) setActive(key);
    }
    function onPointerUp(e: ReactPointerEvent<HTMLDivElement>) {
        dragActiveRef.current = false;
        try { e.currentTarget.releasePointerCapture(e.pointerId); } catch { /* ignore */ }
    }

    // ── Klaviatura navigatsiyasi (← →) ─────────────────────────────────────
    function onKeyDown(e: ReactKeyboardEvent<HTMLDivElement>) {
        if (e.key !== "ArrowLeft" && e.key !== "ArrowRight") return;
        e.preventDefault();
        const dir = e.key === "ArrowRight" ? 1 : -1;
        const next = activeIdx + dir;
        if (next < 0 || next >= items.length) return;
        setActive(items[next].key);
        btnRefs.current[next]?.focus();
    }

    // ── Uslub tokenlari ────────────────────────────────────────────────────
    const isLight = tint === "light";
    const s = {
        bg:         isLight ? "rgba(255,255,255,0.30)" : "rgba(24,24,27,0.55)",
        border:     isLight ? "rgba(255,255,255,0.55)" : "rgba(255,255,255,0.10)",
        pillBg:     isLight ? "rgba(255,255,255,0.88)" : "rgba(255,255,255,0.14)",
        pillBorder: isLight ? "rgba(255,255,255,0.90)" : "rgba(255,255,255,0.22)",
        textOff:    isLight ? "rgba(30,30,30,0.68)"    : "rgba(230,230,235,0.72)",
        textOn:     isLight ? accent                    : "#FFFFFF",
        outerShadow: isLight
            ? "0 8px 32px rgba(20,20,40,0.10), inset 0 1px 0 rgba(255,255,255,0.55)"
            : "0 8px 32px rgba(0,0,0,0.35),  inset 0 1px 0 rgba(255,255,255,0.08)",
        pillShadow:  isLight
            ? "0 4px 18px rgba(20,20,40,0.14)"
            : "0 4px 18px rgba(0,0,0,0.45)",
    };

    return (
        <div
            ref={wrapRef}
            role="tablist"
            aria-label={ariaLabel}
            tabIndex={0}
            onKeyDown={onKeyDown}
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
            onPointerCancel={onPointerUp}
            className={`relative inline-flex items-stretch p-1.5 rounded-full select-none outline-none ${className}`}
            style={{
                background: s.bg,
                backdropFilter: "blur(24px) saturate(180%)",
                WebkitBackdropFilter: "blur(24px) saturate(180%)",
                border: `1px solid ${s.border}`,
                boxShadow: s.outerShadow,
                touchAction: "pan-y",
            }}
        >
            {/* Liquid pill indikator — X va width uchun ALOHIDA spring:
                old chekka orqasidan tezroq keladi → cho'zilib boradigan his */}
            <motion.div
                aria-hidden="true"
                className="absolute rounded-full pointer-events-none"
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
                    background: s.pillBg,
                    border: `1px solid ${s.pillBorder}`,
                    boxShadow: s.pillShadow,
                    // Ichkarida ozgina kontrast — pill'ning "shishasi"
                    backdropFilter: "blur(4px)",
                    WebkitBackdropFilter: "blur(4px)",
                }}
            />

            {items.map((it, i) => {
                const active = it.key === value;
                return (
                    <button
                        key={it.key}
                        ref={el => { btnRefs.current[i] = el; }}
                        role="tab"
                        aria-selected={active}
                        type="button"
                        onClick={() => setActive(it.key)}
                        className="relative z-10 flex items-center gap-2 h-10 px-4 rounded-full text-sm font-bold whitespace-nowrap focus:outline-none"
                        style={{
                            color: active ? s.textOn : s.textOff,
                            transition: "color 220ms ease",
                        }}
                    >
                        {it.icon && <span className="flex-shrink-0">{it.icon}</span>}
                        {it.label}
                    </button>
                );
            })}
        </div>
    );
}

// ─────────────────────────────────────────────────────────────────────────────
// FOYDALANISH NAMUNASI (o'zingizga ko'chirib qo'ying):
//
//   "use client";
//   import { useState } from "react";
//   import { LiquidGlassNavbar } from "@/components/shared/liquid-glass-navbar";
//   import { Store, ShoppingBasket, Tag, Sparkles } from "lucide-react";
//
//   export function Demo() {
//       const [tab, setTab] = useState("bozorlar");
//       return (
//           <LiquidGlassNavbar
//               tint="light"          // yoki "dark"
//               accent="#B8860B"      // aktiv rangi (BN oltin)
//               value={tab}
//               onChange={setTab}
//               ariaLabel="Kategoriyalar"
//               items={[
//                   { key: "bozorlar",  label: "Bozorlar",  icon: <Store className="w-4 h-4" /> },
//                   { key: "dokonlar",  label: "Do'konlar", icon: <ShoppingBasket className="w-4 h-4" /> },
//                   { key: "arzon",     label: "Arzonlar",  icon: <Tag className="w-4 h-4" /> },
//                   { key: "aksiya",    label: "Aksiyalar", icon: <Sparkles className="w-4 h-4" /> },
//               ]}
//           />
//       );
//   }
//
// Fon rasm ustida ("shisha ostidan rasm ko'rinadi") ishlatish uchun:
//   <div style={{ background: "url(/bg.jpg) center/cover" }}>
//       <LiquidGlassNavbar ... />
//   </div>
// ─────────────────────────────────────────────────────────────────────────────
