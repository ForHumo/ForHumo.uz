"use client";

import { useState, useEffect, useCallback } from "react";
import { useNxPlayer } from "./nx-player-ctx";
import {
    Search, Loader2, Plus, Play, Eye, Flame, Zap, Hash, Film, BadgeCheck,
    LayoutGrid, Clapperboard, Music, RectangleHorizontal, RectangleVertical,
    Gift, UserCheck, LibraryBig, Bookmark, History, CloudUpload, LogIn,
} from "lucide-react";
import { NxVideoCreate } from "./nx-video-create";
import { formatMoney } from "@/lib/money";

interface VAuthor { name: string | null; username: string | null; image: string | null; verified: boolean }
interface Vid {
    id: string; title: string; thumbUrl: string | null; videoUrl: string;
    durationSec: number; views: number; createdAt: string;
    orientation: "HORIZONTAL" | "VERTICAL"; priceZij: number; priceCurrency?: "UZS" | "USD"; isMature: boolean; isSaved: boolean;
    locked: boolean;
    likeCount: number; commentCount: number; author: VAuthor | null;
}
interface Library { mine: Vid[]; watchLater: Vid[]; history: Vid[] }

// Yuqori sub-navbar bo'limlari
const SECTIONS = [
    { id: "all", label: "Barchasi", icon: LayoutGrid },
    { id: "kino", label: "Kino", icon: Clapperboard },
    { id: "musiqa", label: "Musiqa", icon: Music },
    { id: "gvideo", label: "G. Video", icon: RectangleHorizontal },
    { id: "vvideo", label: "V. Video", icon: RectangleVertical },
    { id: "free", label: "Bepul videolar", icon: Gift },
    { id: "subs", label: "Obuna qilinganlar", icon: UserCheck },
    { id: "mine", label: "Mening videolarim", icon: LibraryBig },
] as const;
type SectionId = (typeof SECTIONS)[number]["id"];

const SORTS = [
    { id: "trend", label: "Trendda", icon: Flame },
    { id: "new", label: "Yangi", icon: Zap },
] as const;

const CATS = [
    { id: "gaming", label: "Gaming" },
    { id: "tech", label: "Tech" },
    { id: "talim", label: "Ta'lim" },
    { id: "sport", label: "Sport" },
] as const;

function fmtViews(n: number) {
    if (n >= 1_000_000) return (n / 1_000_000).toFixed(1).replace(/\.0$/, "") + "M";
    if (n >= 1_000) return (n / 1_000).toFixed(1).replace(/\.0$/, "") + "K";
    return String(n);
}
function fmtDur(s: number) { const m = Math.floor(s / 60), sec = Math.floor(s % 60); return `${m}:${String(sec).padStart(2, "0")}`; }
function avatarOf(a: VAuthor | null) { return a?.image || `https://api.dicebear.com/9.x/avataaars/svg?seed=${encodeURIComponent(a?.username || a?.name || "u")}`; }

