"use client";

import { Play, Eye, Star, Heart, Radio, BookOpen, Music2, Clock } from "lucide-react";
import { useNxPlayer, type NxVideo, type NxTrack, type NxShort } from "./nx-player-ctx";

// ─────────────────────────────────────────────────────────────────────────────
// Umumiy yordamchilar
// ─────────────────────────────────────────────────────────────────────────────
function Duration({ label }: { label: string }) {
    return (
        <span
            className="absolute bottom-2 right-2 px-1.5 py-0.5 rounded text-[9px] font-bold"
            style={{ background: "rgba(5,8,24,0.82)", border: "1px solid rgba(43,62,232,0.25)" }}
        >
            {label}
        </span>
    );
}

function PlayOverlay() {
    return (
        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-250">
            <div
                className="w-11 h-11 rounded-full flex items-center justify-center scale-75 group-hover:scale-100 transition-transform duration-200"
                style={{
                    background: "linear-gradient(135deg,#2B3EE8,#00CEC8)",
                    boxShadow: "0 0 24px rgba(43,62,232,0.70), 0 0 48px rgba(0,206,200,0.25)",
                }}
            >
                <Play className="w-4 h-4 text-white fill-white ml-0.5" />
            </div>
        </div>
    );
}

// ─────────────────────────────────────────────────────────────────────────────
// VideoCard — 16:9 (YouTube uslubi)
// ─────────────────────────────────────────────────────────────────────────────
export function VideoCard({ title, image, views, duration, author, avatar }: {
    title: string; image: string; views: string; duration: string;
    author: string; avatar: string;
}) {
    const { openVideo, openChannel } = useNxPlayer();
    const video: NxVideo = { title, image, author, avatar, views, duration };
    return (
        <div className="flex-shrink-0 w-60 md:w-72 group cursor-pointer" onClick={() => openVideo(video)}>
            {/* Thumbnail */}
            <div
                className="relative aspect-video rounded-xl overflow-hidden mb-2.5"
                style={{ border: "1px solid rgba(43,62,232,0.18)" }}
            >
                <img src={image} alt={title} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" />
                <div className="absolute inset-0 transition-colors duration-250" style={{ background: "rgba(5,8,24,0.15)" }} />
                <PlayOverlay />
                <Duration label={duration} />
            </div>

            {/* Info */}
            <div className="flex gap-2.5">
                {/* Avatar — click opens channel */}
                <div
                    className="flex-shrink-0 w-8 h-8 rounded-full overflow-hidden mt-0.5 cursor-pointer hover:ring-2 hover:ring-[#2B3EE8] transition-all duration-150"
                    style={{ background: "linear-gradient(135deg,rgba(43,62,232,0.40),rgba(0,206,200,0.30))", border: "1px solid rgba(43,62,232,0.25)" }}
                    onClick={e => { e.stopPropagation(); openChannel(author); }}
                >
                    <img src={avatar} alt={author} className="w-full h-full object-cover" />
                </div>
                <div className="min-w-0">
                    <h4 className="text-sm font-bold text-white leading-snug line-clamp-2 mb-1 group-hover:text-[#00CEC8] transition-colors duration-200">
                        {title}
                    </h4>
                    <p className="text-[10px] flex items-center gap-2" style={{ color: "rgba(100,120,170,0.80)" }}>
                        <span
                            className="hover:text-[#00CEC8] transition-colors cursor-pointer"
                            onClick={e => { e.stopPropagation(); openChannel(author); }}
                        >{author}</span>
                        <span>·</span>
                        <span className="flex items-center gap-0.5"><Eye className="w-2.5 h-2.5" />{views}</span>
                    </p>
                </div>
            </div>
        </div>
    );
}

