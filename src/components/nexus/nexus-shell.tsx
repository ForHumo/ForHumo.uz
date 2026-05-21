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
        <div className="w-full h-full flex flex-col overflow-hidden bg-[#050505] text-white select-none">

            {/* ── Gradient background blobs ─────────────────────────── */}
            <div className="fixed inset-0 pointer-events-none z-0" aria-hidden>
                <div className="absolute top-[-8%] left-[-8%] w-[45%] h-[45%] bg-blue-600/10 blur-[120px] rounded-full animate-pulse" />
                <div className="absolute bottom-[-8%] right-[-8%] w-[45%] h-[45%] bg-primary/10 blur-[120px] rounded-full animate-pulse [animation-delay:1000ms]" />
            </div>

            {/* ── Top bar ───────────────────────────────────────────── */}
            <header className="relative z-10 flex-shrink-0 border-b border-white/5">
                <div className="flex items-center gap-4 px-4 md:px-6 py-3">

                    {/* Logo */}
                    <Link href="/" className="flex items-center gap-2.5 group flex-shrink-0">
                        <div className="relative w-9 h-9 overflow-hidden rounded-full border border-white/10 shadow-lg shadow-primary/20 group-hover:border-primary/40 transition-colors duration-200">
                            <Image src="/logo.png" alt="For Humo" fill className="object-cover" priority />
                        </div>
                        <span className="hidden md:block text-lg font-bold tracking-tight group-hover:text-primary transition-colors duration-200">
                            Nexus
                        </span>
                    </Link>

                    {/* Search */}
                    <div className="flex-1 max-w-2xl relative group">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500 group-focus-within:text-primary transition-colors duration-150 pointer-events-none" />
                        <input
                            type="text"
                            placeholder="Kontent, ijodkor yoki agent qidirish..."
                            className="w-full h-11 bg-white/5 border border-white/8 rounded-2xl pl-11 pr-4 outline-none focus:border-primary/40 focus:bg-white/8 transition-all text-sm placeholder:text-gray-600"
                        />
                    </div>

                    {/* Menu */}
                    <button
                        onClick={() => setIsSidebarOpen(true)}
                        className="flex-shrink-0 w-10 h-10 flex items-center justify-center rounded-2xl bg-white/5 border border-white/8 hover:bg-white/10 hover:border-white/15 transition-all duration-150 active:scale-95"
                    >
                        <Menu className="w-5 h-5" />
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
