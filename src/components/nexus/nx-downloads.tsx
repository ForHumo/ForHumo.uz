"use client";

import { useState } from "react";
import {
    X, Download, Music2, Film, BookOpen, Mic2, Trash2,
    Play, HardDrive, Wifi, WifiOff, CheckCircle2, Clock, ChevronRight,
} from "lucide-react";
import { useNxPlayer } from "./nx-player-ctx";

// ─────────────────────────────────────────────────────────────────────────────
// Mock ma'lumotlar
// ─────────────────────────────────────────────────────────────────────────────
interface Downloaded {
    id: string; title: string; author: string; image: string;
    size: string; type: "music" | "video" | "book" | "podcast";
    duration: string; date: string;
}

const MOCK_DOWNLOADS: Downloaded[] = [
    { id:"d1", title:"Bahor Ohangi", author:"Madina", image:"https://picsum.photos/seed/dl1/200/200", size:"8.2 MB",  type:"music",   duration:"3:42", date:"Bugun"         },
    { id:"d2", title:"React 19 Dars", author:"Sardor Dev", image:"https://picsum.photos/seed/dl2/400/225", size:"145 MB", type:"video",   duration:"24:10",date:"Bugun"         },
    { id:"d3", title:"AI va Kelajak", author:"AI Hub", image:"https://picsum.photos/seed/dl3/400/600", size:"2.1 MB",  type:"book",    duration:"5s 30d",date:"Kecha"         },
    { id:"d4", title:"Tun Yulduzi", author:"Sardor", image:"https://picsum.photos/seed/dl4/200/200", size:"9.1 MB",  type:"music",   duration:"4:05", date:"Kecha"         },
    { id:"d5", title:"Biznes Podcast #12", author:"Startup UZ", image:"https://picsum.photos/seed/dl5/400/600", size:"38 MB",  type:"podcast", duration:"45:00",date:"2 kun oldin"   },
    { id:"d6", title:"UX Masterclass", author:"Design UZ", image:"https://picsum.photos/seed/dl6/400/225", size:"320 MB", type:"video",   duration:"1s 12d",date:"3 kun oldin"   },
    { id:"d7", title:"Osmon Osti", author:"Zulfiya", image:"https://picsum.photos/seed/dl7/200/200", size:"7.8 MB",  type:"music",   duration:"3:55", date:"4 kun oldin"   },
];

const TYPE_ICONS = {
    music:   Music2,
    video:   Film,
    book:    BookOpen,
    podcast: Mic2,
};

const TYPE_COLORS = {
    music:   "#10B981",
    video:   "#2B3EE8",
    book:    "#F59E0B",
    podcast: "#8B5CF6",
};

const FILTERS = ["Barchasi", "Musiqa", "Video", "Kitob", "Podcast"] as const;
type Filter = typeof FILTERS[number];

