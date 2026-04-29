"use client";

import React from "react";
import { Play, MessageCircle, Heart, Share2, MoreVertical, Music as MusicIcon, Radio } from "lucide-react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

// 1. Movie / Film Card
export function FilmCard({ title, image }: { title: string; image: string }) {
    return (
        <motion.div 
            whileHover={{ scale: 1.05, y: -5 }}
            className="flex-shrink-0 w-40 md:w-56 group cursor-pointer"
        >
            <div className="relative aspect-[2/3] rounded-2xl overflow-hidden mb-3 shadow-lg border border-white/5">
                <img src={image} alt={title} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <div className="w-12 h-12 bg-primary rounded-full flex items-center justify-center shadow-[0_0_30px_rgba(var(--primary-rgb),0.5)]">
                        <Play className="w-6 h-6 text-white fill-white ml-1" />
                    </div>
                </div>
            </div>
            <h4 className="font-bold text-sm truncate group-hover:text-primary transition-colors">{title}</h4>
            <p className="text-[10px] text-gray-500">2h 15m • Action</p>
        </motion.div>
    );
}

// 2. Music / Album Card
export function MusicCard({ title, artist, image }: { title: string; artist: string; image: string }) {
    return (
        <motion.div 
            whileHover={{ scale: 1.05 }}
            className="flex-shrink-0 w-32 md:w-44 group cursor-pointer"
        >
            <div className="relative aspect-square rounded-[2rem] overflow-hidden mb-3 shadow-lg border border-white/5">
                <img src={image} alt={title} className="w-full h-full object-cover" />
                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center backdrop-blur-[2px]">
                    <div className="w-10 h-10 bg-white/20 backdrop-blur-md rounded-full flex items-center justify-center border border-white/30">
                        <MusicIcon className="w-5 h-5 text-white" />
                    </div>
                </div>
            </div>
            <h4 className="font-bold text-xs truncate">{title}</h4>
            <p className="text-[10px] text-gray-500 truncate">{artist}</p>
        </motion.div>
    );
}

// 3. Text Post Card
export function PostCard({ author, content, time }: { author: string; content: string; time: string }) {
    return (
        <div className="flex-shrink-0 w-64 md:w-80 glass-effect p-5 rounded-[2rem] border border-white/5 hover:border-white/10 transition-all cursor-pointer">
            <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-primary/20 border border-primary/30" />
                    <div>
                        <h4 className="text-xs font-bold">{author}</h4>
                        <p className="text-[9px] text-gray-500">{time}</p>
                    </div>
                </div>
                <MoreVertical className="w-4 h-4 text-gray-600" />
            </div>
            <p className="text-xs text-gray-300 leading-relaxed line-clamp-3 mb-4">
                {content}
            </p>
            <div className="flex items-center gap-4 text-gray-500">
                <div className="flex items-center gap-1.5"><Heart className="w-3.5 h-3.5" /><span className="text-[10px]">2.4k</span></div>
                <div className="flex items-center gap-1.5"><MessageCircle className="w-3.5 h-3.5" /><span className="text-[10px]">128</span></div>
                <div className="flex items-center gap-1.5"><Share2 className="w-3.5 h-3.5" /></div>
            </div>
        </div>
    );
}

// 4. Horizontal Video Card
export function VideoCard({ title, author, views, time, image }: { title: string; author: string; views: string; time: string; image: string }) {
    return (
        <motion.div 
            whileHover={{ scale: 1.02 }}
            className="flex-shrink-0 w-64 md:w-80 group cursor-pointer"
        >
            <div className="relative aspect-video rounded-2xl overflow-hidden mb-3 shadow-lg border border-white/5">
                <img src={image} alt={title} className="w-full h-full object-cover" />
                <div className="absolute bottom-2 right-2 px-1.5 py-0.5 bg-black/80 rounded text-[10px] font-bold">
                    12:45
                </div>
                <div className="absolute inset-0 bg-black/20 group-hover:bg-black/0 transition-colors" />
            </div>
            <div className="flex gap-3">
                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-white/10" />
                <div>
                    <h4 className="font-bold text-sm line-clamp-2 leading-tight mb-1 group-hover:text-primary transition-colors">{title}</h4>
                    <p className="text-[10px] text-gray-500">{author} • {views} views • {time}</p>
                </div>
            </div>
        </motion.div>
    );
}

