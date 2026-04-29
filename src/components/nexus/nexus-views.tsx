"use client";

import React from "react";
import { motion } from "framer-motion";
import { Search, Clock, TrendingUp, History, Sparkles, Calendar } from "lucide-react";
import { GCinemaCard, VCinemaCard } from "./content-cards";
import { ContentRow } from "./content-row";

// Chats View (Telegram-like)
export function ChatsView() {
    return (
        <div className="flex flex-col h-[70vh] bg-black/20 rounded-[2rem] border border-white/5 overflow-hidden backdrop-blur-xl">
            <div className="p-6 border-b border-white/5 flex items-center justify-between bg-black/40">
                <h2 className="text-xl font-bold flex items-center gap-3">
                    <div className="w-2 h-2 bg-primary rounded-full animate-pulse" />
                    Messages
                </h2>
                <div className="relative group">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500 group-focus-within:text-primary transition-colors" />
                    <input 
                        type="text" 
                        placeholder="Search chats..." 
                        className="bg-white/5 border border-white/10 rounded-xl pl-9 pr-4 py-2 text-xs outline-none focus:border-primary/50 transition-all w-48 md:w-64"
                    />
                </div>
            </div>
            <div className="flex-1 overflow-y-auto p-2 md:p-4 flex flex-col gap-1 custom-scrollbar">
                {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map((i) => (
                    <motion.div 
                        key={i}
                        whileHover={{ background: "rgba(255,255,255,0.05)" }}
                        whileTap={{ scale: 0.99 }}
                        className="p-3 md:p-4 rounded-2xl flex items-center gap-4 cursor-pointer transition-colors group"
                    >
                        <div className="relative flex-shrink-0">
                            <div className="w-12 h-12 md:w-14 md:h-14 rounded-2xl bg-gradient-to-tr from-primary/50 to-blue-600/50 p-[2px] transition-transform group-hover:scale-105">
                                <div className="w-full h-full rounded-[0.9rem] bg-black p-0.5 overflow-hidden">
                                    <img src={`https://api.dicebear.com/7.x/avataaars/svg?seed=user${i}`} alt="avatar" className="w-full h-full object-cover" />
                                </div>
                            </div>
                            {i % 3 === 0 && (
                                <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-green-500 rounded-full border-2 border-[#050505] shadow-lg" />
                            )}
                        </div>
                        <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between mb-1">
                                <h4 className="font-bold text-sm md:text-base truncate group-hover:text-primary transition-colors">User Name {i}</h4>
                                <span className="text-[10px] text-gray-500">12:34</span>
                            </div>
                            <div className="flex items-center justify-between">
                                <p className="text-xs text-gray-400 truncate pr-4">Hey, Nexus interface looks amazing!</p>
                                {i < 4 && (
                                    <div className="bg-primary px-1.5 py-0.5 rounded-full text-[9px] font-bold text-white min-w-[18px] text-center">
                                        {i}
                                    </div>
                                )}
                            </div>
                        </div>
                    </motion.div>
                ))}
            </div>
        </div>
    );
}

// G. Cinema View
export function GCinemaView() {
    return (
        <div className="flex flex-col gap-12 pb-20 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* Search and Recommendations Header */}
            <div className="glass-effect p-6 md:p-10 rounded-[2.5rem] md:rounded-[3.5rem] border border-white/10 shadow-2xl relative overflow-hidden">
                <div className="absolute top-0 right-0 w-64 h-64 bg-primary/10 blur-[100px] rounded-full -mr-32 -mt-32" />
                
                <div className="relative z-10">
                    <h2 className="text-3xl md:text-5xl font-bold mb-8 tracking-tight">
                        Explore <span className="text-primary">Cinema</span>
                    </h2>
                    <div className="relative mb-10 group">
                        <Search className="absolute left-6 top-1/2 -translate-y-1/2 w-6 h-6 text-gray-500 group-focus-within:text-primary transition-colors" />
                        <input 
                            type="text" 
                            placeholder="Search movies, series, or genres..." 
                            className="w-full h-16 md:h-20 bg-white/5 border border-white/10 rounded-2xl md:rounded-3xl pl-16 pr-6 outline-none focus:border-primary/50 focus:bg-white/10 transition-all text-lg md:text-xl shadow-inner"
                        />
                    </div>
                    
                    <div className="grid grid-cols-2 md:grid-cols-5 gap-3 md:gap-6">
                        <RecommendationButton icon={History} label="Last Viewed" />
                        <RecommendationButton icon={TrendingUp} label="Trending" />
                        <RecommendationButton icon={Clock} label="Old Movies" />
                        <RecommendationButton icon={Sparkles} label="Latest" />
                        <RecommendationButton icon={Calendar} label="Coming Soon" />
                    </div>
                </div>
            </div>

            <ContentRow title="Trending Now">
                {[1, 2, 3, 4, 5, 6].map((i) => (
                    <GCinemaCard 
                        key={i} 
                        title={`Trending Blockbuster ${i}`} 
                        image={`https://picsum.photos/seed/trend${i}/800/450`} 
                        duration="2h 10m"
                        views="2.4M"
                        rating="4.9"
                        likes="800k"
                    />
                ))}
            </ContentRow>

            <ContentRow title="Latest Releases">
                {[1, 2, 3, 4, 5, 6].map((i) => (
                    <GCinemaCard 
                        key={i} 
                        title={`New Hit Movie ${i}`} 
                        image={`https://picsum.photos/seed/new${i}/800/450`} 
                        duration="1h 55m"
                        views="1.1M"
                        rating="4.7"
                        likes="320k"
                    />
                ))}
            </ContentRow>

            <ContentRow title="Recommended for You">
                {[1, 2, 3, 4, 5, 6].map((i) => (
                    <GCinemaCard 
                        key={i} 
                        title={`Suggested Series ${i}`} 
                        image={`https://picsum.photos/seed/reco${i}/800/450`} 
                        duration="45m"
                        views="900k"
                        rating="4.5"
                        likes="150k"
                    />
                ))}
            </ContentRow>
        </div>
    );
}

// V. Cinema View
export function VCinemaView() {
    return (
        <div className="flex flex-col gap-12 pb-20 animate-in fade-in slide-in-from-bottom-4 duration-500">
             <div className="glass-effect p-8 md:p-12 rounded-[2.5rem] md:rounded-[3.5rem] border border-white/10 relative overflow-hidden">
                <div className="absolute bottom-0 left-0 w-64 h-64 bg-blue-600/10 blur-[100px] rounded-full -ml-32 -mb-32" />
                <div className="relative z-10">
                    <h2 className="text-3xl md:text-5xl font-bold mb-4 tracking-tight">Vertical <span className="text-blue-500">Cinema</span></h2>
                    <p className="text-gray-400 text-lg md:text-xl max-w-2xl">The new way to experience storytelling. Cinematic vertical movies designed for your screen.</p>
                </div>
            </div>

            <ContentRow title="Top Vertical Films">
                {[1, 2, 3, 4, 5, 6].map((i) => (
                    <VCinemaCard 
                        key={i} 
                        title={`Vertical Epic ${i}`} 
                        image={`https://picsum.photos/seed/vepic${i}/400/600`} 
                        duration="42m"
                        views="500k"
                        rating="4.6"
                        likes="95k"
                    />
                ))}
            </ContentRow>

            <ContentRow title="New Shorts">
                {[1, 2, 3, 4, 5, 6].map((i) => (
                    <VCinemaCard 
                        key={i} 
                        title={`Short Story ${i}`} 
                        image={`https://picsum.photos/seed/vshort${i}/400/600`} 
                        duration="15m"
                        views="1.2M"
                        rating="4.8"
                        likes="250k"
                    />
                ))}
            </ContentRow>
        </div>
    );
}

function RecommendationButton({ icon: Icon, label }: { icon: any, label: string }) {
    return (
        <motion.button 
            whileHover={{ scale: 1.05, background: "rgba(255,255,255,0.08)", y: -5 }}
            whileTap={{ scale: 0.95 }}
            className="flex flex-col items-center gap-3 p-4 md:p-6 rounded-[2rem] bg-white/5 border border-white/5 transition-all shadow-lg group"
        >
            <div className="w-12 h-12 md:w-14 md:h-14 rounded-2xl bg-primary/20 flex items-center justify-center text-primary border border-primary/30 group-hover:bg-primary group-hover:text-white transition-all shadow-[0_0_20px_rgba(var(--primary-rgb),0.2)]">
                <Icon className="w-6 h-6" />
            </div>
            <span className="text-[9px] md:text-[10px] font-bold uppercase tracking-widest text-gray-400 group-hover:text-white transition-colors text-center">{label}</span>
        </motion.button>
    );
}
