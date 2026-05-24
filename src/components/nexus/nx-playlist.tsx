"use client";

import { useState } from "react";
import { useNxPlayer, type NxTrack } from "./nx-player-ctx";
import {
    X, Plus, Play, Music2, Trash2, ListMusic,
    Clock, MoreHorizontal, Check,
} from "lucide-react";

// ─────────────────────────────────────────────────────────────────────────────
// Mock treklarlar va playlistlar
// ─────────────────────────────────────────────────────────────────────────────
const LIBRARY_TRACKS: NxTrack[] = [
    { title: "Bahor Ohangi",   artist: "Madina",   image: "https://picsum.photos/seed/mus150/400/400", duration: "3:24", durationSec: 204 },
    { title: "Tun Yulduzi",    artist: "Sardor",   image: "https://picsum.photos/seed/mus151/400/400", duration: "4:12", durationSec: 252 },
    { title: "Sevgi Qo'shig'i",artist: "Kamola",   image: "https://picsum.photos/seed/mus152/400/400", duration: "3:48", durationSec: 228 },
    { title: "Uzoq Yo'l",      artist: "Bobur",    image: "https://picsum.photos/seed/mus153/400/400", duration: "5:02", durationSec: 302 },
    { title: "Yurak Tori",     artist: "Dilnoza",  image: "https://picsum.photos/seed/mus154/400/400", duration: "3:55", durationSec: 235 },
    { title: "Osmon Osti",     artist: "Jasur",    image: "https://picsum.photos/seed/mus155/400/400", duration: "4:33", durationSec: 273 },
    { title: "Erkin Qush",     artist: "Zulfiya",  image: "https://picsum.photos/seed/mus156/400/400", duration: "3:10", durationSec: 190 },
    { title: "Yangi Kun",      artist: "Islom",    image: "https://picsum.photos/seed/mus157/400/400", duration: "4:50", durationSec: 290 },
];

interface Playlist {
    id: number; name: string; tracks: NxTrack[];
    cover?: string; createdAt: string;
}

const INIT_PLAYLISTS: Playlist[] = [
    {
        id: 1, name: "Sevimlilar", createdAt: "2026-05-01",
        tracks: LIBRARY_TRACKS.slice(0, 4),
        cover: LIBRARY_TRACKS[0].image,
    },
    {
        id: 2, name: "Mashq uchun", createdAt: "2026-05-10",
        tracks: LIBRARY_TRACKS.slice(2, 6),
        cover: LIBRARY_TRACKS[2].image,
    },
    {
        id: 3, name: "Tun musiqasi", createdAt: "2026-05-15",
        tracks: LIBRARY_TRACKS.slice(4, 8),
        cover: LIBRARY_TRACKS[4].image,
    },
];

