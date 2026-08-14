"use client";

// Emoji burst — reaksiya qo'shilganda katta emoji sakraydigan animatsiya (Telegram uslub).
// Framer Motion allaqachon loyihada bor.
// Ishlatish: <NxReactionBurst emoji="❤️" x={100} y={200} onDone={...} />

import { motion, AnimatePresence } from "framer-motion";

export function NxReactionBurst({
    emoji, x, y, onDone,
}: {
    emoji: string;
    x: number;
    y: number;
    onDone?: () => void;
}) {
    return (
        <AnimatePresence>
            <motion.div
                key={`${emoji}-${x}-${y}`}
                initial={{ opacity: 0, scale: 0.3, y: 0 }}
                animate={{
                    opacity: [0, 1, 1, 0],
                    scale: [0.3, 1.5, 1.8, 0.5],
                    y: [-10, -60, -100, -140],
                }}
                exit={{ opacity: 0 }}
                transition={{ duration: 1.1, ease: "easeOut" }}
                onAnimationComplete={onDone}
                style={{
                    position: "fixed",
                    left: x, top: y,
                    fontSize: 40,
                    pointerEvents: "none",
                    zIndex: 500,
                    filter: "drop-shadow(0 4px 12px rgba(0,0,0,0.5))",
                }}
            >
                {emoji}
            </motion.div>
        </AnimatePresence>
    );
}

// Global controller — reaksiya qo'shilganda ekranda burst chiqarish uchun.
// Ishlatish: bir marta shell'ga <NxReactionBurstLayer /> qo'yish, va
// window.dispatchEvent(new CustomEvent("nx:reaction:burst", { detail: { emoji, x, y } }))
// chaqirish reaction toggle qilingan joyda.

import { useEffect, useState } from "react";

interface BurstItem { id: number; emoji: string; x: number; y: number }

export function NxReactionBurstLayer() {
    const [bursts, setBursts] = useState<BurstItem[]>([]);

    useEffect(() => {
        let counter = 0;
        function handler(e: Event) {
            const detail = (e as CustomEvent).detail as { emoji: string; x: number; y: number } | undefined;
            if (!detail?.emoji) return;
            counter++;
            const id = counter;
            setBursts(prev => [...prev, { id, emoji: detail.emoji, x: detail.x, y: detail.y }]);
            // Auto-cleanup 1.5s'da (animatsiya 1.1s'da tugaydi)
            setTimeout(() => {
                setBursts(prev => prev.filter(b => b.id !== id));
            }, 1500);
        }
        window.addEventListener("nx:reaction:burst", handler);
        return () => window.removeEventListener("nx:reaction:burst", handler);
    }, []);

    return (
        <>
            {bursts.map(b => (
                <NxReactionBurst key={b.id} emoji={b.emoji} x={b.x} y={b.y} />
            ))}
        </>
    );
}
