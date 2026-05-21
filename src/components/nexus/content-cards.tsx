"use client";

import {
    Play, Heart, Share2, MoreVertical, Music as MusicIcon,
    Star, Eye, Clock, ThumbsUp, Users, Calendar, Check,
    MessageCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";

// Shared: gradient play button
function PlayBtn({ size = "md" }: { size?: "sm" | "md" }) {
    const cls = size === "sm"
        ? "w-9 h-9 scale-75 group-hover:scale-100"
        : "w-12 h-12 scale-75 group-hover:scale-100";
    return (
        <div
            className={cn("rounded-full flex items-center justify-center transition-transform duration-200 shadow-2xl", cls)}
            style={{
                background: "linear-gradient(135deg, #2B3EE8 0%, #00CEC8 100%)",
                boxShadow: "0 0 30px rgba(43,62,232,0.6), 0 0 60px rgba(0,206,200,0.2)",
            }}
        >
            <Play className={cn("text-white fill-white ml-0.5", size === "sm" ? "w-4 h-4" : "w-5 h-5")} />
        </div>
    );
}

// ── G. Cinema Card (16:9) ──────────────────────────────────────────────────────
export function GCinemaCard({
    title, image, duration, views, rating, likes, year, postedTime,
}: {
    title: string; image: string; duration: string; views: string;
    rating: string; likes: string; year: string; postedTime: string;
}) {
    return (
        <div className="flex-shrink-0 w-64 md:w-80 group cursor-pointer">
            <div
                className="relative aspect-video rounded-2xl overflow-hidden mb-3 shadow-xl"
                style={{ border: "1px solid rgba(43,62,232,0.20)" }}
            >
                <img
                    src={image} alt={title}
                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-[#060B1A]/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center">
                    <PlayBtn />
                </div>
                <div
                    className="absolute bottom-2 right-2 px-1.5 py-0.5 rounded text-[10px] font-bold"
                    style={{ background: "rgba(6,11,26,0.85)", border: "1px solid rgba(43,62,232,0.25)" }}
                >
                    {duration}
                </div>
            </div>
            <h4 className="font-bold text-sm truncate mb-1 text-white group-hover:nx-gradient-text transition-colors duration-200">{title}</h4>
            <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[10px]" style={{ color: "#4a5a8a" }}>
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
            <div
                className="relative aspect-[2/3] rounded-2xl overflow-hidden mb-3 shadow-xl"
                style={{ border: "1px solid rgba(43,62,232,0.20)" }}
            >
                <img
                    src={image} alt={title}
                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-[#060B1A]/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center">
                    <PlayBtn />
                </div>
                <div
                    className="absolute bottom-2 right-2 px-1.5 py-0.5 rounded text-[10px] font-bold"
                    style={{ background: "rgba(6,11,26,0.85)", border: "1px solid rgba(43,62,232,0.25)" }}
                >
                    {duration}
                </div>
            </div>
            <h4 className="font-bold text-sm truncate group-hover:nx-gradient-text transition-colors duration-200 mb-1 text-white">{title}</h4>
            <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[10px]" style={{ color: "#4a5a8a" }}>
                <span className="flex items-center gap-1"><Eye className="w-3 h-3" />{views}</span>
                <span className="flex items-center gap-1 text-yellow-500"><Star className="w-3 h-3 fill-yellow-500" />{rating}</span>
                <span className="flex items-center gap-1"><ThumbsUp className="w-3 h-3" />{likes}</span>
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
            <div
                className="relative aspect-square rounded-[1.5rem] overflow-hidden mb-3 shadow-xl"
                style={{ border: "1px solid rgba(43,62,232,0.20)" }}
            >
                <img src={image} alt={title} className="w-full h-full object-cover" />
                <div
                    className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center"
                    style={{ background: "rgba(6,11,26,0.65)", backdropFilter: "blur(4px)" }}
                >
                    <div
                        className="w-10 h-10 rounded-full flex items-center justify-center"
                        style={{
                            background: "rgba(11,20,45,0.70)",
                            border: "1px solid rgba(43,62,232,0.50)",
                        }}
                    >
                        <MusicIcon className="w-5 h-5" style={{ color: "#00CEC8" }} />
                    </div>
                </div>
                <div
                    className="absolute bottom-2 right-2 px-1.5 py-0.5 rounded text-[10px] font-bold"
                    style={{ background: "rgba(6,11,26,0.85)", border: "1px solid rgba(43,62,232,0.25)" }}
                >
                    {duration}
                </div>
            </div>
            <h4 className="font-bold text-xs truncate mb-0.5 text-white group-hover:nx-gradient-text transition-colors duration-200">{title}</h4>
            <p className="text-[10px] truncate mb-1" style={{ color: "#4a5a8a" }}>{artist}</p>
            <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[9px]" style={{ color: "#4a5a8a" }}>
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
        <div
            className="flex-shrink-0 w-64 md:w-80 rounded-[1.5rem] p-5 transition-all duration-200 cursor-pointer"
            style={{
                background: "rgba(11,20,45,0.55)",
                border: "1px solid rgba(43,62,232,0.18)",
            }}
            onMouseEnter={e => (e.currentTarget as HTMLElement).style.borderColor = "rgba(43,62,232,0.40)"}
            onMouseLeave={e => (e.currentTarget as HTMLElement).style.borderColor = "rgba(43,62,232,0.18)"}
        >
            <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2.5">
                    <div
                        className="w-8 h-8 rounded-full flex-shrink-0"
                        style={{
                            background: "linear-gradient(135deg,rgba(43,62,232,0.40),rgba(0,206,200,0.30))",
                            border: "1px solid rgba(43,62,232,0.35)",
                        }}
                    />
                    <div>
                        <p className="text-xs font-bold leading-tight text-white">{author}</p>
                        <p className="text-[9px] flex items-center gap-0.5 mt-0.5" style={{ color: "#4a5a8a" }}>
                            <Clock className="w-2.5 h-2.5" />{time}
                        </p>
                    </div>
                </div>
                <MoreVertical className="w-4 h-4" style={{ color: "#4a5a8a" }} />
            </div>
            <p className="text-xs text-[#8090b0] leading-relaxed line-clamp-3 mb-4">{content}</p>
            <div className="flex items-center gap-4" style={{ color: "#4a5a8a" }}>
                <span className="flex items-center gap-1.5 hover:text-red-400 transition-colors cursor-pointer">
                    <Heart className="w-3.5 h-3.5" /><span className="text-[10px]">2.4k</span>
                </span>
                <span className="flex items-center gap-1.5 transition-colors cursor-pointer hover:text-[#7dd3fc]">
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
        <div
            className="flex-shrink-0 w-60 md:w-72 rounded-[1.25rem] p-3.5 flex items-center gap-3 cursor-pointer transition-all duration-200 group"
            style={{
                background: "rgba(11,20,45,0.60)",
                border: "1px solid rgba(43,62,232,0.18)",
            }}
            onMouseEnter={e => {
                (e.currentTarget as HTMLElement).style.background = "rgba(43,62,232,0.10)";
                (e.currentTarget as HTMLElement).style.borderColor = "rgba(43,62,232,0.38)";
            }}
            onMouseLeave={e => {
                (e.currentTarget as HTMLElement).style.background = "rgba(11,20,45,0.60)";
                (e.currentTarget as HTMLElement).style.borderColor = "rgba(43,62,232,0.18)";
            }}
        >
            <div className="relative flex-shrink-0">
                <div
                    className="w-11 h-11 rounded-full overflow-hidden p-[2px]"
                    style={{ background: "linear-gradient(135deg,#2B3EE8,#00CEC8)" }}
                >
                    <div className="w-full h-full rounded-full overflow-hidden bg-[#060B1A]">
                        <img src={avatar} alt={name} className="w-full h-full object-cover" />
                    </div>
                </div>
                {unread && (
                    <div
                        className="absolute top-0 right-0 w-3 h-3 rounded-full border-2"
                        style={{ background: "#00CEC8", borderColor: "#060B1A" }}
                    />
                )}
            </div>
            <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-0.5">
                    <h4 className="font-bold text-sm truncate flex items-center gap-1.5 text-white group-hover:nx-gradient-text transition-colors duration-200">
                        {name}
                        {isGroup && <Users className="w-3 h-3 flex-shrink-0" style={{ color: "#00CEC8" }} />}
                    </h4>
                    <span className="text-[10px] flex-shrink-0 ml-2" style={{ color: "#4a5a8a" }}>{time}</span>
                </div>
                <p className="text-xs truncate opacity-70 group-hover:opacity-100 transition-opacity duration-200" style={{ color: "#8090b0" }}>
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
            <div
                className="relative aspect-video rounded-2xl overflow-hidden mb-3 shadow-xl"
                style={{ border: "1px solid rgba(43,62,232,0.20)" }}
            >
                <img
                    src={image} alt={title}
                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                />
                <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center"
                    style={{ background: "rgba(6,11,26,0.35)" }}>
                    <PlayBtn />
                </div>
                <div
                    className="absolute bottom-2 right-2 px-1.5 py-0.5 rounded text-[10px] font-bold"
                    style={{ background: "rgba(6,11,26,0.85)", border: "1px solid rgba(43,62,232,0.25)" }}
                >
                    {duration}
                </div>
            </div>
            <div className="flex gap-3">
                <div
                    className="flex-shrink-0 w-8 h-8 rounded-full"
                    style={{ background: "linear-gradient(135deg,rgba(43,62,232,0.40),rgba(0,206,200,0.30))", border: "1px solid rgba(43,62,232,0.25)" }}
                />
                <div className="min-w-0">
                    <h4 className="font-bold text-sm line-clamp-2 leading-tight mb-1 text-white group-hover:nx-gradient-text transition-colors duration-200">{title}</h4>
                    <p className="text-[10px] flex flex-wrap gap-x-1.5" style={{ color: "#4a5a8a" }}>
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
    const borderColor =
        status === "LIVE"     ? "rgba(239,68,68,0.60)"  :
        status === "UPCOMING" ? "rgba(34,197,94,0.60)"  :
                                "rgba(234,179,8,0.60)";
    return (
        <div className="flex-shrink-0 w-64 md:w-80 group cursor-pointer">
            <div className="relative aspect-video rounded-2xl overflow-hidden mb-3 shadow-xl"
                style={{ border: `2px solid ${borderColor}` }}>
                <img src={image} alt={title} className="w-full h-full object-cover" />

                {status === "LIVE" && (
                    <>
                        <div className="absolute top-3 left-3 flex items-center gap-1.5 px-2 py-1 bg-red-600 rounded-lg">
                            <span className="w-1.5 h-1.5 bg-white rounded-full animate-pulse" />
                            <span className="text-[10px] font-bold tracking-wide">LIVE</span>
                        </div>
                        {startTime && (
                            <div className="absolute top-3 right-3 px-2 py-1 rounded-lg text-[10px] font-bold text-red-400"
                                style={{ background: "rgba(6,11,26,0.75)", backdropFilter: "blur(8px)", border: "1px solid rgba(239,68,68,0.45)" }}>
                                {startTime}
                            </div>
                        )}
                    </>
                )}
                {status === "UPCOMING" && (
                    <div className="absolute top-3 left-3 px-2 py-1 bg-green-600 rounded-lg text-[10px] font-bold">UPCOMING</div>
                )}
                {status === "ENDED" && (
                    <div className="absolute top-3 left-3 px-2 py-1 bg-yellow-500 rounded-lg text-[10px] font-bold text-black">ENDED</div>
                )}

                <div className="absolute bottom-3 left-3 flex items-center gap-2 px-2 py-1 rounded-lg"
                    style={{ background: "rgba(6,11,26,0.75)", backdropFilter: "blur(8px)", border: "1px solid rgba(43,62,232,0.20)" }}>
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
            <h4 className="font-bold text-sm truncate mb-0.5 text-white group-hover:nx-gradient-text transition-colors duration-200">{title}</h4>
            <div className="flex items-center justify-between">
                <span className="text-[10px]" style={{ color: "#4a5a8a" }}>{author}</span>
                <span className="text-[10px] font-bold flex items-center gap-1 nx-gradient-text">
                    <Clock className="w-2.5 h-2.5" />{postedTime}
                </span>
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
    const borderColor =
        status === "LIVE"     ? "rgba(239,68,68,0.60)"  :
        status === "UPCOMING" ? "rgba(34,197,94,0.60)"  :
                                "rgba(234,179,8,0.60)";
    return (
        <div className="flex-shrink-0 w-40 md:w-52 group cursor-pointer">
            <div className="relative aspect-[9/16] rounded-2xl overflow-hidden mb-2 shadow-xl"
                style={{ border: `2px solid ${borderColor}` }}>
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
                    <div className="absolute top-3 left-3 px-2 py-1 bg-yellow-500 rounded-lg text-[10px] font-bold text-black">ENDED</div>
                )}
                <div className="absolute bottom-0 left-0 right-0 p-3"
                    style={{ background: "linear-gradient(to top, rgba(6,11,26,0.95), transparent)" }}>
                    <p className="font-bold text-[10px] truncate mb-1">{title}</p>
                    <div className="flex items-center justify-between">
                        {status === "LIVE" ? (
                            <span className="flex items-center gap-1 text-[9px] font-bold"><Eye className="w-3 h-3 text-red-400" />{viewers}</span>
                        ) : status === "UPCOMING" ? (
                            <span className="flex items-center gap-1 text-[9px] font-bold"><Users className="w-3 h-3 text-green-400" />{waiting}</span>
                        ) : (
                            <span className="flex items-center gap-1 text-[9px] font-bold"><Eye className="w-3 h-3 text-yellow-400" />{viewers}</span>
                        )}
                        <span className="text-[8px] font-bold" style={{ color: "rgba(255,255,255,0.40)" }}>{postedTime}</span>
                    </div>
                </div>
            </div>
            <p className="text-[10px] text-center truncate" style={{ color: "#4a5a8a" }}>{author}</p>
        </div>
    );
}

// ── V. Video Card (9:16) ───────────────────────────────────────────────────────
export function VVideoCard({ author, image, views, likes, duration, postedTime }: {
    author: string; image: string; views: string;
    likes: string; duration: string; postedTime: string;
}) {
    return (
        <div
            className="flex-shrink-0 w-32 md:w-44 aspect-[9/16] relative rounded-[1.5rem] overflow-hidden group cursor-pointer"
            style={{ border: "1px solid rgba(43,62,232,0.20)" }}
        >
            <img
                src={image} alt="Vertical video"
                className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
            />
            <div className="absolute inset-0"
                style={{ background: "linear-gradient(to top, rgba(6,11,26,0.92) 0%, transparent 55%)" }} />
            <div className="absolute inset-0 flex flex-col justify-between p-3">
                <div />
                <div>
                    <div className="flex items-center gap-1.5 mb-2">
                        <div
                            className="w-5 h-5 rounded-full flex-shrink-0 overflow-hidden"
                            style={{ background: "linear-gradient(135deg,rgba(43,62,232,0.60),rgba(0,206,200,0.50))", border: "1px solid rgba(43,62,232,0.40)" }}
                        />
                        <span className="text-[9px] font-bold truncate">{author}</span>
                    </div>
                    <div className="flex items-center justify-between">
                        <div className="flex flex-col gap-0.5">
                            <span className="flex items-center gap-1 text-[9px] font-bold"><Eye className="w-2.5 h-2.5" />{views}</span>
                            <span className="flex items-center gap-1 text-[9px] font-bold"><Heart className="w-2.5 h-2.5" />{likes}</span>
                        </div>
                        <div className="flex flex-col items-end gap-0.5">
                            <span className="px-1.5 py-0.5 rounded text-[9px] font-bold"
                                style={{ background: "rgba(6,11,26,0.80)", border: "1px solid rgba(43,62,232,0.25)" }}>
                                {duration}
                            </span>
                            <span className="text-[8px] font-bold" style={{ color: "rgba(255,255,255,0.35)" }}>{postedTime}</span>
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
        <div
            className="flex-shrink-0 w-36 md:w-48 rounded-[2rem] p-5 text-center flex flex-col items-center cursor-pointer transition-all duration-200 group"
            style={{
                background: "rgba(11,20,45,0.55)",
                border: "1px solid rgba(43,62,232,0.18)",
            }}
            onMouseEnter={e => {
                (e.currentTarget as HTMLElement).style.background = "rgba(43,62,232,0.10)";
                (e.currentTarget as HTMLElement).style.borderColor = "rgba(43,62,232,0.40)";
            }}
            onMouseLeave={e => {
                (e.currentTarget as HTMLElement).style.background = "rgba(11,20,45,0.55)";
                (e.currentTarget as HTMLElement).style.borderColor = "rgba(43,62,232,0.18)";
            }}
        >
            <div className="relative mb-3">
                {/* Gradient ring */}
                <div
                    className="w-16 h-16 rounded-full p-[2px]"
                    style={{ background: "linear-gradient(135deg, #2B3EE8 0%, #00CEC8 100%)" }}
                >
                    <div className="w-full h-full rounded-full bg-[#060B1A] p-0.5 overflow-hidden">
                        <img src={image} alt={name} className="w-full h-full rounded-full object-cover" />
                    </div>
                </div>
                {/* Verified badge */}
                <div
                    className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full border-[2.5px] flex items-center justify-center"
                    style={{
                        background: "linear-gradient(135deg,#2B3EE8,#00CEC8)",
                        borderColor: "#060B1A",
                    }}
                >
                    <Check className="w-2.5 h-2.5 text-white" strokeWidth={3} />
                </div>
            </div>
            <h4 className="font-bold text-xs mb-0.5 truncate w-full text-center text-white">{name}</h4>
            <p className="text-[9px] mb-3 truncate w-full text-center" style={{ color: "#4a5a8a" }}>{handle}</p>
            <button
                className="w-full py-1.5 text-[10px] font-bold rounded-lg transition-all duration-200 active:scale-95 text-white"
                style={{
                    background: "rgba(43,62,232,0.18)",
                    border: "1px solid rgba(43,62,232,0.35)",
                }}
                onMouseEnter={e => {
                    (e.currentTarget as HTMLElement).style.background = "linear-gradient(135deg,#2B3EE8,#00CEC8)";
                    (e.currentTarget as HTMLElement).style.borderColor = "transparent";
                }}
                onMouseLeave={e => {
                    (e.currentTarget as HTMLElement).style.background = "rgba(43,62,232,0.18)";
                    (e.currentTarget as HTMLElement).style.borderColor = "rgba(43,62,232,0.35)";
                }}
            >
                Kuzatish
            </button>
        </div>
    );
}