// ─────────────────────────────────────────────────────────────────────────────
// ShortCard — 9:16 (Reels/Shorts)
// ─────────────────────────────────────────────────────────────────────────────
export function ShortCard({ image, author, views, likes, duration, onClick }: {
    image: string; author: string; views: string; likes: string; duration: string; onClick?: () => void;
}) {
    return (
        <div
            onClick={onClick}
            className="flex-shrink-0 w-[120px] md:w-[140px] aspect-[9/16] relative rounded-2xl overflow-hidden group cursor-pointer"
            style={{ border: "1px solid rgba(43,62,232,0.20)" }}
        >
            <img src={image} alt={author} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" />

            {/* Overlay */}
            <div className="absolute inset-0" style={{ background: "linear-gradient(to top, rgba(5,8,24,0.92) 0%, transparent 55%)" }} />

            {/* Play overlay */}
            <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-250">
                <div
                    className="w-10 h-10 rounded-full flex items-center justify-center"
                    style={{ background: "linear-gradient(135deg,#2B3EE8,#00CEC8)", boxShadow: "0 0 20px rgba(43,62,232,0.60)" }}
                >
                    <Play className="w-4 h-4 text-white fill-white ml-0.5" />
                </div>
            </div>

            {/* Duration */}
            <span
                className="absolute top-2 right-2 px-1.5 py-0.5 rounded text-[9px] font-bold"
                style={{ background: "rgba(5,8,24,0.80)", border: "1px solid rgba(43,62,232,0.25)" }}
            >
                {duration}
            </span>

            {/* Bottom info */}
            <div className="absolute bottom-0 left-0 right-0 p-2.5">
                <p className="text-[10px] font-bold text-white truncate mb-1.5">{author}</p>
                <div className="flex items-center justify-between">
                    <span className="flex items-center gap-0.5 text-[9px] font-bold" style={{ color: "rgba(160,180,220,0.80)" }}>
                        <Eye className="w-2.5 h-2.5" />{views}
                    </span>
                    <span className="flex items-center gap-0.5 text-[9px] font-bold" style={{ color: "rgba(160,180,220,0.80)" }}>
                        <Heart className="w-2.5 h-2.5" />{likes}
                    </span>
                </div>
            </div>
        </div>
    );
}

// ─────────────────────────────────────────────────────────────────────────────
// LiveCard — 16:9 efir kartasi
// ─────────────────────────────────────────────────────────────────────────────
export function LiveCard({ title, image, author, viewers, category }: {
    title: string; image: string; author: string; viewers: string; category: string;
}) {
    const { openVideo } = useNxPlayer();
    const video: NxVideo = {
        title, image, author,
        avatar: `https://api.dicebear.com/9.x/avataaars/svg?seed=${author}`,
        views: viewers, duration: "LIVE", category,
    };
    return (
        <div className="flex-shrink-0 w-60 md:w-72 group cursor-pointer" onClick={() => openVideo(video)}>
            <div
                className="relative aspect-video rounded-xl overflow-hidden mb-2.5"
                style={{ border: "2px solid rgba(239,68,68,0.50)", boxShadow: "0 0 16px rgba(239,68,68,0.18)" }}
            >
                <img src={image} alt={title} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" />
                <div className="absolute inset-0" style={{ background: "rgba(5,8,24,0.20)" }} />

                {/* LIVE badge */}
                <div
                    className="absolute top-2.5 left-2.5 flex items-center gap-1.5 px-2 py-1 rounded-lg text-[10px] font-black"
                    style={{ background: "linear-gradient(90deg,#EF4444,#F97316)", boxShadow: "0 0 10px rgba(239,68,68,0.50)" }}
                >
                    <span className="w-1.5 h-1.5 bg-white rounded-full animate-pulse" />
                    LIVE
                </div>

                {/* Viewers */}
                <div
                    className="absolute bottom-2.5 left-2.5 flex items-center gap-1.5 px-2 py-1 rounded-lg text-[10px] font-bold"
                    style={{ background: "rgba(5,8,24,0.75)", backdropFilter: "blur(8px)", border: "1px solid rgba(239,68,68,0.30)" }}
                >
                    <Radio className="w-3 h-3 text-red-400" />
                    <span style={{ color: "rgba(220,230,255,0.90)" }}>{viewers}</span>
                </div>

                {/* Category */}
                <div
                    className="absolute top-2.5 right-2.5 px-2 py-1 rounded-lg text-[9px] font-bold"
                    style={{ background: "rgba(5,8,24,0.70)", backdropFilter: "blur(8px)", color: "rgba(160,180,220,0.90)" }}
                >
                    {category}
                </div>
            </div>

            <div className="flex gap-2.5">
                <div
                    className="flex-shrink-0 w-8 h-8 rounded-full overflow-hidden mt-0.5"
                    style={{ border: "2px solid rgba(239,68,68,0.40)" }}
                >
                    <img src={`https://api.dicebear.com/9.x/avataaars/svg?seed=${author}`} alt={author} className="w-full h-full object-cover" />
                </div>
                <div>
                    <h4 className="text-sm font-bold text-white leading-snug line-clamp-1 mb-0.5 group-hover:text-red-400 transition-colors duration-200">{title}</h4>
                    <p className="text-[10px]" style={{ color: "rgba(100,120,170,0.80)" }}>{author}</p>
                </div>
            </div>
        </div>
    );
}

