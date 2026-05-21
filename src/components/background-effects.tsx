"use client";

import { useEffect, useState } from "react";

const BLOBS = [
    { left: "8%",  top: "10%", size: 260, dur: 18, delay: 0,  dx: 40,  dy: 28,  rx: "60% 37% 44% 57% / 44% 56% 63% 37%" },
    { left: "62%", top: "5%",  size: 200, dur: 22, delay: 3,  dx: -32, dy: 36,  rx: "43% 65% 52% 41% / 57% 38% 67% 52%" },
    { left: "78%", top: "55%", size: 300, dur: 26, delay: 6,  dx: -44, dy: -28, rx: "55% 44% 66% 38% / 40% 62% 44% 58%" },
    { left: "5%",  top: "60%", size: 220, dur: 20, delay: 9,  dx: 36,  dy: -40, rx: "38% 55% 47% 63% / 62% 43% 55% 40%" },
    { left: "40%", top: "75%", size: 180, dur: 24, delay: 4,  dx: 28,  dy: -20, rx: "52% 40% 62% 46% / 48% 60% 38% 55%" },
    { left: "25%", top: "35%", size: 140, dur: 30, delay: 12, dx: -24, dy: 18,  rx: "46% 62% 38% 56% / 55% 40% 58% 44%" },
];

export function BackgroundEffects() {
    const [isDesktop, setIsDesktop] = useState(false);

    useEffect(() => {
        const mq = window.matchMedia("(min-width: 768px)");
        setIsDesktop(mq.matches);
        const handler = (e: MediaQueryListEvent) => setIsDesktop(e.matches);
        mq.addEventListener("change", handler);
        return () => mq.removeEventListener("change", handler);
    }, []);

    return (
        <div className="fixed inset-0 -z-50 overflow-hidden pointer-events-none">

            {/* Light mode — static gradients (always) */}
            <div className="absolute inset-0 dark:hidden" style={{
                background: "radial-gradient(ellipse 70% 65% at 50% 42%, transparent 0%, rgba(30,80,160,0.13) 55%, rgba(20,60,130,0.28) 100%)",
            }} />
            <div className="absolute inset-0 dark:hidden" style={{
                background: "linear-gradient(160deg, rgba(100,180,255,0.18) 0%, transparent 50%, rgba(40,100,200,0.14) 100%)",
            }} />

            {/* Light mode — animated blobs (desktop only) */}
            {isDesktop && BLOBS.map((b, i) => (
                <div
                    key={i}
                    className="bg-blob dark:hidden"
                    style={{
                        left: b.left, top: b.top,
                        width: b.size, height: b.size,
                        borderRadius: b.rx,
                        "--dur":   `${b.dur}s`,
                        "--delay": `${b.delay}s`,
                        "--dx":    `${b.dx}px`,
                        "--dy":    `${b.dy}px`,
                    } as React.CSSProperties}
                />
            ))}

            {/* Dark mode — static gradient mobile */}
            <div className="absolute inset-0 hidden dark:block md:hidden" style={{
                background: "radial-gradient(ellipse 80% 60% at 20% 30%, rgba(59,130,246,0.12) 0%, transparent 70%), radial-gradient(ellipse 60% 50% at 80% 70%, rgba(139,92,246,0.07) 0%, transparent 70%)",
            }} />

            {/* Dark mode — animated orbs (desktop only) */}
            {isDesktop && (
                <>
                    <div className="bg-orb-1 absolute -top-[20%] -left-[10%] w-[50vw] h-[50vw] rounded-full hidden dark:block bg-blue-500/20 blur-[100px]" />
                    <div className="bg-orb-2 absolute top-[40%] -right-[10%] w-[55vw] h-[55vw] rounded-full hidden dark:block bg-purple-500/10 blur-[120px]" />
                </>
            )}
        </div>
    );
}
