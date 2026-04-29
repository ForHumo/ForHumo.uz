"use client";

import React from "react";
import { 
    X, 
    Monitor, 
    Users, 
    Bot, 
    PlayCircle, 
    Clock, 
    ThumbsUp, 
    ThumbsDown, 
    ListMusic, 
    History, 
    UserX,
    ChevronRight
} from "lucide-react";
import { motion } from "framer-motion";

interface NexusSidebarProps {
    onClose: () => void;
}

const SIDEBAR_SECTIONS = [
    {
        title: "My Content",
        items: [
            { icon: Monitor, label: "My Channels" },
            { icon: Users, label: "My Groups" },
            { icon: Bot, label: "My Agents (bots)" },
        ]
    },
    {
        title: "Activity",
        items: [
            { icon: PlayCircle, label: "Subscriptions" },
            { icon: History, label: "Recently Watched" },
            { icon: ThumbsUp, label: "Liked" },
            { icon: ThumbsDown, label: "Disliked" },
        ]
    },
    {
        title: "Saved",
        items: [
            { icon: ListMusic, label: "Playlists" },
            { icon: Clock, label: "Watch Later" },
        ]
    },
    {
        title: "Control",
        items: [
            { icon: UserX, label: "Blocked Users" },
        ]
    }
];

export function NexusSidebar({ onClose }: NexusSidebarProps) {
    return (
        <>
            {/* Backdrop */}
            <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={onClose}
                className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[60]"
            />

            {/* Sidebar Panel */}
            <motion.aside
                initial={{ x: "100%" }}
                animate={{ x: 0 }}
                exit={{ x: "100%" }}
                transition={{ type: "spring", damping: 25, stiffness: 200 }}
                className="fixed top-0 right-0 bottom-0 w-80 z-[70] glass-effect-heavy border-l border-white/10 flex flex-col"
            >
                {/* Header */}
                <div className="p-6 flex items-center justify-between border-b border-white/5">
                    <h2 className="text-xl font-bold">Nexus Menu</h2>
                    <button 
                        onClick={onClose}
                        className="p-2 hover:bg-white/5 rounded-xl transition-colors"
                    >
                        <X className="w-5 h-5 text-gray-400" />
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
                    {SIDEBAR_SECTIONS.map((section, idx) => (
                        <div key={idx} className="mb-8 last:mb-0">
                            <h3 className="px-4 text-xs font-bold uppercase tracking-widest text-gray-500 mb-4">
                                {section.title}
                            </h3>
                            <div className="space-y-1">
                                {section.items.map((item, itemIdx) => {
                                    const Icon = item.icon;
                                    return (
                                        <button 
                                            key={itemIdx}
                                            className="w-full flex items-center justify-between px-4 py-3 rounded-xl hover:bg-white/5 group transition-all"
                                        >
                                            <div className="flex items-center gap-3">
                                                <div className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center group-hover:bg-primary/20 group-hover:text-primary transition-colors">
                                                    <Icon className="w-4 h-4" />
                                                </div>
                                                <span className="text-sm font-medium text-gray-300 group-hover:text-white">
                                                    {item.label}
                                                </span>
                                            </div>
                                            <ChevronRight className="w-4 h-4 text-gray-600 opacity-0 group-hover:opacity-100 transition-opacity" />
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                    ))}
                </div>

                {/* Footer */}
                <div className="p-6 border-t border-white/5">
                    <div className="bg-primary/10 rounded-2xl p-4 border border-primary/20">
                        <p className="text-xs text-primary font-bold mb-1">PRO ACCESS</p>
                        <p className="text-[10px] text-gray-400 leading-relaxed">
                            Upgrade to Nexus Pro for unlimited cloud storage and advanced AI agents.
                        </p>
                    </div>
                </div>
            </motion.aside>
        </>
    );
}
