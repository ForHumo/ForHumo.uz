"use client";

import { useRef } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

interface Props {
    title: string;
    onSeeAll?: () => void;
    children: React.ReactNode;
    accent?: string; // rang override
}

// ─────────────────────────────────────────────────────────────────────────────
// NxRow — Netflix uslubi gorizontal scroll qatori
// ─────────────────────────────────────────────────────────────────────────────
export function NxRow({ title, onSeeAll, children, accent }: Props) {
    const ref = useRef<HTMLDivElement>(null);

    const scroll = (dir: "l" | "r") => {
        if (!ref.current) return;
        ref.current.scrollBy({ left: dir === "r" ? 360 : -360, behavior: "smooth" });
    };

    return (
        <section className="group/row relative mt-6">

            {/* ── Sarlavha qatori ────────────────────────────────────── */}
            <div className="flex items-center justify-between px-4 mb-3">
                <div className="flex items-center gap-2.5">
                    {/* Gradient accent bar */}
                    <div
                        className="w-1 h-5 rounded-full flex-shrink-0"
                        style={{
                            background: accent ?? "linear-gradient(180deg,#2B3EE8,#00CEC8)",
                            boxShadow: `0 0 8px ${accent ? accent + "80" : "rgba(43,62,232,0.55)"}`,
                        }}
                    />
                    <h3 className="text-base md:text-lg font-black text-white tracking-tight">{title}</h3>
                </div>

                {onSeeAll && (
                    <button
                        onClick={onSeeAll}
                        className="flex items-center gap-1 text-[11px] font-bold transition-opacity duration-150 hover:opacity-70"
                        style={{
                            background: "linear-gradient(135deg,#2B3EE8,#00CEC8)",
                            WebkitBackgroundClip: "text",
                            WebkitTextFillColor: "transparent",
                            backgroundClip: "text",
                        }}
                    >
                        Barchasini ko'rish
                        <ChevronRight className="w-3.5 h-3.5 flex-shrink-0" style={{ color: "#00CEC8", WebkitTextFillColor: "unset" }} />
                    </button>
                )}
            </div>

            {/* ── Scroll tugmalari (hover da ko'rinadi) ─────────────── */}
            <button
                onClick={() => scroll("l")}
                className="absolute left-0 top-1/2 z-20 hidden md:flex items-center justify-center w-9 h-9 rounded-full -ml-4 opacity-0 group-hover/row:opacity-100 transition-all duration-200 active:scale-90"
                style={{
                    background: "rgba(5,8,24,0.90)",
                    backdropFilter: "blur(10px)",
                    border: "1px solid rgba(43,62,232,0.35)",
                    marginTop: "16px",
                }}
                onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = "linear-gradient(135deg,#2B3EE8,#00CEC8)"}
                onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = "rgba(5,8,24,0.90)"}
            >
                <ChevronLeft className="w-4 h-4 text-white" />
            </button>

            <button
                onClick={() => scroll("r")}
                className="absolute right-0 top-1/2 z-20 hidden md:flex items-center justify-center w-9 h-9 rounded-full -mr-4 opacity-0 group-hover/row:opacity-100 transition-all duration-200 active:scale-90"
                style={{
                    background: "rgba(5,8,24,0.90)",
                    backdropFilter: "blur(10px)",
                    border: "1px solid rgba(43,62,232,0.35)",
                    marginTop: "16px",
                }}
                onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = "linear-gradient(135deg,#2B3EE8,#00CEC8)"}
                onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = "rgba(5,8,24,0.90)"}
            >
                <ChevronRight className="w-4 h-4 text-white" />
            </button>

            {/* ── Kontent ────────────────────────────────────────────── */}
            <div
                ref={ref}
                className="flex items-start gap-3 md:gap-4 overflow-x-auto px-4 pb-2"
                style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
            >
                {children}
                <div className="flex-shrink-0 w-2" aria-hidden />
            </div>
        </section>
    );
}
