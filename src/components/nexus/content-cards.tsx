"use client";

import React from "react";
import { Play, MessageCircle, Heart, Share2, MoreVertical, Music as MusicIcon, Radio, Star, Eye, Clock, ThumbsUp, Users, Calendar } from "lucide-react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

// 1. Cinema Card (Horizontal - G. Cinema)
export function GCinemaCard({ title, image, duration, views, rating, likes, year, postedTime }: { title: string; image: string; duration: string; views: string; rating: string; likes: string; year: string; postedTime: string }) {
    return (
        <motion.div 
            whileHover={{ scale: 1.05, y: -5 }}
            className="flex-shrink-0 w-64 md:w-80 group cursor-pointer"
        >
            <div className="relative aspect-video rounded-2xl overflow-hidden mb-3 shadow-lg border border-white/5">
                <img src={image} alt={title} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <div className="w-12 h-12 bg-primary rounded-full flex items-center justify-center shadow-[0_0_30px_rgba(var(--primary-rgb),0.5)]">
                        <Play className="w-6 h-6 text-white fill-white ml-1" />
                    </div>
                </div>
                <div className="absolute bottom-2 right-2 px-1.5 py-0.5 bg-black/80 backdrop-blur-md rounded text-[10px] font-bold border border-white/10">
                    {duration}
                </div>
            </div>
            <h4 className="font-bold text-sm truncate group-hover:text-primary transition-colors mb-1">{title}</h4>
            <div className="flex flex-wrap items-center gap-3 text-gray-500 text-[10px]">
                <div className="flex items-center gap-1"><Eye className="w-3 h-3" /> {views}</div>
                <div className="flex items-center gap-1 text-yellow-500"><Star className="w-3 h-3 fill-yellow-500" /> {rating}</div>
                <div className="flex items-center gap-1"><ThumbsUp className="w-3 h-3" /> {likes}</div>
                <div className="flex items-center gap-1"><Calendar className="w-3 h-3" /> {year}</div>
                <div className="flex items-center gap-1"><Clock className="w-3 h-3" /> {postedTime}</div>
            </div>
        </motion.div>
    );
}

// 1.5. Cinema Card (Vertical - V. Cinema)
export function VCinemaCard({ title, image, duration, views, rating, likes, year, postedTime }: { title: string; image: string; duration: string; views: string; rating: string; likes: string; year: string; postedTime: string }) {
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
                <div className="absolute bottom-2 right-2 px-1.5 py-0.5 bg-black/80 backdrop-blur-md rounded text-[10px] font-bold border border-white/10">
                    {duration}
                </div>
            </div>
            <h4 className="font-bold text-sm truncate group-hover:text-primary transition-colors mb-1">{title}</h4>
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-gray-500 text-[10px]">
                <div className="flex items-center gap-1"><Eye className="w-3 h-3" /> {views}</div>
                <div className="flex items-center gap-1 text-yellow-500"><Star className="w-3 h-3 fill-yellow-500" /> {rating}</div>
                <div className="flex items-center gap-1"><ThumbsUp className="w-3 h-3" /> {likes}</div>
                <div className="flex items-center gap-1"><Calendar className="w-3 h-3" /> {year}</div>
                <div className="flex items-center gap-1"><Clock className="w-3 h-3" /> {postedTime}</div>
            </div>
        </motion.div>
    );
}

