"use client";

import { useState } from "react";
import { useNxPlayer } from "./nx-player-ctx";
import { X, ChevronLeft, Plus, Grid3X3, Lock, Globe, Users, Image, Trash2, Heart } from "lucide-react";

// ─────────────────────────────────────────────────────────────────────────────
// Turlar
// ─────────────────────────────────────────────────────────────────────────────
type AlbumPrivacy = "public" | "followers" | "private";

interface AlbumPhoto {
    id: string;
    url: string;
    liked: boolean;
}

interface Album {
    id: string;
    name: string;
    cover: string;
    count: number;
    privacy: AlbumPrivacy;
    createdAt: string;
    photos: AlbumPhoto[];
}

// ─────────────────────────────────────────────────────────────────────────────
// Mock
// ─────────────────────────────────────────────────────────────────────────────
const SEEDS = [10,20,30,40,50,60,70,80,90,100,110,120,130,140,150,160];

function photoUrl(seed: number) { return `https://picsum.photos/seed/${seed}/400/400`; }

const MOCK_ALBUMS: Album[] = [
    {
        id: "a1", name: "Toshkent Kuz 2025", privacy: "public", createdAt: "Oktyabr 2025",
        cover: photoUrl(10), count: 6,
        photos: SEEDS.slice(0,6).map((s,i) => ({ id: `p${i}`, url: photoUrl(s), liked: i < 2 })),
    },
    {
        id: "a2", name: "Oilaviy Suratlar", privacy: "private", createdAt: "Sentyabr 2025",
        cover: photoUrl(70), count: 4,
        photos: SEEDS.slice(6,10).map((s,i) => ({ id: `q${i}`, url: photoUrl(s), liked: false })),
    },
    {
        id: "a3", name: "Kontsert — Jasur Beats", privacy: "followers", createdAt: "Avgust 2025",
        cover: photoUrl(130), count: 6,
        photos: SEEDS.slice(10,16).map((s,i) => ({ id: `r${i}`, url: photoUrl(s), liked: i === 0 })),
    },
];

const PRIVACY_META: Record<AlbumPrivacy, { icon: typeof Globe; label: string; color: string }> = {
    public:    { icon: Globe,  label: "Hammaga ochiq", color: "#10B981" },
    followers: { icon: Users,  label: "Obunachilar",   color: "#3B82F6" },
    private:   { icon: Lock,   label: "Maxfiy",        color: "#EAB308" },
};