// ─────────────────────────────────────────────────────────────────────────────
// NxDownloads
// ─────────────────────────────────────────────────────────────────────────────
export function NxDownloads() {
    const { downloadsOpen, setDownloadsOpen } = useNxPlayer();
    const [filter,    setFilter]    = useState<Filter>("Barchasi");
    const [items,     setItems]     = useState<Downloaded[]>(MOCK_DOWNLOADS);
    const [offline,   setOffline]   = useState(false);

    if (!downloadsOpen) return null;

    const typeMap: Record<Filter, Downloaded["type"] | null> = {
        Barchasi: null, Musiqa: "music", Video: "video", Kitob: "book", Podcast: "podcast",
    };

    const filtered = items.filter(d =>
        !typeMap[filter] || d.type === typeMap[filter]
    );

    const totalSize = items.reduce((acc, d) => {
        const n = parseFloat(d.size);
        const unit = d.size.includes("MB") ? 1 : 1024;
        return acc + n / unit;
    }, 0);

    const remove = (id: string) => setItems(prev => prev.filter(d => d.id !== id));

    return (
        <>
            {/* Backdrop */}
            <div
                className="fixed inset-0 z-[55]"
                style={{ background: "rgba(5,8,24,0.80)", backdropFilter: "blur(8px)" }}
                onClick={() => setDownloadsOpen(false)}
            />

            {/* Modal */}
            <div
                className="fixed inset-x-0 bottom-0 z-[55] flex flex-col rounded-t-3xl overflow-hidden md:inset-x-auto md:inset-y-auto md:top-1/2 md:left-1/2 md:-translate-x-1/2 md:-translate-y-1/2 md:w-[460px] md:max-h-[88vh] md:rounded-3xl"
                style={{
                    background: "rgba(8,12,32,0.98)",
                    border: "1px solid rgba(43,62,232,0.22)",
                    boxShadow: "0 32px 80px rgba(0,0,0,0.70)",
                    maxHeight: "90vh",
                }}
                onClick={e => e.stopPropagation()}
            >
                {/* Header */}
                <div className="flex items-center justify-between px-5 pt-5 pb-3 flex-shrink-0">
                    <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-xl flex items-center justify-center"
                            style={{ background: "linear-gradient(135deg,#2B3EE8,#00CEC8)" }}>
                            <Download className="w-4 h-4 text-white" />
                        </div>
                        <div>
                            <h2 className="text-base font-black text-white leading-tight">Yuklangan</h2>
                            <p className="text-[9px]" style={{ color: "rgba(80,100,150,0.80)" }}>
                                {items.length} fayl · {totalSize.toFixed(1)} MB
                            </p>
                        </div>
                    </div>
                    <button
                        onClick={() => setDownloadsOpen(false)}
                        className="w-8 h-8 flex items-center justify-center rounded-full"
                        style={{ background: "rgba(43,62,232,0.12)", border: "1px solid rgba(43,62,232,0.22)" }}
                    >
                        <X className="w-4 h-4 text-white" />
                    </button>
                </div>

                {/* Storage bar */}
                <div className="px-5 pb-3 flex-shrink-0">
                    <div className="p-4 rounded-2xl"
                        style={{ background: "rgba(43,62,232,0.08)", border: "1px solid rgba(43,62,232,0.18)" }}>
                        <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-2">
                                <HardDrive className="w-4 h-4" style={{ color: "#00CEC8" }} />
                                <span className="text-xs font-bold text-white">Qurilma xotirasi</span>
                            </div>
                            <span className="text-[10px] font-bold" style={{ color: "rgba(0,206,200,0.80)" }}>
                                {totalSize.toFixed(0)} MB / 2048 MB
                            </span>
                        </div>
                        <div className="h-1.5 rounded-full overflow-hidden"
                            style={{ background: "rgba(43,62,232,0.20)" }}>
                            <div className="h-full rounded-full transition-all duration-700"
                                style={{
                                    width: `${(totalSize / 2048 * 100).toFixed(1)}%`,
                                    background: "linear-gradient(90deg,#2B3EE8,#00CEC8)",
                                }} />
                        </div>

                        {/* Offline toggle */}
                        <div className="flex items-center justify-between mt-3">
                            <div className="flex items-center gap-2">
                                {offline
                                    ? <WifiOff className="w-4 h-4" style={{ color: "#F59E0B" }} />
                                    : <Wifi    className="w-4 h-4" style={{ color: "#10B981" }} />
                                }
                                <span className="text-xs font-bold" style={{ color: offline ? "#F59E0B" : "#10B981" }}>
                                    {offline ? "Oflayn rejim" : "Onlayn"}
                                </span>
                            </div>
                            <button
                                onClick={() => setOffline(o => !o)}
                                className="relative w-10 h-5 rounded-full transition-all duration-300"
                                style={{ background: offline ? "rgba(245,158,11,0.40)" : "rgba(16,185,129,0.40)" }}
                            >
                                <div className="absolute top-0.5 w-4 h-4 rounded-full transition-all duration-300"
                                    style={{
                                        background: offline ? "#F59E0B" : "#10B981",
                                        left: offline ? "calc(100% - 18px)" : "2px",
                                    }} />
                            </button>
                        </div>
                    </div>
                </div>

                {/* Filter tabs */}
                <div className="px-5 pb-3 flex gap-2 flex-shrink-0 overflow-x-auto" style={{ scrollbarWidth: "none" }}>
                    {FILTERS.map(f => (
                        <button key={f}
                            onClick={() => setFilter(f)}
                            className="px-3 py-1.5 rounded-xl text-xs font-bold flex-shrink-0 transition-all duration-200"
                            style={filter === f ? {
                                background: "linear-gradient(135deg,#2B3EE8,#00CEC8)",
                                color: "white",
                            } : {
                                background: "rgba(43,62,232,0.10)",
                                border: "1px solid rgba(43,62,232,0.22)",
                                color: "rgba(140,160,210,0.85)",
                            }}
                        >{f}</button>
                    ))}
                </div>

                {/* Downloads list */}
                <div className="flex-1 overflow-y-auto px-5 pb-6" style={{ scrollbarWidth: "none" }}>
                    {filtered.length === 0 ? (
                        <div className="text-center py-12">
                            <Download className="w-10 h-10 mx-auto mb-3" style={{ color: "rgba(43,62,232,0.30)" }} />
                            <p className="text-sm" style={{ color: "rgba(80,100,150,0.70)" }}>Yuklangan fayl yo'q</p>
                        </div>
                    ) : (
                        <div className="flex flex-col gap-2">
                            {filtered.map(d => {
                                const Icon  = TYPE_ICONS[d.type];
                                const color = TYPE_COLORS[d.type];
                                return (
                                    <div key={d.id}
                                        className="flex items-center gap-3 p-3 rounded-2xl group"
                                        style={{ background: "rgba(11,18,40,0.50)", border: "1px solid rgba(43,62,232,0.14)" }}
                                    >
                                        {/* Thumbnail */}
                                        <div className="relative flex-shrink-0 w-12 h-12 rounded-xl overflow-hidden">
                                            <img src={d.image} alt={d.title} className="w-full h-full object-cover" />
                                            <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-200"
                                                style={{ background: "rgba(5,8,24,0.60)" }}>
                                                <Play className="w-4 h-4 text-white fill-white" />
                                            </div>
                                        </div>

                                        {/* Info */}
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-1.5 mb-0.5">
                                                <Icon className="w-3 h-3 flex-shrink-0" style={{ color }} />
                                                <p className="text-sm font-bold text-white truncate">{d.title}</p>
                                            </div>
                                            <p className="text-[10px]" style={{ color: "rgba(80,100,150,0.80)" }}>
                                                {d.author} · {d.duration} · {d.size}
                                            </p>
                                            <p className="text-[9px] flex items-center gap-1 mt-0.5"
                                                style={{ color: "rgba(0,206,200,0.60)" }}>
                                                <CheckCircle2 className="w-2.5 h-2.5" /> {d.date} yuklangan
                                            </p>
                                        </div>

                                        {/* Delete */}
                                        <button
                                            onClick={() => remove(d.id)}
                                            className="w-8 h-8 flex items-center justify-center rounded-xl transition-all duration-150 active:scale-90 flex-shrink-0"
                                            style={{ background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.18)" }}
                                        >
                                            <Trash2 className="w-3.5 h-3.5" style={{ color: "rgba(239,68,68,0.70)" }} />
                                        </button>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            </div>
        </>
    );
}