function totalDuration(tracks: NxTrack[]) {
    const sec = tracks.reduce((s, t) => s + t.durationSec, 0);
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m}:${String(s).padStart(2, "0")}`;
}

// ─────────────────────────────────────────────────────────────────────────────
// NxPlaylist
// ─────────────────────────────────────────────────────────────────────────────
export function NxPlaylist() {
    const { playlistsOpen, setPlaylistsOpen, playQueue } = useNxPlayer();
    const [playlists, setPlaylists] = useState<Playlist[]>(INIT_PLAYLISTS);
    const [selected, setSelected]   = useState<Playlist | null>(null);
    const [creating, setCreating]   = useState(false);
    const [newName, setNewName]     = useState("");
    const [addingTo, setAddingTo]   = useState<number | null>(null);

    if (!playlistsOpen) return null;

    const createPlaylist = () => {
        if (!newName.trim()) return;
        const pl: Playlist = {
            id: Date.now(), name: newName.trim(), tracks: [], createdAt: new Date().toISOString().slice(0, 10),
        };
        setPlaylists(prev => [...prev, pl]);
        setNewName("");
        setCreating(false);
        setSelected(pl);
    };

    const deletePlaylist = (id: number) => {
        setPlaylists(prev => prev.filter(p => p.id !== id));
        if (selected?.id === id) setSelected(null);
    };

    const addTrackToPlaylist = (plId: number, track: NxTrack) => {
        setPlaylists(prev => prev.map(p => {
            if (p.id !== plId) return p;
            const exists = p.tracks.some(t => t.title === track.title);
            if (exists) return p;
            return { ...p, tracks: [...p.tracks, track], cover: p.cover ?? track.image };
        }));
    };

    const removeTrack = (plId: number, trackTitle: string) => {
        setPlaylists(prev => prev.map(p => p.id !== plId ? p : {
            ...p, tracks: p.tracks.filter(t => t.title !== trackTitle),
        }));
        if (selected?.id === plId) {
            setSelected(prev => prev ? { ...prev, tracks: prev.tracks.filter(t => t.title !== trackTitle) } : null);
        }
    };

    return (
        <>
            <div className="fixed inset-0 z-[60]"
                style={{ background: "rgba(5,8,24,0.75)", backdropFilter: "blur(8px)" }}
                onClick={() => setPlaylistsOpen(false)} />

            <div
                className="fixed inset-x-0 bottom-0 z-[60] flex flex-col rounded-t-3xl overflow-hidden
                           md:inset-x-auto md:inset-y-auto md:top-1/2 md:left-1/2 md:-translate-x-1/2 md:-translate-y-1/2
                           md:w-[560px] md:max-h-[85vh] md:rounded-3xl"
                style={{
                    background: "rgba(8,12,32,0.98)",
                    border:     "1px solid rgba(43,62,232,0.22)",
                    boxShadow:  "0 32px 80px rgba(0,0,0,0.70)",
                    maxHeight:  "88vh",
                }}
                onClick={e => e.stopPropagation()}
            >
                {/* Header */}
                <div className="flex items-center gap-3 px-5 py-4 flex-shrink-0"
                    style={{ borderBottom: "1px solid rgba(43,62,232,0.14)" }}>
                    {selected ? (
                        <button onClick={() => setSelected(null)} className="w-8 h-8 flex items-center justify-center rounded-xl"
                            style={{ background: "rgba(43,62,232,0.10)" }}>
                            <X className="w-4 h-4 text-white" />
                        </button>
                    ) : (
                        <ListMusic className="w-5 h-5 flex-shrink-0" style={{ color: "#2B3EE8" }} />
                    )}
                    <div className="flex-1">
                        <h3 className="text-base font-black text-white">
                            {selected ? selected.name : "Playlistlar"}
                        </h3>
                        {selected && (
                            <p className="text-[10px]" style={{ color: "rgba(100,120,170,0.75)" }}>
                                {selected.tracks.length} ta trek · {totalDuration(selected.tracks)}
                            </p>
                        )}
                    </div>
                    {selected && selected.tracks.length > 0 && (
                        <button
                            onClick={() => { playQueue(selected.tracks, 0); setPlaylistsOpen(false); }}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-black text-white transition-all duration-150 active:scale-95"
                            style={{ background: "linear-gradient(135deg,#2B3EE8,#00CEC8)" }}>
                            <Play className="w-3 h-3 fill-white" />
                            Ijro
                        </button>
                    )}
                    {!selected && (
                        <button onClick={() => setCreating(true)}
                            className="flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-black text-white transition-all duration-150 active:scale-95"
                            style={{ background: "linear-gradient(135deg,#2B3EE8,#00CEC8)" }}>
                            <Plus className="w-3.5 h-3.5" />
                            Yangi
                        </button>
                    )}
                    <button onClick={() => setPlaylistsOpen(false)}
                        className="w-8 h-8 flex items-center justify-center rounded-xl"
                        style={{ background: "rgba(43,62,232,0.10)", border: "1px solid rgba(43,62,232,0.18)" }}>
                        <X className="w-4 h-4 text-white" />
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto" style={{ scrollbarWidth: "none" }}>
                    {/* Playlist yaratish formi */}
                    {creating && !selected && (
                        <div className="mx-4 mt-4 p-4 rounded-2xl" style={{ background: "rgba(43,62,232,0.08)", border: "1px solid rgba(43,62,232,0.20)" }}>
                            <p className="text-xs font-black text-white mb-2">Yangi playlist nomi</p>
                            <div className="flex gap-2">
                                <input autoFocus type="text" value={newName} onChange={e => setNewName(e.target.value)}
                                    onKeyDown={e => e.key === "Enter" && createPlaylist()}
                                    placeholder="Playlist nomi..."
                                    className="flex-1 h-9 rounded-xl px-3 text-sm text-white outline-none"
                                    style={{ background: "rgba(5,8,24,0.60)", border: "1px solid rgba(43,62,232,0.22)", caretColor: "#00CEC8" }} />
                                <button onClick={createPlaylist}
                                    className="px-3 py-2 rounded-xl text-xs font-black text-white"
                                    style={{ background: "linear-gradient(135deg,#2B3EE8,#00CEC8)" }}>
                                    <Check className="w-4 h-4" />
                                </button>
                                <button onClick={() => { setCreating(false); setNewName(""); }}
                                    className="px-3 py-2 rounded-xl text-xs font-black"
                                    style={{ background: "rgba(43,62,232,0.10)", color: "rgba(140,160,210,0.80)" }}>
                                    <X className="w-4 h-4" />
                                </button>
                            </div>
                        </div>
                    )}

                    {/* Playlist ro'yxati */}
                    {!selected && (
                        <div className="px-4 py-3 flex flex-col gap-2">
                            {playlists.map(pl => (
                                <button key={pl.id} onClick={() => setSelected(pl)}
                                    className="flex items-center gap-3 p-3 rounded-2xl text-left transition-all duration-150"
                                    style={{ background: "rgba(11,18,40,0.60)", border: "1px solid rgba(43,62,232,0.16)" }}
                                    onMouseEnter={e => (e.currentTarget as HTMLElement).style.borderColor = "rgba(43,62,232,0.40)"}
                                    onMouseLeave={e => (e.currentTarget as HTMLElement).style.borderColor = "rgba(43,62,232,0.16)"}
                                >
                                    <div className="w-14 h-14 rounded-xl overflow-hidden flex-shrink-0"
                                        style={{ background: "rgba(43,62,232,0.15)" }}>
                                        {pl.cover
                                            ? <img src={pl.cover} alt={pl.name} className="w-full h-full object-cover" />
                                            : <div className="w-full h-full flex items-center justify-center">
                                                <Music2 className="w-6 h-6" style={{ color: "rgba(43,62,232,0.60)" }} />
                                              </div>
                                        }
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm font-bold text-white truncate">{pl.name}</p>
                                        <p className="text-[10px] mt-0.5" style={{ color: "rgba(80,100,150,0.75)" }}>
                                            {pl.tracks.length} ta trek · {totalDuration(pl.tracks)}
                                        </p>
                                        <p className="text-[9px] mt-0.5" style={{ color: "rgba(60,80,120,0.60)" }}>
                                            {pl.createdAt}
                                        </p>
                                    </div>
                                    <button onClick={e => { e.stopPropagation(); deletePlaylist(pl.id); }}
                                        className="w-8 h-8 flex items-center justify-center rounded-xl flex-shrink-0"
                                        style={{ background: "rgba(239,68,68,0.10)" }}>
                                        <Trash2 className="w-3.5 h-3.5" style={{ color: "rgba(239,68,68,0.60)" }} />
                                    </button>
                                </button>
                            ))}
                        </div>
                    )}

                    {/* Tanlangan playlist */}
                    {selected && (
                        <div className="px-4 py-3">
                            {/* Treklarni qo'shish */}
                            <div className="mb-4">
                                <div className="flex items-center justify-between mb-2">
                                    <p className="text-[9px] font-black uppercase tracking-widest" style={{ color: "rgba(43,62,232,0.55)" }}>
                                        Kutubxonadan qo'shish
                                    </p>
                                    <button onClick={() => setAddingTo(addingTo ? null : selected.id)}
                                        className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-bold"
                                        style={{ background: "rgba(43,62,232,0.10)", color: "rgba(140,160,210,0.85)" }}>
                                        <Plus className="w-3 h-3" />
                                        {addingTo ? "Yopish" : "Qo'shish"}
                                    </button>
                                </div>
                                {addingTo === selected.id && (
                                    <div className="flex flex-col gap-1.5 mb-3">
                                        {LIBRARY_TRACKS.map(t => {
                                            const inList = selected.tracks.some(s => s.title === t.title);
                                            return (
                                                <button key={t.title}
                                                    onClick={() => { if (!inList) { addTrackToPlaylist(selected.id, t); setSelected(prev => prev ? { ...prev, tracks: [...prev.tracks, t] } : null); } }}
                                                    className="flex items-center gap-2.5 p-2.5 rounded-xl text-left transition-all duration-150"
                                                    style={{ background: inList ? "rgba(43,62,232,0.06)" : "rgba(11,18,40,0.50)", border: `1px solid ${inList ? "rgba(43,62,232,0.25)" : "rgba(43,62,232,0.12)"}` }}
                                                >
                                                    <img src={t.image} alt={t.title} className="w-9 h-9 rounded-lg object-cover flex-shrink-0" />
                                                    <div className="flex-1 min-w-0">
                                                        <p className="text-[12px] font-bold text-white truncate">{t.title}</p>
                                                        <p className="text-[10px]" style={{ color: "rgba(80,100,150,0.75)" }}>{t.artist}</p>
                                                    </div>
                                                    <div className="flex items-center gap-1.5 flex-shrink-0">
                                                        <span className="text-[10px]" style={{ color: "rgba(80,100,150,0.60)" }}>{t.duration}</span>
                                                        {inList
                                                            ? <Check className="w-4 h-4" style={{ color: "#00CEC8" }} />
                                                            : <Plus className="w-4 h-4" style={{ color: "rgba(43,62,232,0.60)" }} />
                                                        }
                                                    </div>
                                                </button>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>

                            {/* Playlist treklari */}
                            <p className="text-[9px] font-black uppercase tracking-widest mb-2" style={{ color: "rgba(43,62,232,0.55)" }}>
                                Treklarlar
                            </p>
                            {selected.tracks.length === 0 ? (
                                <div className="flex flex-col items-center py-10">
                                    <Music2 className="w-12 h-12 mb-3" style={{ color: "rgba(43,62,232,0.25)" }} />
                                    <p className="text-sm text-white/40">Bu playlist bo'sh</p>
                                    <p className="text-xs mt-1" style={{ color: "rgba(80,100,150,0.50)" }}>Yuqoridan trek qo'shing</p>
                                </div>
                            ) : (
                                <div className="flex flex-col gap-1.5">
                                    {selected.tracks.map((t, i) => (
                                        <div key={t.title} className="flex items-center gap-2.5 p-2.5 rounded-xl group"
                                            style={{ background: "rgba(11,18,40,0.50)", border: "1px solid rgba(43,62,232,0.12)" }}>
                                            <span className="w-4 text-[10px] text-center flex-shrink-0"
                                                style={{ color: "rgba(80,100,150,0.60)" }}>{i + 1}</span>
                                            <img src={t.image} alt={t.title} className="w-9 h-9 rounded-lg object-cover flex-shrink-0" />
                                            <div className="flex-1 min-w-0">
                                                <p className="text-[12px] font-bold text-white truncate">{t.title}</p>
                                                <p className="text-[10px]" style={{ color: "rgba(80,100,150,0.75)" }}>{t.artist}</p>
                                            </div>
                                            <div className="flex items-center gap-1.5">
                                                <span className="text-[10px] flex items-center gap-0.5" style={{ color: "rgba(80,100,150,0.60)" }}>
                                                    <Clock className="w-2.5 h-2.5" />{t.duration}
                                                </span>
                                                <button
                                                    onClick={() => removeTrack(selected.id, t.title)}
                                                    className="w-6 h-6 flex items-center justify-center rounded-lg opacity-0 group-hover:opacity-100 transition-opacity"
                                                    style={{ background: "rgba(239,68,68,0.15)" }}>
                                                    <Trash2 className="w-3 h-3" style={{ color: "#EF4444" }} />
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </>
    );
}
