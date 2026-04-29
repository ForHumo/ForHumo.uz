"use client";

import React, { useState } from "react";
import { NexusTopBar } from "./nexus-top-bar";
import { NexusBottomDock } from "./nexus-bottom-dock";
import { NexusSidebar } from "./nexus-sidebar";
import { NexusSettingsPanel } from "./nexus-settings-panel";
import { motion, AnimatePresence } from "framer-motion";

interface NexusShellProps {
    children: React.ReactNode;
}

export function NexusShell({ children }: NexusShellProps) {
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    const [isSettingsOpen, setIsSettingsOpen] = useState(false);

    return (
        <div className="min-h-screen bg-[#050505] text-white selection:bg-primary/30 selection:text-primary overflow-hidden flex flex-col relative">
            {/* Futuristic Gradient Background */}
            <div className="fixed inset-0 pointer-events-none">
                <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-blue-600/10 blur-[120px] rounded-full animate-pulse" />
                <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-primary/10 blur-[120px] rounded-full animate-pulse delay-1000" />
            </div>

            {/* Top Bar */}
            <NexusTopBar 
                onMenuClick={() => setIsSidebarOpen(!isSidebarOpen)} 
                onProfileClick={() => setIsSettingsOpen(true)}
            />

            {/* Main Content Area */}
            <main className="flex-1 overflow-y-auto custom-scrollbar pt-20 pb-32">
                <div className="container mx-auto px-4 md:px-6">
                    {children}
                </div>
            </main>

            {/* Sidebar Toggle Panel */}
            <AnimatePresence>
                {isSidebarOpen && (
                    <NexusSidebar onClose={() => setIsSidebarOpen(false)} />
                )}
            </AnimatePresence>

            {/* Bottom Dock */}
            <NexusBottomDock />

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
