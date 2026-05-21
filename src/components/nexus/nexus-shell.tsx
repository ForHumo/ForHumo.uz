"use client";

import { useState } from "react";
import { Search, Menu } from "lucide-react";
import Image from "next/image";
import { Link } from "@/i18n/routing";
import { NexusFeed } from "./nexus-feed";
import { NexusBottomDock } from "./nexus-bottom-dock";
import { NexusSidebar } from "./nexus-sidebar";
import { NexusSettingsPanel } from "./nexus-settings-panel";
import {
    ChatsView, GCinemaView, VCinemaView, MusicsView, BlogsView,
    GVideosView, GStreamsView, VVideosView, VStreamsView, HumoIDView,
} from "./nexus-views";

type Tab =
    | "nexus" | "chats" | "gcinema" | "vcinema"
    | "musics" | "blogs" | "gvideos" | "gstreams"
    | "vvideos" | "vstreams" | "humoid";

function renderView(tab: Tab, onTabChange: (t: string) => void) {
    switch (tab) {
        case "chats":    return <ChatsView />;
        case "gcinema":  return <GCinemaView />;
        case "vcinema":  return <VCinemaView />;
        case "musics":   return <MusicsView />;
        case "blogs":    return <BlogsView />;
        case "gvideos":  return <GVideosView />;
        case "gstreams": return <GStreamsView />;
        case "vvideos":  return <VVideosView />;
        case "vstreams": return <VStreamsView />;
        case "humoid":   return <HumoIDView />;
        default:         return <NexusFeed onTabChange={onTabChange} />;
    }
}

export function NexusShell() {
    const [activeTab,      setActiveTab]      = useState<Tab>("nexus");
    const [isSidebarOpen,  setIsSidebarOpen]  = useState(false);
    const [isSettingsOpen, setIsSettingsOpen] = useState(false);

    return (
        <div className="w-full h-full flex flex-col overflow-hidden bg-[#060B1A] text-white select-none">

            {/* ── Ambient gradient orbs ──────────────────────────────── */}
            <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden" aria-hidden>
                {/* Top-left — deep blue */}
                <div className="absolute -top-[20%] -left-[10%] w-[55%] h-[55%] rounded-full"
                    style={{ background: "radial-gradient(circle, rgba(43,62,232,0.18) 0%, transparent 70%)" }} />
                {/* Bottom-right — cyan */}
                <div className="absolute -bottom-[20%] -right-[10%] w-[55%] h-[55%] rounded-full"
                    style={{ background: "radial-gradient(circle, rgba(0,206,200,0.12) 0%, transparent 70%)" }} />
                {/* Center glow — subtle */}
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[40%] h-[30%] rounded-full"
                    style={{ background: "radial-gradient(ellipse, rgba(43,62,232,0.06) 0%, transparent 70%)" }} />
            </div>

            {/* ── Top bar ───────────────────────────────────────────── */}
            <header className="relative z-10 flex-shrink-0"
                style={{ borderBottom: "1px solid rgba(43,62,232,0.20)", background: "rgba(6,11,26,0.70)", backdropFilter: "blur(16px)" }}>
                <div className="flex items-center gap-4 px-4 md:px-6 py-3">

                    {/* Logo */}
                    <Link href="/" className="flex items-center gap-2.5 group flex-shrink-0">
                        <div className="relative w-9 h-9 overflow-hidden rounded-full shadow-lg flex-shrink-0"
                            style={{ padding: "2px", background: "linear-gradient(135deg,#2B3EE8,#00CEC8)" }}>
                            <div className="w-full h-full rounded-full overflow-hidden bg-[#060B1A]">
                                <Image src="/logo.png" alt="For Humo" fill className="object-cover" priority />
                            </div>
                        </div>
                        <span className="hidden md:block text-lg font-bold tracking-tight nx-gradient-text">
                            Nexus
                        </span>
                    </Link>

                    {/* Search */}
                    <div className="flex-1 max-w-2xl relative group">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-[#4a5a8a] group-focus-within:text-[#2B3EE8] transition-colors duration-150 pointer-events-none" />
                        <input
                            type="text"
                            placeholder="Kontent, ijodkor yoki agent qidirish..."
                            className="w-full h-11 rounded-2xl pl-11 pr-4 outline-none text-sm placeholder:text-[#3a4a6a] transition-all duration-200"
                            style={{
                                background: "rgba(11,20,45,0.50)",
                                border: "1px solid rgba(43,62,232,0.22)",
                            }}
                            onFocus={e => {
                                e.currentTarget.style.border = "1px solid rgba(43,62,232,0.55)";
                                e.currentTarget.style.background = "rgba(11,20,45,0.70)";
                            }}
                            onBlur={e => {
                                e.currentTarget.style.border = "1px solid rgba(43,62,232,0.22)";
                                e.currentTarget.style.background = "rgba(11,20,45,0.50)";
                            }}
                        />
                    </div>

                    {/* Menu */}
                    <button
                        onClick={() => setIsSidebarOpen(true)}
                        className="flex-shrink-0 w-10 h-10 flex items-center justify-center rounded-2xl transition-all duration-150 active:scale-95"
                        style={{ background: "rgba(43,62,232,0.12)", border: "1px solid rgba(43,62,232,0.25)" }}
                        onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = "rgba(43,62,232,0.22)"; }}
                        onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = "rgba(43,62,232,0.12)"; }}
                    >
                        <Menu className="w-5 h-5 text-[#a0b0e0]" />
                    </button>
                </div>
            </header>

            {/* ── Main content area ─────────────────────────────────── */}
            <main className="relative z-10 flex-1 overflow-y-auto nx-scrollbar">
                <div className="container mx-auto px-4 md:px-6 pt-5 pb-28">
                    {renderView(activeTab, (t) => setActiveTab(t as Tab))}
                </div>
            </main>

            {/* ── Bottom dock ───────────────────────────────────────── */}
            <NexusBottomDock activeTab={activeTab} onTabChange={(t) => setActiveTab(t as Tab)} />

            {/* ── Sidebar (always in DOM — CSS transition) ─────────── */}
            <NexusSidebar
                isOpen={isSidebarOpen}
                onClose={() => setIsSidebarOpen(false)}
                onOpenSettings={() => {
                    setIsSidebarOpen(false);
                    setIsSettingsOpen(true);
                }}
            />

            {/* ── Settings panel (always in DOM — CSS transition) ───── */}
            <NexusSettingsPanel
                isOpen={isSettingsOpen}
                onClose={() => setIsSettingsOpen(false)}
            />
        </div>
    );
}
