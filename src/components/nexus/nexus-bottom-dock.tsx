"use client";

import React, { useState } from "react";
import { 
    LayoutGrid, 
    MessageCircle, 
    Film, 
    Music, 
    FileText, 
    Youtube, 
    Radio, 
    Smartphone, 
    Video, 
    User 
} from "lucide-react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

const DOCK_ITEMS = [
    { id: "nexus", icon: LayoutGrid, label: "Nexus" },
    { id: "chats", icon: MessageCircle, label: "Chats" },
    { id: "gcinema", icon: Film, label: "G. Cinema" },
    { id: "vcinema", icon: Video, label: "V. Cinema" },
    { id: "musics", icon: Music, label: "Musics" },
    { id: "blogs", icon: FileText, label: "Blogs" },
    { id: "gvideos", icon: Youtube, label: "G. Videos" },
    { id: "gstreams", icon: Radio, label: "G. Streams" },
    { id: "vvideos", icon: Smartphone, label: "V. Videos" },
    { id: "vstreams", icon: Video, label: "V. Streams" },
    { id: "humoid", icon: User, label: "Humo ID" },
];

interface NexusBottomDockProps {
    activeTab: string;
    onTabChange: (tab: string) => void;
}

export function NexusBottomDock({ activeTab, onTabChange }: NexusBottomDockProps) {

    return (
        <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-50">
            <motion.div 
                initial={{ y: 100, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                className="glass-effect-heavy px-4 py-3 rounded-[2.5rem] flex items-center gap-1 md:gap-2 shadow-[0_20px_50px_rgba(0,0,0,0.5)] border border-white/10"
            >
                {DOCK_ITEMS.map((item) => {
                    const Icon = item.icon;
                    const isActive = activeTab === item.id;
                    
                    return (
                        <motion.button
                            key={item.id}
                            onClick={() => onTabChange(item.id)}
                            whileHover={{ scale: 1.1, y: -5 }}
                            whileTap={{ scale: 0.9 }}
                            className={cn(
                                "relative w-10 h-10 md:w-12 md:h-12 flex flex-col items-center justify-center rounded-2xl transition-all group",
                                isActive ? "bg-primary/20 text-primary shadow-[0_0_20px_rgba(var(--primary-rgb),0.3)]" : "text-gray-400 hover:text-white"
                            )}
                        >
                            <Icon className={cn(
                                "w-5 h-5 md:w-6 md:h-6 transition-all",
                                isActive ? "scale-110 drop-shadow-[0_0_8px_rgba(var(--primary-rgb),0.8)]" : ""
                            )} />
                            
                            {/* Tooltip on hover */}
                            <div className="absolute -top-12 left-1/2 -translate-x-1/2 px-3 py-1.5 bg-black/80 backdrop-blur-md rounded-lg text-[10px] font-bold text-white opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none border border-white/10 whitespace-nowrap">
                                {item.label}
                            </div>
                            
                            {/* Active Dot */}
                            {isActive && (
                                <motion.div 
                                    layoutId="active-dot"
                                    className="absolute -bottom-1 w-1 h-1 bg-primary rounded-full"
                                />
                            )}
                        </motion.button>
                    );
                })}
            </motion.div>
        </div>
    );
}