// 2. Music / Album Card
export function MusicCard({ title, artist, image, duration, rating, listens, likes, year, postedTime }: { title: string; artist: string; image: string; duration: string; rating: string; listens: string; likes: string; year: string; postedTime: string }) {
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
                <div className="absolute bottom-2 right-2 px-1.5 py-0.5 bg-black/80 backdrop-blur-md rounded text-[10px] font-bold border border-white/10">
                    {duration}
                </div>
            </div>
            <h4 className="font-bold text-xs truncate mb-0.5">{title}</h4>
            <p className="text-[10px] text-gray-500 truncate mb-1">{artist}</p>
            <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-gray-500 text-[9px]">
                <div className="flex items-center gap-0.5 text-yellow-500"><Star className="w-2.5 h-2.5 fill-yellow-500" /> {rating}</div>
                <div className="flex items-center gap-0.5"><Play className="w-2.5 h-2.5" /> {listens}</div>
                <div className="flex items-center gap-0.5"><Heart className="w-2.5 h-2.5" /> {likes}</div>
                <div className="flex items-center gap-0.5"><Calendar className="w-2.5 h-2.5" /> {year}</div>
                <div className="flex items-center gap-0.5"><Clock className="w-2.5 h-2.5" /> {postedTime}</div>
            </div>
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
                        <div className="flex items-center gap-1">
                            <Clock className="w-2.5 h-2.5 text-gray-500" />
                            <p className="text-[9px] text-gray-500">{time}</p>
                        </div>
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

// 3.1 Chat Preview Card (Horizontal list style)
export function ChatPreviewCard({ name, avatar, message, time, unread, isGroup }: { name: string; avatar: string; message: string; time: string; unread?: boolean; isGroup?: boolean }) {
    return (
        <motion.div 
            whileHover={{ scale: 1.02 }}
            className="flex-shrink-0 w-64 md:w-72 bg-[#121212] hover:bg-[#1a1a1a] p-4 rounded-[1.5rem] border border-white/5 flex items-center gap-4 cursor-pointer transition-all relative group"
        >
            <div className="relative flex-shrink-0">
                <div className="w-12 h-12 md:w-14 md:h-14 rounded-full overflow-hidden border border-white/10 bg-white/5">
                    <img src={avatar} alt={name} className="w-full h-full object-cover" />
                </div>
                {unread && (
                    <div className="absolute top-0 right-0 w-3.5 h-3.5 bg-blue-500 rounded-full border-2 border-[#121212]" />
                )}
            </div>
            <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-1">
                    <h4 className="font-bold text-sm truncate pr-2 flex items-center gap-1.5">
                        {name}
                        {isGroup && <Users className="w-3 h-3 text-primary" />}
                    </h4>
                    <span className="text-[10px] text-gray-500">{time}</span>
                </div>
                <p className="text-xs text-gray-400 truncate opacity-70 group-hover:opacity-100 transition-opacity">
                    {message}
                </p>
            </div>
        </motion.div>
    );
}

// 4. Horizontal Video Card (G. Videos)
export function GVideoCard({ title, author, views, time, image, duration, postedTime }: { title: string; author: string; views: string; time: string; image: string; duration: string; postedTime: string }) {
    return (
        <motion.div 
            whileHover={{ scale: 1.02 }}
            className="flex-shrink-0 w-64 md:w-80 group cursor-pointer"
        >
            <div className="relative aspect-video rounded-2xl overflow-hidden mb-3 shadow-lg border border-white/5">
                <img src={image} alt={title} className="w-full h-full object-cover" />
                <div className="absolute bottom-2 right-2 px-1.5 py-0.5 bg-black/80 backdrop-blur-md rounded text-[10px] font-bold border border-white/10">
                    {duration}
                </div>
                <div className="absolute inset-0 bg-black/20 group-hover:bg-black/0 transition-colors" />
            </div>
            <div className="flex gap-3">
                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-white/10" />
                <div className="min-w-0">
                    <h4 className="font-bold text-sm line-clamp-2 leading-tight mb-1 group-hover:text-primary transition-colors">{title}</h4>
                    <p className="text-[10px] text-gray-500 flex flex-wrap gap-x-2">
                        <span>{author}</span>
                        <span>• {views} views</span>
                        <span>• {time} ago</span>
                        <span className="flex items-center gap-1 text-primary/70 font-bold"><Clock className="w-2.5 h-2.5" /> {postedTime}</span>
                    </p>
                </div>
            </div>
        </motion.div>
    );
}

// 5. Stream Card (G. Streams)
export function GStreamCard({ title, author, status, viewers, waiting, image, startTime, likes, postedTime }: { title: string; author: string; status: 'LIVE' | 'UPCOMING' | 'ENDED'; viewers?: string; waiting?: string; image: string; startTime?: string; likes?: string; postedTime: string }) {
    return (
        <motion.div 
            whileHover={{ scale: 1.02 }}
            className="flex-shrink-0 w-64 md:w-80 group cursor-pointer"
        >
            <div className={cn(
                "relative aspect-video rounded-2xl overflow-hidden mb-3 shadow-lg border-2 transition-colors",
                status === 'LIVE' ? "border-red-600/50" : status === 'UPCOMING' ? "border-green-600/50" : "border-yellow-600/50"
            )}>
                <img src={image} alt={title} className="w-full h-full object-cover" />
                
                {status === 'LIVE' && (
                    <>
                        <div className="absolute top-3 left-3 flex items-center gap-1.5 px-2 py-1 bg-red-600 rounded-lg shadow-lg">
                            <span className="w-1.5 h-1.5 bg-white rounded-full animate-pulse" />
                            <span className="text-[10px] font-bold">LIVE</span>
                        </div>
                        {startTime && (
                            <div className="absolute top-3 right-3 px-2 py-1 bg-black/60 backdrop-blur-md rounded-lg border border-red-600 text-[10px] font-bold text-red-500">
                                Started: {startTime}
                            </div>
                        )}
                    </>
                )}
                {status === 'UPCOMING' && (
                    <div className="absolute top-3 left-3 px-2 py-1 bg-green-600 rounded-lg shadow-lg text-[10px] font-bold text-white">
                        UPCOMING
                    </div>
                )}
                {status === 'ENDED' && (
                    <div className="absolute top-3 left-3 px-2 py-1 bg-yellow-600 rounded-lg shadow-lg text-[10px] font-bold text-black">
                        ENDED
                    </div>
                )}
                
                <div className="absolute bottom-3 left-3 flex items-center gap-2 px-2 py-1 bg-black/60 backdrop-blur-md rounded-lg border border-white/10">
                    {status === 'LIVE' ? (
                        <>
                            <Eye className="w-3 h-3 text-red-500" />
                            <span className="text-[10px] font-bold">{viewers} watching</span>
                        </>
                    ) : status === 'UPCOMING' ? (
                        <>
                            <Users className="w-3 h-3 text-green-500" />
                            <span className="text-[10px] font-bold">{waiting} waiting</span>
                        </>
                    ) : (
                        <div className="flex items-center gap-3">
                            <div className="flex items-center gap-1">
                                <Eye className="w-3 h-3 text-yellow-500" />
                                <span className="text-[10px] font-bold">{viewers}</span>
                            </div>
                            <div className="flex items-center gap-1">
                                <ThumbsUp className="w-3 h-3 text-yellow-500" />
                                <span className="text-[10px] font-bold">{likes}</span>
                            </div>
                        </div>
                    )}
                </div>
            </div>
            <h4 className="font-bold text-sm truncate mb-1">{title}</h4>
            <div className="flex items-center justify-between">
                <p className="text-[10px] text-gray-500">{author}</p>
                <p className="text-[10px] text-primary/70 font-bold flex items-center gap-1"><Clock className="w-2.5 h-2.5" /> {postedTime}</p>
            </div>
        </motion.div>
    );
}

// 5.5. Vertical Stream Card (V. Streams)
export function VStreamCard({ title, author, status, viewers, waiting, image, startTime, likes, postedTime }: { title: string; author: string; status: 'LIVE' | 'UPCOMING' | 'ENDED'; viewers?: string; waiting?: string; image: string; startTime?: string; likes?: string; postedTime: string }) {
    return (
        <motion.div 
            whileHover={{ scale: 1.02 }}
            className="flex-shrink-0 w-40 md:w-56 group cursor-pointer"
        >
            <div className={cn(
                "relative aspect-[9/16] rounded-2xl overflow-hidden mb-3 shadow-lg border-2 transition-colors",
                status === 'LIVE' ? "border-red-600/50" : status === 'UPCOMING' ? "border-green-600/50" : "border-yellow-600/50"
            )}>
                <img src={image} alt={title} className="w-full h-full object-cover" />
                
                {status === 'LIVE' && (
                    <div className="absolute top-3 left-3 flex flex-col gap-2">
                        <div className="flex items-center gap-1.5 px-2 py-1 bg-red-600 rounded-lg shadow-lg w-fit">
                            <span className="w-1.5 h-1.5 bg-white rounded-full animate-pulse" />
                            <span className="text-[10px] font-bold">LIVE</span>
                        </div>
                        {startTime && (
                            <div className="px-2 py-1 bg-black/60 backdrop-blur-md rounded-lg border border-red-600 text-[10px] font-bold text-red-500 w-fit">
                                {startTime}
                            </div>
                        )}
                    </div>
                )}
                {status === 'UPCOMING' && (
                    <div className="absolute top-3 left-3 px-2 py-1 bg-green-600 rounded-lg shadow-lg text-[10px] font-bold text-white">
                        UPCOMING
                    </div>
                )}
                {status === 'ENDED' && (
                    <div className="absolute top-3 left-3 px-2 py-1 bg-yellow-600 rounded-lg shadow-lg text-[10px] font-bold text-black">
                        ENDED
                    </div>
                )}
                
                <div className="absolute bottom-3 left-3 right-3 flex flex-col gap-2 p-2 bg-black/60 backdrop-blur-md rounded-xl border border-white/10">
                    <h4 className="font-bold text-[10px] truncate">{title}</h4>
                    <div className="flex items-center justify-between">
                        {status === 'LIVE' ? (
                            <div className="flex items-center gap-1">
                                <Eye className="w-3 h-3 text-red-500" />
                                <span className="text-[10px] font-bold">{viewers}</span>
                            </div>
                        ) : status === 'UPCOMING' ? (
                            <div className="flex items-center gap-1">
                                <Users className="w-3 h-3 text-green-500" />
                                <span className="text-[10px] font-bold">{waiting}</span>
                            </div>
                        ) : (
                            <div className="flex items-center gap-3">
                                <div className="flex items-center gap-1">
                                    <Eye className="w-3 h-3 text-yellow-500" />
                                    <span className="text-[10px] font-bold">{viewers}</span>
                                </div>
                                <div className="flex items-center gap-1">
                                    <ThumbsUp className="w-3 h-3 text-yellow-500" />
                                    <span className="text-[10px] font-bold">{likes}</span>
                                </div>
                            </div>
                        )}
                        <span className="text-[8px] text-white/50 font-bold">{postedTime}</span>
                    </div>
                </div>
            </div>
            <p className="text-[10px] text-center text-gray-500">{author}</p>
        </motion.div>
    );
}

// 6. Vertical Video Card (V. Videos)
export function VVideoCard({ author, image, views, likes, duration, postedTime }: { author: string; image: string; views: string; likes: string; duration: string; postedTime: string }) {
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
                <div className="flex items-center justify-between mt-auto">
                    <div className="flex flex-col gap-1">
                        <div className="flex items-center gap-1 text-[10px] font-bold text-white">
                            <Eye className="w-3 h-3" /> {views}
                        </div>
                        <div className="flex items-center gap-1 text-[10px] font-bold text-white">
                            <Heart className="w-3 h-3" /> {likes}
                        </div>
                    </div>
                    <div className="flex flex-col items-end gap-1">
                        <div className="px-1.5 py-0.5 bg-black/60 backdrop-blur-md rounded text-[9px] font-bold border border-white/10">
                            {duration}
                        </div>
                        <div className="text-[8px] text-white/50 font-bold">{postedTime}</div>
                    </div>
                </div>
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
