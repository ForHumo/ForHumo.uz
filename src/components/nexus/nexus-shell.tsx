"use client";

import { useState } from "react";
import { NxHeader } from "./nx-header";
import { NxDock, type NxTab } from "./nx-dock";
import { NxStories } from "./nx-stories";

// ─────────────────────────────────────────────────────────────────────────────
// NexusShell — asosiy qobiq
// ─────────────────────────────────────────────────────────────────────────────
export function NexusShell() {
    const [activeTab, setActiveTab] = useState<NxTab>("feed");

    return (
        <div
            className="w-full h-full flex flex-col overflow-hidden text-white select-none"
            style={{ background: "#050818" }}
        >
            {/* ── Ambient background ────────────────────────────────── */}
            <NexusBackground />

            {/* ── 2-qadam: Header ───────────────────────────────────── */}
            <NxHeader />

            {/* ── Asosiy kontent ────────────────────────────────────── */}
            <main className="relative z-10 flex-1 overflow-y-auto">

                {/* ── 4-qadam: Stories Bar ──────────────────────────── */}
                <NxStories />

                {/* 5-qadam: Hero Banner */}
                {/* 6-qadam: Content Rows */}
            </main>

            {/* ── 3-qadam: Dock ─────────────────────────────────────── */}
            <NxDock active={activeTab} onChange={setActiveTab} />
        </div>
    );
}

// ─────────────────────────────────────────────────────────────────────────────
// Fon
// ─────────────────────────────────────────────────────────────────────────────
function NexusBackground() {
    return (
        <div className="fixed inset-0 pointer-events-none overflow-hidden" aria-hidden>

            <div className="absolute" style={{
                top: "-15%", left: "-10%", width: "60%", height: "60%",
                background: "radial-gradient(ellipse at center, rgba(43,62,232,0.22) 0%, rgba(43,62,232,0.08) 40%, transparent 70%)",
            }} />

            <div className="absolute" style={{
                bottom: "-15%", right: "-10%", width: "60%", height: "60%",
                background: "radial-gradient(ellipse at center, rgba(0,206,200,0.18) 0%, rgba(0,206,200,0.06) 40%, transparent 70%)",
            }} />

            <div className="absolute" style={{
                top: "30%", left: "25%", width: "50%", height: "40%",
                background: "radial-gradient(ellipse at center, rgba(43,62,232,0.06) 0%, transparent 70%)",
            }} />

            <div className="absolute inset-0" style={{
                backgroundImage: "radial-gradient(circle, rgba(43,62,232,0.12) 1px, transparent 1px)",
                backgroundSize: "32px 32px",
                maskImage: "radial-gradient(ellipse 80% 80% at 50% 50%, black 40%, transparent 100%)",
                WebkitMaskImage: "radial-gradient(ellipse 80% 80% at 50% 50%, black 40%, transparent 100%)",
            }} />
        </div>
    );
}
