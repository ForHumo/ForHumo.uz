"use client";

import React from "react";
import { motion } from "framer-motion";
import { Search, Clock, TrendingUp, History, Sparkles, Calendar, User, Shield, CreditCard, Bell, Settings, LogOut, UserCheck, Star as StarIcon, Heart } from "lucide-react";
import { GCinemaCard, VCinemaCard, MusicCard, GVideoCard, GStreamCard, VStreamCard, VVideoCard, PostCard } from "./content-cards";
import { ContentRow } from "./content-row";
import { cn } from "@/lib/utils";

// Musics View
export function MusicsView() {
    return (
        <div className="flex flex-col gap-12 pb-20 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="glass-effect p-8 md:p-12 rounded-[2.5rem] md:rounded-[3.5rem] border border-white/10 relative overflow-hidden">
                <h2 className="text-3xl md:text-5xl font-bold mb-4 tracking-tight">Your <span className="text-primary">Music</span></h2>
                <p className="text-gray-400 text-lg md:text-xl">Discover new sounds and curated playlists for you.</p>
            </div>
            <ContentRow title="Top Hits">
                {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
                    <MusicCard 
                        key={i} 
                        title={`Trending Track ${i}`} 
                        artist="Nexus Artist" 
                        image={`https://picsum.photos/seed/music_hit${i}/400/400`} 
                        duration="3:30"
                        rating="4.9"
                        listens="1.2M"
                        likes="200k"
                        year="2024"
                        postedTime="2d ago"
                    />
                ))}
            </ContentRow>
        </div>
    );
}

// Blogs View
export function BlogsView() {
    return (
        <div className="flex flex-col gap-12 pb-20 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="glass-effect p-8 md:p-12 rounded-[2.5rem] md:rounded-[3.5rem] border border-white/10">
                <h2 className="text-3xl md:text-5xl font-bold mb-4 tracking-tight">Nexus <span className="text-yellow-500">Blogs</span></h2>
                <p className="text-gray-400 text-lg md:text-xl">Thoughts, updates, and community stories.</p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {[1, 2, 3, 4, 5, 6].map((i) => (
                    <PostCard 
                        key={i} 
                        author={`Author ${i}`} 
                        time={`${i}h ago`} 
                        content="Sharing some thoughts on the future of AI agents and decentralized computing in the Nexus ecosystem. Exciting times ahead!" 
                    />
                ))}
            </div>
        </div>
    );
}

// G. Videos View
export function GVideosView() {
    return (
        <div className="flex flex-col gap-12 pb-20 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="glass-effect p-8 md:p-12 rounded-[2.5rem] md:rounded-[3.5rem] border border-white/10">
                <h2 className="text-3xl md:text-5xl font-bold mb-4 tracking-tight">G. <span className="text-red-500">Videos</span></h2>
                <p className="text-gray-400 text-lg md:text-xl">High-quality widescreen content from global creators.</p>
            </div>
            <ContentRow title="Recommended Videos">
                {[1, 2, 3, 4, 5, 6].map((i) => (
                    <GVideoCard 
                        key={i} 
                        title={`Amazing Video Title ${i}`} 
                        author="Top Creator" 
                        views="500k" 
                        time="3d ago" 
                        image={`https://picsum.photos/seed/gvideo${i}/800/450`} 
                        duration="10:00"
                        postedTime="3d ago"
                    />
                ))}
            </ContentRow>
        </div>
    );
}

// G. Streams View
export function GStreamsView() {
    return (
        <div className="flex flex-col gap-12 pb-20 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="glass-effect p-8 md:p-12 rounded-[2.5rem] md:rounded-[3.5rem] border border-white/10">
                <h2 className="text-3xl md:text-5xl font-bold mb-4 tracking-tight">G. <span className="text-red-600">Streams</span></h2>
                <p className="text-gray-400 text-lg md:text-xl">Live events and gaming broadcasts from around the world.</p>
            </div>
            <ContentRow title="Live Now">
                {[1, 2, 3].map((i) => (
                    <GStreamCard 
                        key={i}
                        title={`Live Broadcast ${i}`} 
                        author="Streamer Pro" 
                        status="LIVE" 
                        viewers="12k" 
                        startTime="20:00"
                        image={`https://picsum.photos/seed/gstream_live${i}/800/450`} 
                        postedTime="Now"
                    />
                ))}
            </ContentRow>
        </div>
    );
}

// V. Videos View
export function VVideosView() {
    return (
        <div className="flex flex-col gap-12 pb-20 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="glass-effect p-8 md:p-12 rounded-[2.5rem] md:rounded-[3.5rem] border border-white/10">
                <h2 className="text-3xl md:text-5xl font-bold mb-4 tracking-tight">V. <span className="text-blue-400">Videos</span></h2>
                <p className="text-gray-400 text-lg md:text-xl">Fast-paced vertical videos and trends.</p>
            </div>
            <ContentRow title="Trending Shorts">
                {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
                    <VVideoCard 
                        key={i} 
                        author={`Creator ${i}`} 
                        image={`https://picsum.photos/seed/vvideo${i}/400/711`} 
                        views="1.5M"
                        likes="250k"
                        duration="0:59"
                        postedTime="5h ago"
                    />
                ))}
            </ContentRow>
        </div>
    );
}

