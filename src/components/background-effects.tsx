"use client";

import { motion } from "framer-motion";

// Floating organic blob for light mode
function Blob({
    initialX, initialY, size, duration, delay,
    rx1, ry1, rx2, ry2, rx3, ry3, rx4, ry4,
    driftX, driftY,
}: {
    initialX: string; initialY: string; size: number; duration: number; delay: number;
    rx1: number; ry1: number; rx2: number; ry2: number;
    rx3: number; ry3: number; rx4: number; ry4: number;
    driftX: number; driftY: number;
}) {
    return (
        <motion.div
            className="absolute dark:hidden pointer-events-none"
            style={{
                left: initialX,
                top: initialY,
                width: size,
                height: size,
                background: "rgba(255,255,255,0.45)",
                borderRadius: `${rx1}% ${rx2}% ${rx3}% ${rx4}% / ${ry1}% ${ry2}% ${ry3}% ${ry4}%`,
                filter: "blur(2px)",
            }}
            animate={{
                x: [0, driftX, driftX / 2, 0],
                y: [0, driftY / 2, driftY, 0],
                rotate: [0, 8, -5, 0],
                scale: [1, 1.06, 0.97, 1],
                opacity: [0.55, 0.75, 0.6, 0.55],
            }}
            transition={{
                duration,
                delay,
                repeat: Infinity,
                ease: "easeInOut",
            }}
        />
    );
}

export function BackgroundEffects() {
    return (
        <div className="fixed inset-0 -z-50 overflow-hidden pointer-events-none">

            {/* ── LIGHT MODE ONLY ───────────────────────────────────────── */}

            {/* Radial vignette — center lighter, edges darker blue */}
            <div
                className="absolute inset-0 dark:hidden"
                style={{
                    background:
                        "radial-gradient(ellipse 70% 65% at 50% 42%, transparent 0%, rgba(30,80,160,0.13) 55%, rgba(20,60,130,0.28) 100%)",
                }}
            />

            {/* Soft directional blue wash */}
            <div
                className="absolute inset-0 dark:hidden"
                style={{
                    background:
                        "linear-gradient(160deg, rgba(100,180,255,0.18) 0%, transparent 50%, rgba(40,100,200,0.14) 100%)",
                }}
            />

            {/* Floating blobs — irregular white shapes */}
            <Blob initialX="8%"  initialY="10%" size={260} duration={18} delay={0}   rx1={60} ry1={44} rx2={37} ry2={56} rx3={44} ry3={63} rx4={57} ry4={37} driftX={40}  driftY={28}  />
            <Blob initialX="62%" initialY="5%"  size={200} duration={22} delay={3}   rx1={43} ry1={57} rx2={65} ry2={38} rx3={52} ry3={67} rx4={41} ry4={52} driftX={-32} driftY={36}  />
            <Blob initialX="78%" initialY="55%" size={300} duration={26} delay={6}   rx1={55} ry1={40} rx2={44} ry2={62} rx3={66} ry3={44} rx4={38} ry4={58} driftX={-44} driftY={-28} />
            <Blob initialX="5%"  initialY="60%" size={220} duration={20} delay={9}   rx1={38} ry1={62} rx2={55} ry2={43} rx3={47} ry3={55} rx4={63} ry4={40} driftX={36}  driftY={-40} />
            <Blob initialX="40%" initialY="75%" size={180} duration={24} delay={4}   rx1={52} ry1={48} rx2={40} ry2={60} rx3={62} ry3={38} rx4={46} ry4={55} driftX={28}  driftY={-20} />
            <Blob initialX="25%" initialY="35%" size={140} duration={30} delay={12}  rx1={46} ry1={55} rx2={62} ry2={40} rx3={38} ry3={58} rx4={56} ry4={44} driftX={-24} driftY={18}  />

            {/* ── DARK MODE ONLY ────────────────────────────────────────── */}

            {/* Top-left blue orb */}
            <motion.div
                animate={{
                    opacity: [0.25, 0.42, 0.25],
                    scale: [1, 1.12, 1],
                    x: [0, 28, 0],
                    y: [0, -24, 0],
                }}
                transition={{ duration: 14, repeat: Infinity, ease: "easeInOut" }}
                className="absolute -top-[20%] -left-[10%] w-[50vw] h-[50vw] rounded-full hidden dark:block
                    bg-blue-500/20 blur-[100px]"
            />

            {/* Bottom-right cyan/purple orb */}
            <motion.div
                animate={{
                    opacity: [0.15, 0.3, 0.15],
                    scale: [1, 1.18, 1],
                    x: [0, -36, 0],
                    y: [0, 36, 0],
                }}
                transition={{ duration: 18, repeat: Infinity, ease: "easeInOut", delay: 2 }}
                className="absolute top-[40%] -right-[10%] w-[55vw] h-[55vw] rounded-full hidden dark:block
                    bg-purple-500/10 blur-[120px]"
            />
        </div>
    );
}
