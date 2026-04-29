"use client";

import React from "react";
import { Search, Bell, User, Menu, Hexagon } from "lucide-react";
import { motion } from "framer-motion";

interface NexusTopBarProps {
    onMenuClick: () => void;
    onProfileClick: () => void;
}

export function NexusTopBar({ onMenuClick, onProfileClick }: NexusTopBarProps) {
    return (
        <header className="fixed top-0 left-0 right-0 h-20 z-50 glass-effect border-b border-white/5 flex items-center justify-between px-6">
            {/* Left: Logo */}
            <div className="flex items-center gap-3">
                <motion.div 
                    whileHover={{ rotate: 180 }}
                    transition={{ duration: 0.5 }}
                    className="w-10 h-10 bg-primary/20 rounded-xl flex items-center justify-center border border-primary/30 shadow-[0_0_20px_rgba(var(--primary-rgb),0.3)]"
                >
                    <Hexagon className="w-6 h-6 text-primary fill-primary/20" />
                </motion.div>
                <span className="text-xl font-bold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-white to-gray-400">
                    NEXUS
                </span>
            </div>

            {/* Center: Search Bar */}
            <div className="hidden md:flex items-center flex-1 max-w-2xl mx-12">
                <div className="relative w-full group">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500 group-focus-within:text-primary transition-colors" />
                    <input 
                        type="text" 
                        placeholder="Search for content, creators, or agents..." 
                        className="w-full h-12 bg-white/5 border border-white/10 rounded-2xl pl-12 pr-4 outline-none focus:border-primary/50 focus:bg-white/10 transition-all text-sm font-medium"
                    />
                    <div className="absolute right-3 top-1/2 -translate-y-1/2 bg-white/5 px-2 py-1 rounded-lg border border-white/10 text-[10px] text-gray-500 pointer-events-none">
                        ⌘K
                    </div>
                </div>
            </div>

            {/* Right: Icons */}
            <div className="flex items-center gap-2 md:gap-4">
                <motion.button 
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    className="w-10 h-10 flex items-center justify-center rounded-xl hover:bg-white/5 transition-colors relative"
                >
                    <Bell className="w-5 h-5 text-gray-300" />
                    <span className="absolute top-2 right-2 w-2 h-2 bg-primary rounded-full shadow-[0_0_10px_rgba(var(--primary-rgb),0.5)]" />
                </motion.button>
                
                <motion.button 
                    onClick={onProfileClick}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    className="w-10 h-10 flex items-center justify-center rounded-xl hover:bg-white/5 transition-colors"
                >
                    <User className="w-5 h-5 text-gray-300" />
                </motion.button>

                <motion.button 
                    onClick={onMenuClick}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    className="w-10 h-10 flex items-center justify-center rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 transition-colors"
                >
                    <Menu className="w-5 h-5 text-white" />
                </motion.button>
            </div>
        </header>
    );
}