// V. Streams View
export function VStreamsView() {
    return (
        <div className="flex flex-col gap-12 pb-20 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="glass-effect p-8 md:p-12 rounded-[2.5rem] md:rounded-[3.5rem] border border-white/10">
                <h2 className="text-3xl md:text-5xl font-bold mb-4 tracking-tight">V. <span className="text-blue-500">Streams</span></h2>
                <p className="text-gray-400 text-lg md:text-xl">Real-time vertical streaming experience.</p>
            </div>
            <ContentRow title="Active Vertical Streams">
                {[1, 2, 3, 4].map((i) => (
                    <VStreamCard 
                        key={i}
                        title={`Vertical Stream ${i}`} 
                        author="V-Influencer" 
                        status="LIVE" 
                        viewers="5.4k" 
                        startTime="19:30"
                        image={`https://picsum.photos/seed/vstream_live${i}/400/711`} 
                        postedTime="Now"
                    />
                ))}
            </ContentRow>
        </div>
    );
}

// Humo ID (Profile) View
export function HumoIDView() {
    return (
        <div className="max-w-4xl mx-auto flex flex-col gap-8 pb-20 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="glass-effect p-10 rounded-[3rem] border border-white/10 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-64 h-64 bg-primary/10 blur-[100px] rounded-full -mr-32 -mt-32" />
                <div className="flex flex-col md:flex-row items-center gap-8 relative z-10">
                    <div className="w-32 h-32 rounded-[2.5rem] bg-gradient-to-tr from-primary to-blue-600 p-[2px] shadow-2xl">
                        <div className="w-full h-full rounded-[2.4rem] bg-black p-1 overflow-hidden">
                            <img src="https://api.dicebear.com/7.x/avataaars/svg?seed=Felix" alt="Profile" className="w-full h-full object-cover" />
                        </div>
                    </div>
                    <div className="flex-1 text-center md:text-left">
                        <h2 className="text-4xl font-bold mb-2">Abduvoris <span className="text-primary">Abdullayev</span></h2>
                        <p className="text-gray-400 mb-4 font-medium tracking-wide opacity-70">@abduvoris1636 • NEXUS PRO MEMBER</p>
                        <div className="flex flex-wrap items-center justify-center md:justify-start gap-4">
                            <div className="px-4 py-2 bg-white/5 border border-white/10 rounded-xl text-xs font-bold flex items-center gap-2">
                                <Shield className="w-3.5 h-3.5 text-primary" /> Verified
                            </div>
                            <div className="px-4 py-2 bg-white/5 border border-white/10 rounded-xl text-xs font-bold flex items-center gap-2">
                                <StarIcon className="w-3.5 h-3.5 text-yellow-500" /> 4.9 Rating
                            </div>
                        </div>
                    </div>
                    <motion.button 
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        className="px-8 py-4 bg-primary text-white rounded-2xl font-bold shadow-lg shadow-primary/20"
                    >
                        Edit Profile
                    </motion.button>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <ProfileStatCard icon={Heart} label="Total Likes" value="1.2M" color="text-red-500" />
                <ProfileStatCard icon={UserCheck} label="Following" value="842" color="text-blue-500" />
                <ProfileStatCard icon={CreditCard} label="Humo Wallet" value="$1,240.50" color="text-green-500" />
                <ProfileStatCard icon={Shield} label="Security Level" value="Advanced" color="text-primary" />
            </div>

            <div className="glass-effect p-8 rounded-[2.5rem] border border-white/10">
                <h3 className="text-xl font-bold mb-6 flex items-center gap-3">
                    <Settings className="w-5 h-5 text-primary" /> Quick Settings
                </h3>
                <div className="space-y-4">
                    <SettingToggle label="Public Profile" active={true} />
                    <SettingToggle label="Two-Factor Authentication" active={true} />
                    <SettingToggle label="Humo ID Privacy" active={false} />
                    <button className="w-full flex items-center justify-between p-4 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-500 font-bold hover:bg-red-500/20 transition-colors">
                        Logout from Nexus <LogOut className="w-4 h-4" />
                    </button>
                </div>
            </div>
        </div>
    );
}

function ProfileStatCard({ icon: Icon, label, value, color }: { icon: any, label: string, value: string, color: string }) {
    return (
        <div className="glass-effect p-6 rounded-[2rem] border border-white/5 flex items-center gap-6">
            <div className={cn("w-14 h-14 rounded-2xl bg-white/5 flex items-center justify-center", color)}>
                <Icon className="w-6 h-6" />
            </div>
            <div>
                <p className="text-xs text-gray-500 font-bold uppercase tracking-widest mb-1">{label}</p>
                <p className="text-2xl font-bold">{value}</p>
            </div>
        </div>
    );
}

function SettingToggle({ label, active }: { label: string, active: boolean }) {
    return (
        <div className="flex items-center justify-between p-4 rounded-2xl bg-white/5 border border-white/5">
            <span className="text-sm font-bold text-gray-300">{label}</span>
            <div className={cn("w-12 h-6 rounded-full relative transition-colors", active ? "bg-primary" : "bg-gray-700")}>
                <div className={cn("absolute top-1 w-4 h-4 bg-white rounded-full transition-all", active ? "right-1" : "left-1")} />
            </div>
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

export function GCinemaView() {
    return (
        <div className="flex flex-col gap-12 pb-20 animate-in fade-in slide-in-from-bottom-4 duration-500">
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
                        year="2024"
                        postedTime="2d ago"
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
                        year="2024"
                        postedTime="5h ago"
                    />
                ))}
            </ContentRow>
        </div>
    );
}

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
                        year="2024"
                        postedTime="1d ago"
                    />
                ))}
            </ContentRow>
        </div>
    );
}
