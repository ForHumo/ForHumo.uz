"use client";

import {
    Play, Heart, Share2, MoreVertical, Music as MusicIcon,
    Star, Eye, Clock, ThumbsUp, Users, Calendar, Check,
    MessageCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";

// ── G. Cinema Card (16:9) ──────────────────────────────────────────────────────
export function GCinemaCard({
    title, image, duration, views, rating, likes, year, postedTime,
}: {
    title: string; image: string; duration: string; views: string;
    rating: string; likes: string; year: string; postedTime: string;
}) {
    return (
        <div className="flex-shrink-0 w-64 md:w-80 group cursor-pointer">
            <div className="relative aspect-video rounded-2xl overflow-hidden mb-3 border border-white/5 shadow-lg">
                <img
                    src={image} alt={title}
                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center">
                    <div className="w-12 h-12 bg-primary rounded-full flex items-center justify-center shadow-[0_0_30px_rgba(59,130,246,0.6)] scale-75 group-hover:scale-100 transition-transform duration-200">
                        <Play className="w-5 h-5 text-white fill-white ml-0.5" />
                    </div>
                </div>
                <div className="absolute bottom-2 right-2 px-1.5 py-0.5 bg-black/80 backdrop-blur-md rounded text-[10px] font-bold border border-white/10">
                    {duration}
                </div>
            </div>
            <h4 className="font-bold text-sm truncate group-hover:text-primary transition-colors duration-200 mb-1">{title}</h4>
            <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-gray-500 text-[10px]">
                <span className="flex items-center gap-1"><Eye className="w-3 h-3" />{views}</span>
                <span className="flex items-center gap-1 text-yellow-500"><Star className="w-3 h-3 fill-yellow-500" />{rating}</span>
                <span className="flex items-center gap-1"><ThumbsUp className="w-3 h-3" />{likes}</span>
                <span className="flex items-center gap-1"><Calendar className="w-3 h-3" />{year}</span>
                <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{postedTime}</span>
            </div>
        </div>
    );
}

// ── V. Cinema Card (2:3) ───────────────────────────────────────────────────────
export function VCinemaCard({
    title, image, duration, views, rating, likes, year, postedTime,
}: {
    title: string; image: string; duration: string; views: string;
    rating: string; likes: string; year: string; postedTime: string;
}) {
    return (
        <div className="flex-shrink-0 w-40 md:w-52 group cursor-pointer">
            <div className="relative aspect-[2/3] rounded-2xl overflow-hidden mb-3 border border-white/5 shadow-lg">
                <img
                    src={image} alt={title}
                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center">
                    <div className="w-12 h-12 bg-primary rounded-full flex items-center justify-center shadow-[0_0_30px_rgba(59,130,246,0.6)] scale-75 group-hover:scale-100 transition-transform duration-200">
                        <Play className="w-5 h-5 text-white fill-white ml-0.5" />
                    </div>
                </div>
                <div className="absolute bottom-2 right-2 px-1.5 py-0.5 bg-black/80 backdrop-blur-md rounded text-[10px] font-bold border border-white/10">
                    {duration}
                </div>
            </div>
            <h4 className="font-bold text-sm truncate group-hover:text-primary transition-colors duration-200 mb-1">{title}</h4>
            <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-gray-500 text-[10px]">
                <span className="flex items-center gap-1"><Eye className="w-3 h-3" />{views}</span>
                <span className="flex items-center gap-1 text-yellow-500"><Star className="w-3 h-3 fill-yellow-500" />{rating}</span>
                <span className="flex items-center gap-1"><ThumbsUp className="w-3 h-3" />{likes}</span>
                <span className="flex items-center gap-1"><Calendar className="w-3 h-3" />{year}</span>
            </div>
        </div>
    );
}

// ── Music Card (1:1) ───────────────────────────────────────────────────────────
export function MusicCard({
    title, artist, image, duration, rating, listens, likes, year, postedTime,
}: {
    title: string; artist: string; image: string; duration: string;
    rating: string; listens: string; likes: string; year: string; postedTime: string;
}) {
    return (
        <div className="flex-shrink-0 w-32 md:w-44 group cursor-pointer">
            <div className="relative aspect-square rounded-[1.5rem] overflow-hidden mb-3 border border-white/5 shadow-lg">
                <img src={image} alt={title} className="w-full h-full object-cover" />
                <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center backdrop-blur-[2px]">
                    <div className="w-10 h-10 bg-white/20 backdrop-blur-md rounded-full flex items-center justify-center border border-white/30">
                        <MusicIcon className="w-5 h-5 text-white" />
                    </div>
                </div>
                <div className="absolute bottom-2 right-2 px-1.5 py-0.5 bg-black/80 backdrop-blur-md rounded text-[10px] font-bold border border-white/10">
                    {duration}
                </div>
            </div>
            <h4 className="font-bold text-xs truncate mb-0.5 group-hover:text-primary transition-colors duration-200">{title}</h4>
            <p className="text-[10px] text-gray-500 truncate mb-1">{artist}</p>
            <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-gray-500 text-[9px]">
                <span className="flex items-center gap-0.5 text-yellow-500"><Star className="w-2.5 h-2.5 fill-yellow-500" />{rating}</span>
                <span className="flex items-center gap-0.5"><Play className="w-2.5 h-2.5" />{listens}</span>
                <span className="flex items-center gap-0.5"><Heart className="w-2.5 h-2.5" />{likes}</span>
            </div>
        </div>
    );
}

// ── Post Card ──────────────────────────────────────────────────────────────────
export function PostCard({ author, content, time }: {
    author: string; content: string; time: string;
}) {
    return (
        <div className="flex-shrink-0 w-64 md:w-80 nx-glass rounded-[1.5rem] p-5 hover:border-white/10 transition-all duration-200 cursor-pointer">
            <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-full bg-primary/20 border border-primary/30 flex-shrink-0" />
                    <div>
                        <p className="text-xs font-bold leading-tight">{author}</p>
                        <p className="text-[9px] text-gray-500 flex items-center gap-0.5 mt-0.5">
                            <Clock className="w-2.5 h-2.5" />{time}
                        </p>
                    </div>
                </div>
                <MoreVertical className="w-4 h-4 text-gray-600" />
            </div>
            <p className="text-xs text-gray-300 leading-relaxed line-clamp-3 mb-4">{content}</p>
            <div className="flex items-center gap-4 text-gray-500">
                <span className="flex items-center gap-1.5 hover:text-red-400 transition-colors cursor-pointer">
                    <Heart className="w-3.5 h-3.5" /><span className="text-[10px]">2.4k</span>
                </span>
                <span className="flex items-center gap-1.5 hover:text-blue-400 transition-colors cursor-pointer">
                    <MessageCircle className="w-3.5 h-3.5" /><span className="text-[10px]">128</span>
                </span>
                <span className="flex items-center gap-1.5 hover:text-green-400 transition-colors cursor-pointer">
                    <Share2 className="w-3.5 h-3.5" />
                </span>
            </div>
        </div>
    );
}

// ── Chat Preview Card ──────────────────────────────────────────────────────────
export function ChatPreviewCard({ name, avatar, message, time, unread, isGroup }: {
    name: string; avatar: string; message: string; time: string;
    unread?: boolean; isGroup?: boolean;
}) {
    return (
        <div className="flex-shrink-0 w-60 md:w-72 bg-[#111111] hover:bg-[#181818] rounded-[1.25rem] border border-white/5 hover:border-white/10 p-3.5 flex items-center gap-3 cursor-pointer transition-all duration-200 group">
            <div className="relative flex-shrink-0">
                <div className="w-11 h-11 md:w-13 md:h-13 rounded-full overflow-hidden border border-white/10">
                    <img src={avatar} alt={name} className="w-full h-full object-cover" />
                </div>
                {unread && (
                    <div className="absolute top-0 right-0 w-3 h-3 bg-primary rounded-full border-2 border-[#111111]" />
                )}
            </div>
            <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-0.5">
                    <h4 className="font-bold text-sm truncate flex items-center gap-1.5 group-hover:text-primary transition-colors duration-200">
                        {name}
                        {isGroup && <Users className="w-3 h-3 text-primary flex-shrink-0" />}
                    </h4>
                    <span className="text-[10px] text-gray-500 flex-shrink-0 ml-2">{time}</span>
                </div>
                <p className="text-xs text-gray-400 truncate opacity-70 group-hover:opacity-100 transition-opacity duration-200">
                    {message}
                </p>
            </div>
        </div>
    );
}

// ── G. Video Card ──────────────────────────────────────────────────────────────
export function GVideoCard({ title, author, views, time, image, duration, postedTime }: {
    title: string; author: string; views: string; time: string;
    image: string; duration: string; postedTime: string;
}) {
    return (
        <div className="flex-shrink-0 w-64 md:w-80 group cursor-pointer">
            <div className="relative aspect-video rounded-2xl overflow-hidden mb-3 border border-white/5 shadow-lg">
                <img
                    src={image} alt={title}
                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                />
                <div className="absolute inset-0 bg-black/20 group-hover:bg-black/0 transition-colors duration-300" />
                <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center">
                    <div className="w-12 h-12 bg-primary/90 backdrop-blur-sm rounded-full flex items-center justify-center">
                        <Play className="w-5 h-5 text-white fill-white ml-0.5" />
                    </div>
                </div>
                <div className="absolute bottom-2 right-2 px-1.5 py-0.5 bg-black/80 backdrop-blur-md rounded text-[10px] font-bold border border-white/10">
                    {duration}
                </div>
            </div>
            <div className="flex gap-3">
                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-white/10 border border-white/5" />
                <div className="min-w-0">
                    <h4 className="font-bold text-sm line-clamp-2 leading-tight mb-1 group-hover:text-primary transition-colors duration-200">{title}</h4>
                    <p className="text-[10px] text-gray-500 flex flex-wrap gap-x-1.5">
                        <span>{author}</span>
                        <span>·</span>
                        <span>{views}</span>
                        <span>·</span>
                        <span>{time}</span>
                    </p>
                </div>
            </div>
        </div>
    );
}

// ── G. Stream Card ─────────────────────────────────────────────────────────────
export function GStreamCard({ title, author, status, viewers, waiting, image, startTime, likes, postedTime }: {
    title: string; author: string; status: "LIVE" | "UPCOMING" | "ENDED";
    viewers?: string; waiting?: string; image: string;
    startTime?: string; likes?: string; postedTime: string;
}) {
    const borderCls = status === "LIVE" ? "border-red-600/60" : status === "UPCOMING" ? "border-green-600/60" : "border-yellow-600/60";
    return (
        <div className="flex-shrink-0 w-64 md:w-80 group cursor-pointer">
            <div className={cn("relative aspect-video rounded-2xl overflow-hidden mb-3 shadow-lg border-2", borderCls)}>
                <img src={image} alt={title} className="w-full h-full object-cover" />

                {status === "LIVE" && (
                    <>
                        <div className="absolute top-3 left-3 flex items-center gap-1.5 px-2 py-1 bg-red-600 rounded-lg">
                            <span className="w-1.5 h-1.5 bg-white rounded-full animate-pulse" />
                            <span className="text-[10px] font-bold tracking-wide">LIVE</span>
                        </div>
                        {startTime && (
                            <div className="absolute top-3 right-3 px-2 py-1 bg-black/60 backdrop-blur-md rounded-lg border border-red-600/60 text-[10px] font-bold text-red-400">
                                {startTime}
                            </div>
                        )}
                    </>
                )}
                {status === "UPCOMING" && (
                    <div className="absolute top-3 left-3 px-2 py-1 bg-green-600 rounded-lg text-[10px] font-bold">UPCOMING</div>
                )}
                {status === "ENDED" && (
                    <div className="absolute top-3 left-3 px-2 py-1 bg-yellow-600 rounded-lg text-[10px] font-bold text-black">ENDED</div>
                )}

                <div className="absolute bottom-3 left-3 flex items-center gap-2 px-2 py-1 bg-black/60 backdrop-blur-md rounded-lg border border-white/10">
                    {status === "LIVE" ? (
                        <><Eye className="w-3 h-3 text-red-400" /><span className="text-[10px] font-bold">{viewers}</span></>
                    ) : status === "UPCOMING" ? (
                        <><Users className="w-3 h-3 text-green-400" /><span className="text-[10px] font-bold">{waiting}</span></>
                    ) : (
                        <div className="flex items-center gap-3">
                            <span className="flex items-center gap-1"><Eye className="w-3 h-3 text-yellow-400" /><span className="text-[10px] font-bold">{viewers}</span></span>
                            <span className="flex items-center gap-1"><ThumbsUp className="w-3 h-3 text-yellow-400" /><span className="text-[10px] font-bold">{likes}</span></span>
                        </div>
                    )}
                </div>
            </div>
            <h4 className="font-bold text-sm truncate mb-0.5 group-hover:text-primary transition-colors duration-200">{title}</h4>
            <div className="flex items-center justify-between">
                <span className="text-[10px] text-gray-500">{author}</span>
                <span className="text-[10px] text-primary/70 font-bold flex items-center gap-1"><Clock className="w-2.5 h-2.5" />{postedTime}</span>
            </div>
        </div>
    );
}

// ── V. Stream Card (9:16) ──────────────────────────────────────────────────────
export function VStreamCard({ title, author, status, viewers, waiting, image, startTime, likes, postedTime }: {
    title: string; author: string; status: "LIVE" | "UPCOMING" | "ENDED";
    viewers?: string; waiting?: string; image: string;
    startTime?: string; likes?: string; postedTime: string;
}) {
    const borderCls = status === "LIVE" ? "border-red-600/60" : status === "UPCOMING" ? "border-green-600/60" : "border-yellow-600/60";
    return (
        <div className="flex-shrink-0 w-40 md:w-52 group cursor-pointer">
            <div className={cn("relative aspect-[9/16] rounded-2xl overflow-hidden mb-2 shadow-lg border-2", borderCls)}>
                <img src={image} alt={title} className="w-full h-full object-cover" />
                {status === "LIVE" && (
                    <div className="absolute top-3 left-3 flex items-center gap-1.5 px-2 py-1 bg-red-600 rounded-lg w-fit">
                        <span className="w-1.5 h-1.5 bg-white rounded-full animate-pulse" />
                        <span className="text-[10px] font-bold">LIVE</span>
                    </div>
                )}
                {status === "UPCOMING" && (
                    <div className="absolute top-3 left-3 px-2 py-1 bg-green-600 rounded-lg text-[10px] font-bold">UPCOMING</div>
                )}
                {status === "ENDED" && (
                    <div className="absolute top-3 left-3 px-2 py-1 bg-yellow-600 rounded-lg text-[10px] font-bold text-black">ENDED</div>
                )}
                <div className="absolute bottom-0 left-0 right-0 p-3 bg-gradient-to-t from-black/90 to-transparent">
                    <p className="font-bold text-[10px] truncate mb-1">{title}</p>
                    <div className="flex items-center justify-between">
                        {status === "LIVE" ? (
                            <span className="flex items-center gap-1 text-[9px] font-bold"><Eye className="w-3 h-3 text-red-400" />{viewers}</span>
                        ) : status === "UPCOMING" ? (
                            <span className="flex items-center gap-1 text-[9px] font-bold"><Users className="w-3 h-3 text-green-400" />{waiting}</span>
                        ) : (
                            <span className="flex items-center gap-1 text-[9px] font-bold"><Eye className="w-3 h-3 text-yellow-400" />{viewers}</span>
                        )}
                        <span className="text-[8px] text-white/40 font-bold">{postedTime}</span>
                    </div>
                </div>
            </div>
            <p className="text-[10px] text-center text-gray-500 truncate">{author}</p>
        </div>
    );
}

// ── V. Video Card (9:16) ───────────────────────────────────────────────────────
export function VVideoCard({ author, image, views, likes, duration, postedTime }: {
    author: string; image: string; views: string;
    likes: string; duration: string; postedTime: string;
}) {
    return (
        <div className="flex-shrink-0 w-32 md:w-44 aspect-[9/16] relative rounded-[1.5rem] overflow-hidden group cursor-pointer border border-white/5">
            <img
                src={image} alt="Vertical video"
                className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-transparent to-transparent" />
            <div className="absolute inset-0 flex flex-col justify-between p-3">
                <div />
                <div>
                    <div className="flex items-center gap-1.5 mb-2">
                        <div className="w-5 h-5 rounded-full bg-white/20 border border-white/30 flex-shrink-0" />
                        <span className="text-[9px] font-bold truncate">{author}</span>
                    </div>
                    <div className="flex items-center justify-between">
                        <div className="flex flex-col gap-0.5">
                            <span className="flex items-center gap-1 text-[9px] font-bold"><Eye className="w-2.5 h-2.5" />{views}</span>
                            <span className="flex items-center gap-1 text-[9px] font-bold"><Heart className="w-2.5 h-2.5" />{likes}</span>
                        </div>
                        <div className="flex flex-col items-end gap-0.5">
                            <span className="px-1.5 py-0.5 bg-black/60 rounded text-[9px] font-bold border border-white/10">{duration}</span>
                            <span className="text-[8px] text-white/40 font-bold">{postedTime}</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

// ── Profile Card ───────────────────────────────────────────────────────────────
export function ProfileCard({ name, handle, image }: {
    name: string; handle: string; image: string;
}) {
    return (
        <div className="flex-shrink-0 w-36 md:w-48 nx-glass rounded-[2rem] p-5 text-center flex flex-col items-center hover:border-primary/20 transition-all duration-200 cursor-pointer">
            <div className="relative mb-3">
                <div className="w-16 h-16 rounded-full bg-gradient-to-tr from-primary to-blue-500 p-[2px]">
                    <div className="w-full h-full rounded-full bg-[#0a0a0a] p-0.5">
                        <img src={image} alt={name} className="w-full h-full rounded-full object-cover" />
                    </div>
                </div>
                <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-primary rounded-full border-4 border-[#050505] flex items-center justify-center">
                    <Check className="w-2.5 h-2.5 text-white" strokeWidth={3} />
                </div>
            </div>
            <h4 className="font-bold text-xs mb-0.5 truncate w-full text-center">{name}</h4>
            <p className="text-[9px] text-gray-500 mb-3 truncate w-full text-center">{handle}</p>
            <button className="w-full py-1.5 bg-white/10 hover:bg-primary hover:text-white text-[10px] font-bold rounded-lg transition-all duration-200 active:scale-95 border border-white/10 hover:border-primary">
                Kuzatish
            </button>
        </div>
    );
}
