"use client";

import React, { useState } from "react";
import { 
    ChatsView, 
    GCinemaView, 
    VCinemaView, 
    MusicsView, 
    BlogsView, 
    GVideosView, 
    GStreamsView, 
    VVideosView, 
    VStreamsView, 
    HumoIDView 
} from "./nexus-views";
import { NexusBottomDock } from "./nexus-bottom-dock";
import { NexusSidebar } from "./nexus-sidebar";
import { NexusSettingsPanel } from "./nexus-settings-panel";
import { Search, Menu } from "lucide-react";
import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";
import { Link } from "@/i18n/routing";

interface NexusShellProps {
    children: React.ReactNode;
}

export function NexusShell({ children }: NexusShellProps) {
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    const [isSettingsOpen, setIsSettingsOpen] = useState(false);
    const [activeTab, setActiveTab] = useState("nexus");

    const renderContent = () => {
        switch (activeTab) {
            case "chats": return <ChatsView />;
            case "gcinema": return <GCinemaView />;
            case "vcinema": return <VCinemaView />;
            case "musics": return <MusicsView />;
            case "blogs": return <BlogsView />;
            case "gvideos": return <GVideosView />;
            case "gstreams": return <GStreamsView />;
            case "vvideos": return <VVideosView />;
            case "vstreams": return <VStreamsView />;
            case "humoid": return <HumoIDView />;
            case "nexus":
            default:
                return React.cloneElement(children as React.ReactElement, { onTabChange: setActiveTab } as any);
        }
    };

    return (
        <div className="min-h-screen bg-[#050505] text-white selection:bg-primary/30 selection:text-primary overflow-hidden flex flex-col relative">
            {/* Futuristic Gradient Background */}
            <div className="fixed inset-0 pointer-events-none">
                <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-blue-600/10 blur-[120px] rounded-full animate-pulse" />
                <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-primary/10 blur-[120px] rounded-full animate-pulse delay-1000" />
            </div>

            {/* Content Logo and Search (Previously in TopBar) */}
            <div className="container mx-auto px-4 md:px-6 pt-8 pb-4">
                <div className="flex flex-col md:flex-row items-center justify-between gap-6 mb-8">
                    <Link href="/" className="flex items-center gap-3 group">
                        <motion.div 
                            whileHover={{ rotate: 10, scale: 1.1 }}
                            className="relative w-12 h-12 overflow-hidden rounded-full shadow-lg shadow-primary/20 border border-white/10"
                        >
                            <Image src="/logo.png" alt="Logo" fill className="object-cover" priority />
                        </motion.div>
                        <span className="text-2xl font-bold tracking-tight text-white group-hover:text-primary transition-colors">
                            For Humo
                        </span>
                    </Link>

                    <div className="flex-1 max-w-2xl w-full">
                        <div className="relative group">
                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500 group-focus-within:text-primary transition-colors" />
                            <input 
                                type="text" 
                                placeholder="Search for content, creators, or agents..." 
                                className="w-full h-14 bg-white/5 border border-white/10 rounded-2xl pl-12 pr-4 outline-none focus:border-primary/50 focus:bg-white/10 transition-all text-sm font-medium shadow-inner"
                            />
                        </div>
                    </div>

                    <div className="flex items-center gap-3">
                        <motion.button 
                            onClick={() => setIsSidebarOpen(true)}
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            className="w-12 h-12 flex items-center justify-center rounded-2xl bg-white/5 border border-white/10 hover:bg-white/10 transition-colors"
                        >
                            <Menu className="w-6 h-6 text-white" />
                        </motion.button>
                    </div>
                </div>
            </div>

            {/* Main Content Area */}
            <main className="flex-1 overflow-y-auto custom-scrollbar pb-32">
                <div className="container mx-auto px-4 md:px-6">
                    {renderContent()}
                </div>
            </main>

            {/* Sidebar Toggle Panel */}
            <AnimatePresence>
                {isSidebarOpen && (
                    <NexusSidebar onClose={() => setIsSidebarOpen(false)} />
                )}
            </AnimatePresence>

            {/* Bottom Dock */}
            <NexusBottomDock activeTab={activeTab} onTabChange={setActiveTab} />

            {/* Settings Panel */}
            <AnimatePresence>
                {isSettingsOpen && (
                    <NexusSettingsPanel onClose={() => setIsSettingsOpen(false)} />
                )}
            </AnimatePresence>
            
            <style jsx global>{`
                .custom-scrollbar::-webkit-scrollbar {
                    width: 6px;
                }
                .custom-scrollbar::-webkit-scrollbar-track {
                    background: transparent;
                }
                .custom-scrollbar::-webkit-scrollbar-thumb {
                    background: rgba(255, 255, 255, 0.1);
                    border-radius: 10px;
                }
                .custom-scrollbar::-webkit-scrollbar-thumb:hover {
                    background: rgba(255, 255, 255, 0.2);
                }
                .glass-effect {
                    background: rgba(255, 255, 255, 0.03);
                    backdrop-filter: blur(12px);
                    -webkit-backdrop-filter: blur(12px);
                    border: 1px solid rgba(255, 255, 255, 0.05);
                }
                .glass-effect-heavy {
                    background: rgba(0, 0, 0, 0.6);
                    backdrop-filter: blur(20px);
                    -webkit-backdrop-filter: blur(20px);
                    border: 1px solid rgba(255, 255, 255, 0.1);
                }
            `}</style>
        </div>
    );
}
