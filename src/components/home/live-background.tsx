"use client";

import { useEffect, useRef } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { useTheme } from "next-themes";

// ─────────────────────────────────────────────────────────────────────────────
// LiveBackground — bosh sahifaning jonli foni
//  • Canvas: yulduz turkumi (suzuvchi zarralar + bog'lovchi chiziqlar + kometa)
//  • Framer Motion: sekin nafas oluvchi aurora dog'lari
//  • Light/dark mavzuga moslanadi; prefers-reduced-motion'da statik kadr;
//    tab yashiringanda pauza; DPR ≤ 2 (performance)
// ─────────────────────────────────────────────────────────────────────────────

interface Particle {
    x: number; y: number; vx: number; vy: number;
    r: number; hue: number; ph: number; sp: number;
}
interface Comet { x: number; y: number; vx: number; vy: number; life: number; max: number }

const LINK = 120; // chiziq paydo bo'ladigan masofa (px)

export function LiveBackground() {
    const ref = useRef<HTMLCanvasElement>(null);
    const { resolvedTheme } = useTheme();
    const reduced = useReducedMotion();
    const dark = resolvedTheme !== "light";

    useEffect(() => {
        const cnv = ref.current;
        if (!cnv) return;
        const c2d = cnv.getContext("2d");
        if (!c2d) return;
        // Closure'lar uchun null'siz qayta bog'lash (TS narrowing nested funksiyaga o'tmaydi)
        const canvas: HTMLCanvasElement = cnv;
        const ctx: CanvasRenderingContext2D = c2d;

        let w = 0, h = 0;
        const dpr = Math.min(window.devicePixelRatio || 1, 2);
        let parts: Particle[] = [];
        let comets: Comet[] = [];
        let raf = 0;
        let last = performance.now();
        let nextComet = 4000 + Math.random() * 6000;
        const mouse = { x: -9e3, y: -9e3 };

        function build() {
            w = window.innerWidth; h = window.innerHeight;
            canvas.width = Math.round(w * dpr); canvas.height = Math.round(h * dpr);
            canvas.style.width = `${w}px`; canvas.style.height = `${h}px`;
            ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
            const n = Math.max(34, Math.min(110, Math.round((w * h) / 17000)));
            parts = Array.from({ length: n }, () => ({
                x: Math.random() * w, y: Math.random() * h,
                vx: (Math.random() - 0.5) * 0.22, vy: (Math.random() - 0.5) * 0.22,
                r: 0.8 + Math.random() * 1.8,
                hue: 196 + Math.random() * 28,   // ko'k ↔ moviy oraliq
                ph: Math.random() * Math.PI * 2, // miltillash fazasi
                sp: 0.4 + Math.random() * 1.2,   // miltillash tezligi
            }));
        }

        function draw(now: number, animate: boolean) {
            const dt = Math.min(50, now - last); last = now;
            ctx.clearRect(0, 0, w, h);
            const t = now / 1000;

            if (animate) {
                for (const p of parts) {
                    p.x += p.vx * dt * 0.06; p.y += p.vy * dt * 0.06;
                    // sichqonchadan yumshoq qochish
                    const dxm = p.x - mouse.x, dym = p.y - mouse.y;
                    const dm2 = dxm * dxm + dym * dym;
                    if (dm2 < 160 * 160 && dm2 > 0.01) {
                        const dm = Math.sqrt(dm2);
                        const f = ((160 - dm) / 160) * 0.6 * dt * 0.06;
                        p.x += (dxm / dm) * f; p.y += (dym / dm) * f;
                    }
                    if (p.x < -20) p.x = w + 20; else if (p.x > w + 20) p.x = -20;
                    if (p.y < -20) p.y = h + 20; else if (p.y > h + 20) p.y = -20;
                }
            }

            // Bog'lovchi chiziqlar
            ctx.lineWidth = 1;
            for (let i = 0; i < parts.length; i++) {
                for (let j = i + 1; j < parts.length; j++) {
                    const a = parts[i], b = parts[j];
                    const dx = a.x - b.x, dy = a.y - b.y;
                    const d2 = dx * dx + dy * dy;
                    if (d2 > LINK * LINK) continue;
                    const al = (1 - Math.sqrt(d2) / LINK) * (dark ? 0.16 : 0.10);
                    ctx.strokeStyle = dark ? `rgba(82,168,255,${al})` : `rgba(0,110,230,${al})`;
                    ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
                }
            }

            // Zarra nuqtalari (miltillab)
            for (const p of parts) {
                const tw = 0.55 + 0.45 * Math.sin(t * p.sp + p.ph);
                const al = (dark ? 0.75 : 0.5) * tw + 0.12;
                ctx.fillStyle = `hsla(${p.hue}, 95%, ${dark ? 66 : 42}%, ${al})`;
                ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2); ctx.fill();
            }

            // Kometa — vaqti-vaqti bilan uchib o'tadi
            if (animate) {
                nextComet -= dt;
                if (nextComet <= 0) {
                    nextComet = 7000 + Math.random() * 9000;
                    const fromLeft = Math.random() < 0.5;
                    comets.push({
                        x: fromLeft ? -40 : w + 40, y: Math.random() * h * 0.5,
                        vx: (fromLeft ? 1 : -1) * (0.45 + Math.random() * 0.3),
                        vy: 0.18 + Math.random() * 0.12,
                        life: 0, max: 2600,
                    });
                }
                comets = comets.filter(c => c.life < c.max && c.x > -80 && c.x < w + 80);
                for (const c of comets) {
                    c.life += dt; c.x += c.vx * dt; c.y += c.vy * dt;
                    const fade = Math.sin(Math.PI * Math.min(1, c.life / c.max));
                    const tx = c.x - c.vx * 240, ty = c.y - c.vy * 240;
                    const g = ctx.createLinearGradient(c.x, c.y, tx, ty);
                    g.addColorStop(0, dark ? `rgba(170,220,255,${0.85 * fade})` : `rgba(0,120,255,${0.5 * fade})`);
                    g.addColorStop(1, "rgba(0,136,255,0)");
                    ctx.strokeStyle = g; ctx.lineWidth = 1.6;
                    ctx.beginPath(); ctx.moveTo(c.x, c.y); ctx.lineTo(tx, ty); ctx.stroke();
                }
            }
        }

        function frame(now: number) {
            draw(now, true);
            raf = requestAnimationFrame(frame);
        }

        build();
        if (reduced) {
            draw(performance.now(), false); // bitta statik kadr
        } else {
            raf = requestAnimationFrame(frame);
        }

        const onResize = () => { build(); if (reduced) draw(performance.now(), false); };
        const onMouse = (e: MouseEvent) => { mouse.x = e.clientX; mouse.y = e.clientY; };
        const onLeave = () => { mouse.x = -9e3; mouse.y = -9e3; };
        const onVis = () => {
            if (reduced) return;
            cancelAnimationFrame(raf);
            if (!document.hidden) { last = performance.now(); raf = requestAnimationFrame(frame); }
        };
        window.addEventListener("resize", onResize);
        window.addEventListener("mousemove", onMouse);
        window.addEventListener("mouseout", onLeave);
        document.addEventListener("visibilitychange", onVis);
        return () => {
            cancelAnimationFrame(raf);
            window.removeEventListener("resize", onResize);
            window.removeEventListener("mousemove", onMouse);
            window.removeEventListener("mouseout", onLeave);
            document.removeEventListener("visibilitychange", onVis);
        };
    }, [dark, reduced]);

    return (
        <div className="fixed inset-0 z-0 overflow-hidden pointer-events-none" aria-hidden>
            {/* Aurora dog'lari — sekin nafas oladi */}
            <motion.div
                className="absolute rounded-full opacity-40 dark:opacity-60"
                style={{
                    width: "55vmax", height: "55vmax", top: "-18%", left: "-12%",
                    background: "radial-gradient(circle at 50% 50%, rgba(0,136,255,0.30), transparent 65%)",
                    filter: "blur(60px)",
                }}
                animate={reduced ? undefined : { x: [0, 60, -30, 0], y: [0, 40, 80, 0], scale: [1, 1.12, 0.96, 1] }}
                transition={{ duration: 26, repeat: Infinity, ease: "easeInOut" }}
            />
            <motion.div
                className="absolute rounded-full opacity-35 dark:opacity-55"
                style={{
                    width: "48vmax", height: "48vmax", bottom: "-20%", right: "-10%",
                    background: "radial-gradient(circle at 50% 50%, rgba(0,206,200,0.26), transparent 65%)",
                    filter: "blur(60px)",
                }}
                animate={reduced ? undefined : { x: [0, -50, 30, 0], y: [0, -60, -20, 0], scale: [1, 0.94, 1.1, 1] }}
                transition={{ duration: 32, repeat: Infinity, ease: "easeInOut" }}
            />
            <motion.div
                className="absolute rounded-full opacity-25 dark:opacity-35"
                style={{
                    width: "42vmax", height: "42vmax", top: "30%", left: "30%",
                    background: "radial-gradient(circle at 50% 50%, rgba(99,102,241,0.22), transparent 65%)",
                    filter: "blur(70px)",
                }}
                animate={reduced ? undefined : { x: [0, 40, -40, 0], y: [0, -30, 40, 0] }}
                transition={{ duration: 38, repeat: Infinity, ease: "easeInOut" }}
            />

            {/* Yulduz turkumi canvas */}
            <canvas ref={ref} className="absolute inset-0" />

            {/* Nuqtali to'r — markazga maskalangan */}
            <div
                className="absolute inset-0 hidden dark:block"
                style={{
                    backgroundImage: "radial-gradient(circle, rgba(96,165,250,0.10) 1px, transparent 1px)",
                    backgroundSize: "34px 34px",
                    maskImage: "radial-gradient(ellipse 75% 70% at 50% 38%, black 35%, transparent 100%)",
                    WebkitMaskImage: "radial-gradient(ellipse 75% 70% at 50% 38%, black 35%, transparent 100%)",
                }}
            />
            <div
                className="absolute inset-0 dark:hidden"
                style={{
                    backgroundImage: "radial-gradient(circle, rgba(0,110,230,0.07) 1px, transparent 1px)",
                    backgroundSize: "34px 34px",
                    maskImage: "radial-gradient(ellipse 75% 70% at 50% 38%, black 35%, transparent 100%)",
                    WebkitMaskImage: "radial-gradient(ellipse 75% 70% at 50% 38%, black 35%, transparent 100%)",
                }}
            />
        </div>
    );
}