// 5. Stream Card
export function StreamCard({ title, author, status, viewers, image }: { title: string; author: string; status: 'LIVE' | 'UPCOMING' | 'ENDED'; viewers?: string; image: string }) {
    return (
        <motion.div 
            whileHover={{ scale: 1.02 }}
            className="flex-shrink-0 w-64 md:w-80 group cursor-pointer"
        >
            <div className="relative aspect-video rounded-2xl overflow-hidden mb-3 shadow-lg border border-white/5">
                <img src={image} alt={title} className="w-full h-full object-cover" />
                
                {status === 'LIVE' && (
                    <div className="absolute top-3 left-3 flex items-center gap-1.5 px-2 py-1 bg-red-600 rounded-lg shadow-lg">
                        <span className="w-1.5 h-1.5 bg-white rounded-full animate-pulse" />
                        <span className="text-[10px] font-bold">LIVE</span>
                    </div>
                )}
                {status === 'UPCOMING' && (
                    <div className="absolute top-3 left-3 px-2 py-1 bg-blue-600 rounded-lg shadow-lg text-[10px] font-bold">
                        14:00 (In 2h)
                    </div>
                )}
                
                <div className="absolute bottom-3 left-3 flex items-center gap-1 px-2 py-1 bg-black/60 backdrop-blur-md rounded-lg border border-white/10">
                    <Radio className="w-3 h-3 text-red-500" />
                    <span className="text-[10px] font-bold">{viewers || '0'} watching</span>
                </div>
            </div>
            <h4 className="font-bold text-sm truncate mb-1">{title}</h4>
            <p className="text-[10px] text-gray-500">{author}</p>
        </motion.div>
    );
}

// 6. Vertical Content Card (Shorts/TikTok style)
export function VerticalCard({ author, image }: { author: string; image: string }) {
    return (
        <motion.div 
            whileHover={{ scale: 1.05 }}
            className="flex-shrink-0 w-32 md:w-48 aspect-[9/16] relative rounded-[2rem] overflow-hidden group cursor-pointer shadow-lg border border-white/5"
        >
            <img src={image} alt="Vertical content" className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" />
            <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-transparent to-transparent flex flex-col justify-end p-4">
                <div className="flex items-center gap-2 mb-2">
                    <div className="w-6 h-6 rounded-full bg-white/20 border border-white/30" />
                    <span className="text-[10px] font-bold truncate">{author}</span>
                </div>
                <p className="text-[9px] text-gray-300 line-clamp-2 leading-snug">
                    New futuristic vibes in Nexus! #SuperApp #Humo
                </p>
            </div>
        </motion.div>
    );
}

// 7. Profile Card (Recommendation)
export function ProfileCard({ name, handle, image }: { name: string; handle: string; image: string }) {
    return (
        <div className="flex-shrink-0 w-40 md:w-52 glass-effect p-6 rounded-[2.5rem] text-center flex flex-col items-center border border-white/5 hover:border-primary/20 transition-all">
            <div className="relative mb-4">
                <div className="w-20 h-20 rounded-full bg-gradient-to-tr from-primary to-blue-600 p-1">
                    <div className="w-full h-full rounded-full bg-black p-0.5">
                        <img src={image} alt={name} className="w-full h-full rounded-full object-cover" />
                    </div>
                </div>
                <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-primary rounded-full border-4 border-[#050505] flex items-center justify-center">
                    <span className="text-[10px] text-white">✓</span>
                </div>
            </div>
            <h4 className="font-bold text-sm mb-0.5">{name}</h4>
            <p className="text-[10px] text-gray-500 mb-4">{handle}</p>
            <button className="w-full py-2 bg-white text-black text-[10px] font-bold rounded-xl hover:bg-primary hover:text-white transition-all active:scale-95">
                Follow
            </button>
        </div>
    );
}