// ─────────────────────────────────────────────────────────────────────────────
// NxAlbums
// ─────────────────────────────────────────────────────────────────────────────
export function NxAlbums() {
    const { albumsOpen, setAlbumsOpen } = useNxPlayer();

    const [albums,       setAlbums]       = useState<Album[]>(MOCK_ALBUMS);
    const [openAlbum,    setOpenAlbum]    = useState<Album | null>(null);
    const [openPhoto,    setOpenPhoto]    = useState<AlbumPhoto | null>(null);
    const [createOpen,   setCreateOpen]   = useState(false);
    const [newName,      setNewName]      = useState("");
    const [newPrivacy,   setNewPrivacy]   = useState<AlbumPrivacy>("public");
    const [delConfirm,   setDelConfirm]   = useState<string | null>(null);

    if (!albumsOpen) return null;

    // ── Fullscreen photo ───────────────────────────────────────────────────
    if (openPhoto && openAlbum) {
        return (
            <div className="fixed inset-0 z-[130] flex flex-col items-center justify-center"
                style={{ background: "rgba(0,0,0,0.95)" }}
                onClick={() => setOpenPhoto(null)}>
                <img src={openPhoto.url} alt="" className="max-w-full max-h-[85vh] object-contain rounded-2xl" />
                <button
                    onClick={e => { e.stopPropagation(); setAlbums(prev => prev.map(a => a.id === openAlbum.id ? { ...a, photos: a.photos.map(p => p.id === openPhoto.id ? { ...p, liked: !p.liked } : p) } : a)); setOpenPhoto(prev => prev ? { ...prev, liked: !prev.liked } : prev); }}
                    className="mt-4 flex items-center gap-2 px-4 py-2 rounded-full"
                    style={{ background: "rgba(255,255,255,0.12)" }}>
                    <Heart className="w-5 h-5" style={{ color: openPhoto.liked ? "#EF4444" : "white" }} fill={openPhoto.liked ? "#EF4444" : "none"} />
                    <span className="text-sm font-bold text-white">{openPhoto.liked ? "Yoqtirindi" : "Yoqtirish"}</span>
                </button>
            </div>
        );
    }

    // ── Album detail (photo grid) ──────────────────────────────────────────
    if (openAlbum) {
        const album = albums.find(a => a.id === openAlbum.id) ?? openAlbum;
        const meta  = PRIVACY_META[album.privacy];
        const Meta  = meta.icon;
        return (
            <div className="fixed inset-0 z-[120] flex flex-col" style={{ background: "#050818" }}>
                <div className="flex items-center gap-3 px-4 h-[56px] flex-shrink-0"
                    style={{ borderBottom: "1px solid rgba(43,62,232,0.18)" }}>
                    <button onClick={() => setOpenAlbum(null)}
                        className="w-9 h-9 flex items-center justify-center rounded-xl"
                        style={{ background: "rgba(43,62,232,0.12)", border: "1px solid rgba(43,62,232,0.22)" }}>
                        <ChevronLeft className="w-5 h-5 text-white" />
                    </button>
                    <div className="flex-1 min-w-0">
                        <p className="text-sm font-bold text-white truncate">{album.name}</p>
                        <div className="flex items-center gap-1.5">
                            <Meta className="w-3 h-3" style={{ color: meta.color }} />
                            <span className="text-[10px]" style={{ color: meta.color }}>{meta.label}</span>
                            <span className="text-[10px] ml-1" style={{ color: "rgba(100,120,170,0.50)" }}>
                                · {album.photos.length} ta
                            </span>
                        </div>
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto p-3 pb-10" style={{ scrollbarWidth: "none" }}>
                    <div className="grid grid-cols-3 gap-1.5">
                        {album.photos.map(p => (
                            <button key={p.id} onClick={() => setOpenPhoto(p)}
                                className="relative aspect-square rounded-xl overflow-hidden">
                                <img src={p.url} alt="" className="w-full h-full object-cover" />
                                {p.liked && (
                                    <div className="absolute bottom-1 right-1">
                                        <Heart className="w-3.5 h-3.5" style={{ color: "#EF4444" }} fill="#EF4444" />
                                    </div>
                                )}
                            </button>
                        ))}
                        {/* Add photo placeholder */}
                        <button className="aspect-square rounded-xl flex items-center justify-center"
                            style={{ background: "rgba(43,62,232,0.08)", border: "2px dashed rgba(43,62,232,0.25)" }}>
                            <Plus className="w-6 h-6" style={{ color: "rgba(43,62,232,0.40)" }} />
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    // ── Album list ─────────────────────────────────────────────────────────
    const createAlbum = () => {
        if (!newName.trim()) return;
        const newA: Album = {
            id: `alb_${Date.now()}`,
            name: newName,
            cover: photoUrl(Math.floor(Math.random() * 200)),
            count: 0,
            privacy: newPrivacy,
            createdAt: "Hozir",
            photos: [],
        };
        setAlbums(prev => [newA, ...prev]);
        setNewName(""); setCreateOpen(false);
    };

    return (
        <div className="fixed inset-0 z-[120] flex flex-col" style={{ background: "#050818" }}>
            {/* Header */}
            <div className="flex items-center gap-3 px-4 h-[56px] flex-shrink-0"
                style={{ borderBottom: "1px solid rgba(43,62,232,0.18)" }}>
                <button onClick={() => setAlbumsOpen(false)}
                    className="w-9 h-9 flex items-center justify-center rounded-xl"
                    style={{ background: "rgba(43,62,232,0.12)", border: "1px solid rgba(43,62,232,0.22)" }}>
                    <X className="w-5 h-5 text-white" />
                </button>
                <div className="flex-1">
                    <p className="text-sm font-black text-white">Albomlar</p>
                    <p className="text-[10px]" style={{ color: "rgba(100,120,170,0.70)" }}>
                        {albums.length} ta albom
                    </p>
                </div>
                <button onClick={() => setCreateOpen(true)}
                    className="w-9 h-9 flex items-center justify-center rounded-xl"
                    style={{ background: "linear-gradient(135deg,#2B3EE8,#00CEC8)" }}>
                    <Plus className="w-5 h-5 text-white" />
                </button>
            </div>

            <div className="flex-1 overflow-y-auto px-4 py-4 pb-10" style={{ scrollbarWidth: "none" }}>
                <div className="grid grid-cols-2 gap-4">
                    {albums.map(a => {
                        const pMeta  = PRIVACY_META[a.privacy];
                        const PMeta  = pMeta.icon;
                        const isConf = delConfirm === a.id;
                        return (
                            <div key={a.id} className="flex flex-col rounded-2xl overflow-hidden"
                                style={{ border: "1px solid rgba(43,62,232,0.18)" }}>
                                {/* Cover */}
                                <button onClick={() => setOpenAlbum(a)} className="relative h-40 overflow-hidden">
                                    <img src={a.cover} alt={a.name} className="w-full h-full object-cover" />
                                    <div className="absolute inset-0"
                                        style={{ background: "linear-gradient(to top,rgba(5,8,24,0.85) 0%,transparent 50%)" }} />
                                    {/* Privacy badge */}
                                    <div className="absolute top-2 right-2 flex items-center gap-1 px-1.5 py-0.5 rounded-full"
                                        style={{ background: "rgba(5,8,24,0.70)" }}>
                                        <PMeta className="w-3 h-3" style={{ color: pMeta.color }} />
                                    </div>
                                    {/* Photo count */}
                                    <div className="absolute bottom-2 left-2 flex items-center gap-1">
                                        <Grid3X3 className="w-3 h-3" style={{ color: "rgba(255,255,255,0.70)" }} />
                                        <span className="text-[10px] font-bold text-white">{a.photos.length}</span>
                                    </div>
                                </button>
                                {/* Info */}
                                <div className="px-3 py-2.5"
                                    style={{ background: "rgba(8,12,32,0.95)" }}>
                                    <p className="text-[12px] font-bold text-white truncate mb-0.5">{a.name}</p>
                                    <p className="text-[9px]" style={{ color: "rgba(100,120,170,0.50)" }}>{a.createdAt}</p>
                                </div>
                                {/* Delete */}
                                {isConf
                                    ? <div className="flex"
                                        style={{ background: "rgba(8,12,32,0.95)", borderTop: "1px solid rgba(239,68,68,0.20)" }}>
                                        <button onClick={() => { setAlbums(prev => prev.filter(x => x.id !== a.id)); setDelConfirm(null); }}
                                            className="flex-1 py-2 text-[10px] font-black" style={{ color: "#EF4444" }}>
                                            O'chirish
                                        </button>
                                        <button onClick={() => setDelConfirm(null)}
                                            className="flex-1 py-2 text-[10px] font-black text-white">
                                            Bekor
                                        </button>
                                    </div>
                                    : <button onClick={() => setDelConfirm(a.id)}
                                        className="py-2 flex items-center justify-center"
                                        style={{ background: "rgba(8,12,32,0.95)", borderTop: "1px solid rgba(43,62,232,0.12)" }}>
                                        <Trash2 className="w-3.5 h-3.5" style={{ color: "rgba(239,68,68,0.40)" }} />
                                    </button>
                                }
                            </div>
                        );
                    })}
                    {/* New album tile */}
                    <button onClick={() => setCreateOpen(true)}
                        className="h-full min-h-[180px] rounded-2xl flex flex-col items-center justify-center gap-2"
                        style={{ background: "rgba(43,62,232,0.06)", border: "2px dashed rgba(43,62,232,0.22)" }}>
                        <Image className="w-8 h-8" style={{ color: "rgba(43,62,232,0.40)" }} />
                        <span className="text-[11px] font-bold" style={{ color: "rgba(100,120,170,0.50)" }}>
                            Yangi albom
                        </span>
                    </button>
                </div>
            </div>

            {/* Create album sheet */}
            {createOpen && (
                <div className="absolute inset-0 z-10 flex flex-col" style={{ background: "#050818" }}>
                    <div className="flex items-center gap-3 px-4 h-[56px] flex-shrink-0"
                        style={{ borderBottom: "1px solid rgba(43,62,232,0.18)" }}>
                        <button onClick={() => setCreateOpen(false)}
                            className="w-9 h-9 flex items-center justify-center rounded-xl"
                            style={{ background: "rgba(43,62,232,0.12)", border: "1px solid rgba(43,62,232,0.22)" }}>
                            <X className="w-5 h-5 text-white" />
                        </button>
                        <p className="flex-1 text-sm font-black text-white">Yangi albom</p>
                        <button onClick={createAlbum} disabled={!newName.trim()}
                            className="px-4 py-1.5 rounded-xl text-xs font-black text-white"
                            style={{ background: newName.trim() ? "linear-gradient(135deg,#2B3EE8,#00CEC8)" : "rgba(43,62,232,0.15)" }}>
                            Yaratish
                        </button>
                    </div>
                    <div className="px-4 py-5 flex flex-col gap-4">
                        <input value={newName} onChange={e => setNewName(e.target.value)}
                            placeholder="Albom nomi..."
                            className="w-full bg-transparent text-sm font-bold text-white outline-none px-3 py-3 rounded-xl"
                            style={{ background: "rgba(43,62,232,0.08)", border: "1px solid rgba(43,62,232,0.20)" }} />
                        <div>
                            <p className="text-[10px] font-black uppercase tracking-widest mb-2"
                                style={{ color: "rgba(100,120,170,0.60)" }}>
                                Ko'rinish
                            </p>
                            <div className="flex flex-col gap-2">
                                {(Object.keys(PRIVACY_META) as AlbumPrivacy[]).map(p => {
                                    const m = PRIVACY_META[p];
                                    const Icon = m.icon;
                                    return (
                                        <button key={p} onClick={() => setNewPrivacy(p)}
                                            className="flex items-center gap-3 p-3 rounded-xl transition-all"
                                            style={{
                                                background: newPrivacy === p ? `${m.color}15` : "rgba(43,62,232,0.06)",
                                                border: `1px solid ${newPrivacy === p ? `${m.color}40` : "rgba(43,62,232,0.15)"}`,
                                            }}>
                                            <Icon className="w-4 h-4" style={{ color: m.color }} />
                                            <span className="text-[12px] font-bold text-white flex-1">{m.label}</span>
                                            {newPrivacy === p && <div className="w-2 h-2 rounded-full" style={{ background: m.color }} />}
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