// ─────────────────────────────────────────────────────────────────────────────
// MusicCard — kvadrat
// ─────────────────────────────────────────────────────────────────────────────
export function MusicCard({ title, artist, image, duration, listens, track: trackProp, allTracks, trackIndex }: {
    title: string; artist: string; image: string; duration: string; listens: string;
    track?: NxTrack; allTracks?: NxTrack[]; trackIndex?: number;
}) {
    const { playTrack, playQueue } = useNxPlayer();
    const durationParts = duration.split(":").map(Number);
    const durationSec   = (durationParts[0] ?? 0) * 60 + (durationParts[1] ?? 0);
    const track: NxTrack = trackProp ?? { title, artist, image, duration, durationSec };
    const handleClick = () => {
        if (allTracks && trackIndex !== undefined) playQueue(allTracks, trackIndex);
        else playTrack(track);
    };
    return (
        <div className="flex-shrink-0 w-36 md:w-44 group cursor-pointer" onClick={handleClick}>
            <div
                className="relative aspect-square rounded-2xl overflow-hidden mb-2.5"
                style={{ border: "1px solid rgba(43,62,232,0.20)" }}
            >
                <img src={image} alt={title} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" />
                <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-250 flex items-center justify-center"
                    style={{ background: "rgba(5,8,24,0.55)", backdropFilter: "blur(4px)" }}>
                    <div
                        className="w-11 h-11 rounded-full flex items-center justify-center"
                        style={{ background: "linear-gradient(135deg,#2B3EE8,#00CEC8)", boxShadow: "0 0 24px rgba(43,62,232,0.60)" }}
                    >
                        <Music2 className="w-5 h-5 text-white" />
                    </div>
                </div>
                <Duration label={duration} />
            </div>
            <h4 className="text-sm font-bold text-white truncate mb-0.5 group-hover:text-[#00CEC8] transition-colors duration-200">{title}</h4>
            <p className="text-[10px] truncate mb-1" style={{ color: "rgba(100,120,170,0.80)" }}>{artist}</p>
            <span className="flex items-center gap-1 text-[9px]" style={{ color: "rgba(80,100,150,0.80)" }}>
                <Eye className="w-2.5 h-2.5" />{listens}
            </span>
        </div>
    );
}

// ─────────────────────────────────────────────────────────────────────────────
// BookCard — kitob muqovasi
// ─────────────────────────────────────────────────────────────────────────────
export function BookCard({ title, author, image, rating, pages, type }: {
    title: string; author: string; image: string; rating: string; pages: string; type: "ebook" | "audio";
}) {
    return (
        <div className="flex-shrink-0 w-32 md:w-40 group cursor-pointer">
            <div
                className="relative aspect-[2/3] rounded-xl overflow-hidden mb-2.5"
                style={{ border: "1px solid rgba(43,62,232,0.20)", boxShadow: "4px 4px 16px rgba(0,0,0,0.40)" }}
            >
                <img src={image} alt={title} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" />
                <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-250 flex items-center justify-center"
                    style={{ background: "rgba(5,8,24,0.60)" }}>
                    <div
                        className="w-10 h-10 rounded-full flex items-center justify-center"
                        style={{ background: "linear-gradient(135deg,#2B3EE8,#00CEC8)", boxShadow: "0 0 20px rgba(43,62,232,0.60)" }}
                    >
                        <BookOpen className="w-4 h-4 text-white" />
                    </div>
                </div>

                {/* Audio/Ebook badge */}
                <span
                    className="absolute top-2 left-2 px-1.5 py-0.5 rounded text-[8px] font-black"
                    style={type === "audio"
                        ? { background: "linear-gradient(90deg,#8B5CF6,#6366F1)" }
                        : { background: "linear-gradient(90deg,#2B3EE8,#00CEC8)" }
                    }
                >
                    {type === "audio" ? "AUDIO" : "EBOOK"}
                </span>
            </div>
            <h4 className="text-xs font-bold text-white leading-snug line-clamp-2 mb-0.5 group-hover:text-[#00CEC8] transition-colors duration-200">{title}</h4>
            <p className="text-[10px] truncate mb-1" style={{ color: "rgba(100,120,170,0.80)" }}>{author}</p>
            <div className="flex items-center gap-2 text-[9px]" style={{ color: "rgba(80,100,150,0.80)" }}>
                <span className="flex items-center gap-0.5 text-yellow-400">
                    <Star className="w-2.5 h-2.5 fill-yellow-400" />{rating}
                </span>
                <span className="flex items-center gap-0.5">
                    <Clock className="w-2.5 h-2.5" />{pages}
                </span>
            </div>
        </div>
    );
}
