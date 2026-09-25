"use client";

// Humo AI — qora cosmic fon + uchib yuruvchi mayda yulduzlar (konstellyatsiya).
// Eski iframe AI'dagi (public/ai-static) sevimli fon — native React'ga port qilingan.
// Yaqin yulduzlar chiziq bilan bog'lanadi, sekin uchadi, chetdan qaytadi.
// z-0, pointer-events yo'q — butun chat ustidan ko'rinadi. Fixed (scroll'da qimirlamaydi).

import { useEffect, useRef } from "react";

interface Pt { x: number; y: number; vx: number; vy: number; r: number; o: number }

export function AiStarfield() {
    const ref = useRef<HTMLCanvasElement>(null);

    useEffect(() => {
        const cv = ref.current;
        if (!cv) return;
        const cx = cv.getContext("2d");
        if (!cx) return;

        let W = 0, H = 0, pts: Pt[] = [], raf = 0;
        const RGB = "255,255,255"; // oq yulduzlar (qora cosmic fon ustida)

        const resize = () => {
            W = cv.width = window.innerWidth;
            H = cv.height = window.innerHeight;
            pts = [];
            const n = Math.min(70, Math.floor((W * H) / 14000));
            for (let i = 0; i < n; i++) {
                pts.push({
                    x: Math.random() * W, y: Math.random() * H,
                    vx: (Math.random() - 0.5) * 0.35, vy: (Math.random() - 0.5) * 0.35,
                    r: Math.random() * 1.7 + 0.6, o: Math.random() * 0.32 + 0.08,
                });
            }
        };

        const draw = () => {
            cx.clearRect(0, 0, W, H);
            // Yaqin nuqtalarni bog'lovchi chiziqlar (konstellyatsiya to'ri)
            for (let i = 0; i < pts.length; i++) {
                for (let j = i + 1; j < pts.length; j++) {
                    const dx = pts[i].x - pts[j].x, dy = pts[i].y - pts[j].y;
                    const d = Math.sqrt(dx * dx + dy * dy);
                    if (d < 130) {
                        cx.beginPath();
                        cx.strokeStyle = `rgba(${RGB},${(1 - d / 130) * 0.045})`;
                        cx.lineWidth = 0.5;
                        cx.moveTo(pts[i].x, pts[i].y);
                        cx.lineTo(pts[j].x, pts[j].y);
                        cx.stroke();
                    }
                }
            }
            // Yulduzlar
            for (const p of pts) {
                cx.beginPath();
                cx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
                cx.fillStyle = `rgba(${RGB},${p.o})`;
                cx.fill();
                p.x += p.vx; p.y += p.vy;
                if (p.x < -5 || p.x > W + 5) p.vx *= -1;
                if (p.y < -5 || p.y > H + 5) p.vy *= -1;
            }
            raf = requestAnimationFrame(draw);
        };

        resize();
        draw();
        window.addEventListener("resize", resize);
        return () => {
            cancelAnimationFrame(raf);
            window.removeEventListener("resize", resize);
        };
    }, []);

    return (
        <div
            aria-hidden
            className="fixed inset-0 z-0 pointer-events-none"
            style={{ background: "#0d0d0d" }}
        >
            <canvas ref={ref} className="absolute inset-0 h-full w-full" />
        </div>
    );
}