export function VideoView() {
    const { openVideo, openShorts } = useNxPlayer();
    const [section, setSection] = useState<SectionId>("all");
    const [videos, setVideos] = useState<Vid[]>([]);
    const [shorts, setShorts] = useState<Vid[]>([]);
    const [lib, setLib] = useState<Library | null>(null);
    const [libErr, setLibErr] = useState(false);
    const [loading, setLoading] = useState(true);
    const [query, setQuery] = useState("");
    const [sort, setSort] = useState<"trend" | "new">("trend");
    const [cat, setCat] = useState("");
    const [uploadOpen, setUploadOpen] = useState(false);

    const load = useCallback(async () => {
        setLoading(true);
        try {
            if (section === "mine") {
                const r = await fetch("/api/nexus/videos/library");
                if (r.ok) { setLib(await r.json()); setLibErr(false); }
                else { setLib(null); setLibErr(true); }
                return;
            }
            const params = new URLSearchParams({ limit: "60", sort });
            if (query.trim()) params.set("q", query.trim());
            if (section === "kino") params.set("category", "kino");
            else if (section === "musiqa") params.set("category", "musiqa");
            else if (cat) params.set("category", cat);
            if (section === "gvideo") params.set("orientation", "HORIZONTAL");
            if (section === "vvideo") params.set("orientation", "VERTICAL");
            if (section === "free") params.set("free", "1");
            if (section === "subs") params.set("scope", "following");
            const d = await fetch(`/api/nexus/videos?${params.toString()}`).then(r => r.json());
            setVideos(d.videos ?? []);
        } finally { setLoading(false); }
    }, [section, query, sort, cat]);

    useEffect(() => { const t = setTimeout(load, query ? 300 : 0); return () => clearTimeout(t); }, [load, query]);
    useEffect(() => {
        fetch("/api/nexus/videos?kind=SHORT&sort=trend&limit=20").then(r => r.json()).then(d => setShorts(d.videos ?? [])).catch(() => { });
    }, []);

    // Vertikal video → shorts player (joriy ro'yxatning vertikal qismi bilan).
    // Qulflangan (pullik, sotib olinmagan) — har doim video player (paywall) orqali.
    function openItem(v: Vid, list: Vid[]) {
        if (v.orientation === "VERTICAL" && !v.locked) {
            const verts = list.filter(x => x.orientation === "VERTICAL" && !x.locked);
            const idx = Math.max(0, verts.findIndex(x => x.id === v.id));
            openShorts(verts.map(s => ({
                id: s.id, image: s.thumbUrl || "", author: s.author?.name || s.author?.username || "Foydalanuvchi",
                views: fmtViews(s.views), likes: fmtViews(s.likeCount), duration: fmtDur(s.durationSec), videoSrc: s.videoUrl,
            })), idx);
            return;
        }
        openVideo({
            id: v.id, title: v.title, image: v.thumbUrl || "",
            author: v.author?.name || v.author?.username || "Foydalanuvchi",
            avatar: avatarOf(v.author), views: fmtViews(v.views), duration: fmtDur(v.durationSec),
        });
    }

    // "Keyinroq ko'rish" toggle — optimistik
    async function toggleSave(v: Vid) {
        const apply = (arr: Vid[]) => arr.map(x => x.id === v.id ? { ...x, isSaved: !v.isSaved } : x);
        setVideos(apply); setShorts(apply);
        setLib(l => l ? { mine: apply(l.mine), watchLater: apply(l.watchLater), history: apply(l.history) } : l);
        try {
            const r = await fetch(`/api/nexus/videos/${v.id}/watch-later`, { method: "POST" });
            if (!r.ok) throw new Error();
            if (section === "mine") load(); // watch-later ro'yxati o'zgardi
        } catch {
            const revert = (arr: Vid[]) => arr.map(x => x.id === v.id ? { ...x, isSaved: v.isSaved } : x);
            setVideos(revert); setShorts(revert);
        }
    }

    return (
        <div className="animate-in fade-in slide-in-from-bottom-1 duration-250 pb-32">
            {/* ── Sub-navbar (yopishqoq) ── */}
            <div className="sticky top-0 z-20 px-4 py-2"
                style={{ background: "rgba(5,8,24,0.88)", backdropFilter: "blur(20px)", WebkitBackdropFilter: "blur(20px)", borderBottom: "1px solid rgba(43,62,232,0.14)" }}>
                <div className="flex gap-1.5 overflow-x-auto" style={{ scrollbarWidth: "none" }}>
                    {SECTIONS.map(s => (
                        <button key={s.id} onClick={() => { setSection(s.id); setCat(""); }}
                            className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-black flex-shrink-0 transition active:scale-95"
                            style={section === s.id
                                ? { background: "linear-gradient(135deg,#2B3EE8,#00CEC8)", color: "#fff", boxShadow: "0 2px 12px rgba(43,62,232,0.35)" }
                                : { background: "rgba(43,62,232,0.08)", border: "1px solid rgba(43,62,232,0.18)", color: "rgba(150,168,215,0.85)" }}>
                            <s.icon className="w-3.5 h-3.5" />{s.label}
                        </button>
                    ))}
                </div>
            </div>

            {/* ── Header (qidiruv + sort + kategoriya) ── */}
            {section !== "mine" && (
                <div className="mx-4 mt-4 mb-3 p-5 rounded-2xl relative overflow-hidden" style={{ background: "rgba(11,18,40,0.60)", border: "1px solid rgba(43,62,232,0.22)" }}>
                    <div className="absolute -top-12 -right-12 w-40 h-40 rounded-full pointer-events-none" style={{ background: "radial-gradient(circle, rgba(43,62,232,0.22) 0%, transparent 70%)" }} />
                    <div className="flex items-center justify-between gap-3 mb-4 relative">
                        <h2 className="text-2xl md:text-3xl font-black text-white">Video <span style={{ background: "linear-gradient(135deg,#2B3EE8,#00CEC8)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text" }}>Dunyo</span></h2>
                        <button onClick={() => setUploadOpen(true)} className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-black text-white flex-shrink-0" style={{ background: "linear-gradient(135deg,#2B3EE8,#00CEC8)", boxShadow: "0 4px 16px rgba(43,62,232,0.4)" }}>
                            <Plus className="w-4 h-4" /> Video yuklash
                        </button>
                    </div>
                    <div className="relative mb-3">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none" style={{ color: "rgba(43,62,232,0.55)" }} />
                        <input value={query} onChange={e => setQuery(e.target.value)} placeholder="Video qidiring..."
                            className="w-full h-11 rounded-xl pl-11 pr-4 text-sm text-white outline-none" style={{ background: "rgba(5,8,24,0.60)", border: "1px solid rgba(43,62,232,0.22)", caretColor: "#00CEC8" }} />
                    </div>
                    <div className="flex gap-2 overflow-x-auto pb-1 relative" style={{ scrollbarWidth: "none" }}>
                        {SORTS.map(f => (
                            <button key={f.id} onClick={() => setSort(f.id)}
                                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold flex-shrink-0 transition active:scale-95"
                                style={sort === f.id
                                    ? { background: "linear-gradient(135deg,#2B3EE8,#00CEC8)", color: "#fff" }
                                    : { background: "rgba(43,62,232,0.10)", border: "1px solid rgba(43,62,232,0.22)", color: "rgba(140,160,210,0.85)" }}>
                                <f.icon className="w-3 h-3" />{f.label}
                            </button>
                        ))}
                        {!["kino", "musiqa"].includes(section) && CATS.map(c => (
                            <button key={c.id} onClick={() => setCat(p => p === c.id ? "" : c.id)}
                                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold flex-shrink-0 transition active:scale-95"
                                style={cat === c.id
                                    ? { background: "linear-gradient(135deg,#2B3EE8,#00CEC8)", color: "#fff" }
                                    : { background: "rgba(43,62,232,0.10)", border: "1px solid rgba(43,62,232,0.22)", color: "rgba(140,160,210,0.85)" }}>
                                <Hash className="w-3 h-3" />{c.label}
                            </button>
                        ))}
                    </div>
                </div>
            )}

            {/* ── Mening videolarim ── */}
            {section === "mine" ? (
                loading ? (
                    <div className="flex justify-center py-16"><Loader2 className="w-7 h-7 animate-spin" style={{ color: "#2B3EE8" }} /></div>
                ) : libErr ? (
                    <EmptyState icon={LogIn} title="Kirish kerak" hint="Mening videolarim uchun hisobingizga kiring" />
                ) : lib && (
                    <div className="mt-4 space-y-6">
                        <LibRow icon={CloudUpload} title="Yuklagan videolarim" items={lib.mine} onOpen={v => openItem(v, lib.mine)} onSave={toggleSave}
                            empty="Hali video yuklamagansiz" action={<button onClick={() => setUploadOpen(true)} className="px-4 py-2 rounded-xl text-xs font-black text-white" style={{ background: "linear-gradient(135deg,#2B3EE8,#00CEC8)" }}>Video yuklash</button>} />
                        <LibRow icon={Bookmark} title="Keyinroq ko'rish" items={lib.watchLater} onOpen={v => openItem(v, lib.watchLater)} onSave={toggleSave} empty="Belgilangan video yo'q — kartadagi belgilash tugmasini bosing" />
                        <LibRow icon={History} title="So'nggi ko'rilgan" items={lib.history} onOpen={v => openItem(v, lib.history)} onSave={toggleSave} empty="Hali video ko'rmadingiz" />
                    </div>
                )
            ) : (
                <>
                    {/* Shorts qatori (faqat Barchasi) */}
                    {section === "all" && !query && shorts.length > 0 && (
                        <div className="mb-5">
                            <div className="px-4 mb-2"><span className="text-sm font-black text-white">Shorts</span></div>
                            <div className="flex gap-3 overflow-x-auto px-4 pb-1" style={{ scrollbarWidth: "none" }}>
                                {shorts.map((s) => (
                                    <VCard key={s.id} v={s} w="w-[120px]" onOpen={() => openItem(s, shorts)} onSave={() => toggleSave(s)} />
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Grid */}
                    {loading ? (
                        <div className="flex justify-center py-16"><Loader2 className="w-7 h-7 animate-spin" style={{ color: "#2B3EE8" }} /></div>
                    ) : videos.length === 0 ? (
                        <EmptyState icon={Film}
                            title={query ? "Video topilmadi" : section === "subs" ? "Obunalaringizda video yo'q" : "Hali video yo'q"}
                            hint={section === "subs" ? "Kanallarga obuna bo'ling — videolari shu yerda chiqadi" : undefined}
                            action={!query && section === "all" ? <button onClick={() => setUploadOpen(true)} className="mt-1 px-4 py-2 rounded-xl text-xs font-black text-white" style={{ background: "linear-gradient(135deg,#2B3EE8,#00CEC8)" }}>Birinchi videoni yuklang</button> : undefined} />
                    ) : section === "vvideo" ? (
                        <div className="px-4 grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-6 gap-3">
                            {videos.map(v => <VCard key={v.id} v={v} onOpen={() => openItem(v, videos)} onSave={() => toggleSave(v)} />)}
                        </div>
                    ) : (
                        <div className="px-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                            {videos.map(v => <HCard key={v.id} v={v} onOpen={() => openItem(v, videos)} onSave={() => toggleSave(v)} />)}
                        </div>
                    )}
                </>
            )}

            <NxVideoCreate open={uploadOpen} onClose={() => setUploadOpen(false)} onCreated={load} />
        </div>
    );
}

// ─────────────────────────────────────────────────────────────────────────────
// Karta badge'lari: narx + 18+
function Badges({ v }: { v: Vid }) {
    if (v.priceZij <= 0 && !v.isMature) return null;
    return (
        <div className="absolute top-2 left-2 flex gap-1">
            {v.priceZij > 0 && (
                <span className="px-1.5 py-0.5 rounded text-[10px] font-black text-white" style={{ background: "linear-gradient(135deg,#2B3EE8,#00CEC8)" }}>{formatMoney(v.priceZij, v.priceCurrency ?? "UZS")}</span>
            )}
            {v.isMature && (
                <span className="px-1.5 py-0.5 rounded text-[10px] font-black text-white" style={{ background: "rgba(239,68,68,0.92)" }}>18+</span>
            )}
        </div>
    );
}

function SaveBtn({ v, onSave }: { v: Vid; onSave: () => void }) {
    return (
        <button onClick={e => { e.stopPropagation(); onSave(); }}
            title={v.isSaved ? "Keyinroq ko'rishdan olib tashlash" : "Keyinroq ko'rish"}
            className="absolute top-2 right-2 w-7 h-7 flex items-center justify-center rounded-lg opacity-0 group-hover:opacity-100 transition-opacity"
            style={{ background: "rgba(5,8,24,0.75)", backdropFilter: "blur(6px)" }}>
            <Bookmark className="w-3.5 h-3.5" style={{ color: v.isSaved ? "#00CEC8" : "#fff", fill: v.isSaved ? "#00CEC8" : "none" }} />
        </button>
    );
}

// Gorizontal (16:9) karta
function HCard({ v, onOpen, onSave, w }: { v: Vid; onOpen: () => void; onSave: () => void; w?: string }) {
    return (
        <div role="button" tabIndex={0} onClick={onOpen} onKeyDown={e => e.key === "Enter" && onOpen()}
            className={`text-left group cursor-pointer flex-shrink-0 ${w ?? ""}`}>
            <div className="relative aspect-video rounded-xl overflow-hidden mb-2" style={{ border: "1px solid rgba(43,62,232,0.18)", background: "rgba(43,62,232,0.08)" }}>
                {v.thumbUrl
                    ? <img src={v.thumbUrl} alt={v.title} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" />
                    : <div className="w-full h-full flex items-center justify-center" style={{ background: "linear-gradient(135deg,#1a2a8a,#0a3d3a)" }}><Film className="w-8 h-8 text-white/40" /></div>}
                <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" style={{ background: "rgba(5,8,24,0.35)" }}>
                    <div className="w-12 h-12 rounded-full flex items-center justify-center" style={{ background: "linear-gradient(135deg,#2B3EE8,#00CEC8)" }}><Play className="w-5 h-5 text-white fill-white ml-0.5" /></div>
                </div>
                <Badges v={v} />
                <SaveBtn v={v} onSave={onSave} />
                {v.durationSec > 0 && <span className="absolute bottom-2 right-2 px-1.5 py-0.5 rounded text-[10px] font-bold text-white" style={{ background: "rgba(5,8,24,0.85)" }}>{fmtDur(v.durationSec)}</span>}
            </div>
            <div className="flex gap-2.5">
                <img src={avatarOf(v.author)} alt="" className="w-8 h-8 rounded-full flex-shrink-0 object-cover bg-white" style={{ border: "1px solid rgba(43,62,232,0.25)" }} />
                <div className="min-w-0">
                    <h4 className="text-sm font-bold text-white leading-snug line-clamp-2 group-hover:text-[#00CEC8] transition-colors">{v.title}</h4>
                    <p className="text-[11px] mt-1 flex items-center gap-1.5" style={{ color: "rgba(100,120,170,0.8)" }}>
                        <span className="truncate inline-flex items-center gap-0.5">{v.author?.name || v.author?.username || "Foydalanuvchi"}{v.author?.verified && <BadgeCheck className="w-3 h-3" style={{ color: "#00CEC8" }} />}</span>
                        <span>·</span>
                        <span className="flex items-center gap-0.5 flex-shrink-0"><Eye className="w-2.5 h-2.5" />{fmtViews(v.views)}</span>
                    </p>
                </div>
            </div>
        </div>
    );
}

// Vertikal (9:16) karta
function VCard({ v, onOpen, onSave, w }: { v: Vid; onOpen: () => void; onSave: () => void; w?: string }) {
    return (
        <div role="button" tabIndex={0} onClick={onOpen} onKeyDown={e => e.key === "Enter" && onOpen()}
            className={`relative aspect-[9/16] rounded-2xl overflow-hidden group cursor-pointer flex-shrink-0 ${w ?? ""}`}
            style={{ border: "1px solid rgba(43,62,232,0.20)", background: "rgba(43,62,232,0.08)" }}>
            {v.thumbUrl
                ? <img src={v.thumbUrl} alt="" className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" />
                : <div className="w-full h-full flex items-center justify-center"><Play className="w-6 h-6 text-white/40" /></div>}
            <div className="absolute inset-0 pointer-events-none" style={{ background: "linear-gradient(to top, rgba(5,8,24,0.9) 0%, transparent 55%)" }} />
            <Badges v={v} />
            <SaveBtn v={v} onSave={onSave} />
            <div className="absolute bottom-0 left-0 right-0 p-2">
                <p className="text-[10px] font-bold text-white truncate mb-0.5">{v.title}</p>
                <span className="flex items-center gap-0.5 text-[9px]" style={{ color: "rgba(160,180,220,0.8)" }}><Eye className="w-2.5 h-2.5" />{fmtViews(v.views)}</span>
            </div>
        </div>
    );
}

// "Mening videolarim" qatori — gorizontal scroll
function LibRow({ icon: Icon, title, items, onOpen, onSave, empty, action }: {
    icon: React.ElementType; title: string; items: Vid[];
    onOpen: (v: Vid) => void; onSave: (v: Vid) => void; empty: string; action?: React.ReactNode;
}) {
    return (
        <div>
            <div className="px-4 mb-2 flex items-center gap-2">
                <Icon className="w-4 h-4" style={{ color: "#00CEC8" }} />
                <span className="text-sm font-black text-white">{title}</span>
                <span className="text-[11px] font-bold" style={{ color: "rgba(100,120,170,0.7)" }}>{items.length}</span>
            </div>
            {items.length === 0 ? (
                <div className="mx-4 px-4 py-6 rounded-2xl flex flex-col items-center gap-3 text-center" style={{ background: "rgba(43,62,232,0.05)", border: "1px dashed rgba(43,62,232,0.20)" }}>
                    <p className="text-xs" style={{ color: "rgba(130,150,200,0.75)" }}>{empty}</p>
                    {action}
                </div>
            ) : (
                <div className="flex gap-3 overflow-x-auto px-4 pb-1" style={{ scrollbarWidth: "none" }}>
                    {items.map(v => v.orientation === "VERTICAL"
                        ? <VCard key={v.id} v={v} w="w-[120px]" onOpen={() => onOpen(v)} onSave={() => onSave(v)} />
                        : <HCard key={v.id} v={v} w="w-64" onOpen={() => onOpen(v)} onSave={() => onSave(v)} />)}
                </div>
            )}
        </div>
    );
}

function EmptyState({ icon: Icon, title, hint, action }: { icon: React.ElementType; title: string; hint?: string; action?: React.ReactNode }) {
    return (
        <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
            <div className="w-14 h-14 rounded-2xl flex items-center justify-center mb-3" style={{ background: "rgba(43,62,232,0.08)", border: "1px solid rgba(43,62,232,0.15)" }}>
                <Icon className="w-6 h-6" style={{ color: "rgba(43,62,232,0.45)" }} />
            </div>
            <p className="text-sm font-bold text-white/70 mb-1">{title}</p>
            {hint && <p className="text-xs mb-2" style={{ color: "rgba(110,130,180,0.7)" }}>{hint}</p>}
            {action}
        </div>
    );
}
