"use client";

import { useState, useEffect, useCallback } from "react";
import { useNxPlayer, type NxTrack } from "./nx-player-ctx";
import { Link } from "@/i18n/routing";
import {
    Film, Music2, Mic2, BookOpen, Headphones, Plus, Play, Loader2,
    Heart, Eye, Clock, Search, Shuffle, X, Tag,
} from "lucide-react";
import { NxKaraokePlayer } from "./nx-karaoke-player";
import { NxTrackCreate } from "./nx-track-create";
import { formatMoney } from "@/lib/money";
import { NxVerifiedBadge } from "./nx-verified-badge";

// ─────────────────────────────────────────────────────────────────────────────
// MediaView — REAL: Kino = NexusVideo(category=kino), Musiqa/Podkast/Audiokitob =
// NexusTrack (global real audio pleyer orqali o'ynaydi). Kitob — keyingi bosqich.
// ─────────────────────────────────────────────────────────────────────────────

interface Track {
    id: string; title: string; artist: string | null; audioUrl: string; coverUrl: string | null;
    durationSec: number; kind: string; genre: string | null; plays: number;
    likeCount: number; isLiked: boolean; isMine: boolean; createdAt: string;
    hasKaraoke?: boolean; videoUrl?: string | null; videoOrientation?: string | null;
    uploader: { name: string | null; username: string | null; verified: boolean; verifiedCategory?: string | null } | null;
}
interface KinoVid {
    id: string; title: string; thumbUrl: string | null; durationSec: number; views: number;
    orientation: "HORIZONTAL" | "VERTICAL"; locked: boolean; price: number; priceCurrency?: "UZS" | "USD";
    author: { name: string | null; username: string | null; image: string | null; verified: boolean; verifiedCategory?: string | null } | null;
}

const MEDIA_TABS = [
    { id: "cinema", icon: Film, label: "Kino" },
    { id: "music", icon: Music2, label: "Musiqa" },
    { id: "podcast", icon: Mic2, label: "Podkast" },
    { id: "audiobook", icon: Headphones, label: "Audiokitob" },
    { id: "book", icon: BookOpen, label: "Kitob" },
] as const;
type MediaTab = (typeof MEDIA_TABS)[number]["id"];

const TAB_KIND: Record<string, "MUSIC" | "PODCAST" | "AUDIOBOOK"> = {
    music: "MUSIC", podcast: "PODCAST", audiobook: "AUDIOBOOK",
};

function fmtN(n: number) {
    if (n >= 1_000_000) return (n / 1_000_000).toFixed(1).replace(/\.0$/, "") + "M";
    if (n >= 1_000) return (n / 1_000).toFixed(1).replace(/\.0$/, "") + "K";
    return String(n);
}
function fmtDur(s: number) { const m = Math.floor(s / 60), sec = Math.floor(s % 60); return `${m}:${String(sec).padStart(2, "0")}`; }
function coverOf(t: Track) {
    return t.coverUrl || `https://api.dicebear.com/9.x/shapes/svg?seed=${encodeURIComponent(t.id)}`;
}
function toNx(t: Track): NxTrack {
    return {
        id: t.id, title: t.title,
        artist: t.artist || t.uploader?.name || t.uploader?.username || "Noma'lum",
        image: coverOf(t), duration: fmtDur(t.durationSec), durationSec: t.durationSec, src: t.audioUrl,
    };
}

export function MediaView() {
    const { openVideo, playQueue } = useNxPlayer();
    const [sub, setSub] = useState<MediaTab>("music");
    const [topTracks, setTopTracks] = useState<Track[]>([]);
    const [newTracks, setNewTracks] = useState<Track[]>([]);
    const [likedTracks, setLikedTracks] = useState<Track[]>([]);
    const [kino, setKino] = useState<KinoVid[]>([]);
    const [loading, setLoading] = useState(true);
    const [uploadOpen, setUploadOpen] = useState(false);
    const [query, setQuery] = useState("");
    const [genre, setGenre] = useState<string>("");
    const [genres, setGenres] = useState<{ name: string; count: number }[]>([]);
    const [searchResults, setSearchResults] = useState<Track[] | null>(null);
    const [searching, setSearching] = useState(false);
    const [karaokeTrack, setKaraokeTrack] = useState<Track | null>(null);

    const load = useCallback(async () => {
        setLoading(true);
        try {
            if (sub === "cinema") {
                const d = await fetch("/api/nexus/videos?category=kino&sort=trend&limit=30").then(r => r.json());
                setKino(d.videos ?? []);
            } else if (sub in TAB_KIND) {
                const kind = TAB_KIND[sub];
                const gp = genre ? `&genre=${encodeURIComponent(genre)}` : "";
                const [top, fresh, liked] = await Promise.all([
                    fetch(`/api/nexus/tracks?kind=${kind}&sort=top&limit=20${gp}`).then(r => r.json()),
                    fetch(`/api/nexus/tracks?kind=${kind}&sort=new&limit=20${gp}`).then(r => r.json()),
                    fetch(`/api/nexus/tracks?kind=${kind}&scope=liked&limit=20${gp}`).then(r => r.json()).catch(() => ({ tracks: [] })),
                ]);
                setTopTracks(top.tracks ?? []);
                setNewTracks(fresh.tracks ?? []);
                setLikedTracks(liked.tracks ?? []);
                setGenres(top.genres ?? []);
            }
        } finally { setLoading(false); }
    }, [sub, genre]);

    useEffect(() => { load(); }, [load]);

    // Debounced search (audio tab)
    useEffect(() => {
        const q = query.trim();
        if (!q || !(sub in TAB_KIND)) { setSearchResults(null); return; }
        setSearching(true);
        const t = setTimeout(async () => {
            try {
                const kind = TAB_KIND[sub];
                const d = await fetch(`/api/nexus/tracks?kind=${kind}&q=${encodeURIComponent(q)}&sort=top&limit=40`).then(r => r.json());
                setSearchResults(d.tracks ?? []);
            } finally { setSearching(false); }
        }, 300);
        return () => clearTimeout(t);
    }, [query, sub]);

    // Tab o'zgarganda qidiruvni tozalash
    useEffect(() => { setQuery(""); setSearchResults(null); setGenre(""); }, [sub]);

    function playShuffled(list: Track[]) {
        if (list.length === 0) return;
        const shuffled = [...list].sort(() => Math.random() - 0.5);
        playQueue(shuffled.map(toNx), 0);
    }

    function playFrom(list: Track[], idx: number) {
        playQueue(list.map(toNx), idx);
    }

    async function toggleLike(t: Track) {
        const apply = (arr: Track[]) => arr.map(x => x.id === t.id
            ? { ...x, isLiked: !t.isLiked, likeCount: Math.max(0, x.likeCount + (t.isLiked ? -1 : 1)) }
            : x);
        setTopTracks(apply); setNewTracks(apply); setLikedTracks(apply);
        try {
            const r = await fetch(`/api/nexus/tracks/${t.id}/like`, { method: "POST" });
            if (!r.ok) throw new Error();
        } catch {
            const revert = (arr: Track[]) => arr.map(x => x.id === t.id ? { ...x, isLiked: t.isLiked, likeCount: t.likeCount } : x);
            setTopTracks(revert); setNewTracks(revert); setLikedTracks(revert);
        }
    }

    const audioTab = sub in TAB_KIND;

    return (
        <div className="animate-in fade-in slide-in-from-bottom-1 duration-250 pb-32">
            {/* Sub-tablar */}
            <div className="mx-4 mt-4 mb-2 flex gap-2 overflow-x-auto pb-1" style={{ scrollbarWidth: "none" }}>
                {MEDIA_TABS.map(({ id, icon: Icon, label }) => (
                    <button key={id} onClick={() => setSub(id)}
                        className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold flex-shrink-0 transition-all duration-200 active:scale-95"
                        style={sub === id
                            ? { background: "linear-gradient(135deg,#2B3EE8,#00CEC8)", color: "white", boxShadow: "0 4px 16px rgba(43,62,232,0.40)" }
                            : { background: "rgba(11,18,40,0.60)", border: "1px solid rgba(43,62,232,0.22)", color: "rgba(140,160,210,0.85)" }}>
                        <Icon className="w-4 h-4" />
                        {label}
                    </button>
                ))}
            </div>

            {/* Audio tablar uchun qidiruv + yuklash CTA + shuffle */}
            {audioTab && (
                <>
                    <div className="mx-4 mb-3 flex gap-2">
                        <div className="relative flex-1">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none" style={{ color: "rgba(16,185,129,0.55)" }} />
                            <input value={query} onChange={e => setQuery(e.target.value)}
                                placeholder={sub === "music" ? "Trek/ijrochi qidiring..." : sub === "podcast" ? "Podkast qidiring..." : "Audiokitob qidiring..."}
                                className="w-full h-10 rounded-xl pl-10 pr-9 text-sm text-white outline-none"
                                style={{ background: "rgba(16,185,129,0.06)", border: "1px solid rgba(16,185,129,0.22)", caretColor: "#10B981" }} />
                            {query && (
                                <button onClick={() => setQuery("")} className="absolute right-3 top-1/2 -translate-y-1/2">
                                    <X className="w-3.5 h-3.5" style={{ color: "rgba(160,180,180,0.7)" }} />
                                </button>
                            )}
                        </div>
                        <button onClick={() => playShuffled(topTracks.length ? topTracks : newTracks)}
                            disabled={topTracks.length === 0 && newTracks.length === 0}
                            title="Aralashtirib boshlash"
                            className="w-10 h-10 flex items-center justify-center rounded-xl flex-shrink-0 disabled:opacity-40 active:scale-95"
                            style={{ background: "linear-gradient(135deg,#10B981,#0D9488)" }}>
                            <Shuffle className="w-4 h-4 text-white" />
                        </button>
                    </div>

                    {/* Genre chips */}
                    {genres.length > 0 && !query && (
                        <div className="mx-4 mb-3 flex gap-1.5 overflow-x-auto pb-1" style={{ scrollbarWidth: "none" }}>
                            <button onClick={() => setGenre("")}
                                className="flex-shrink-0 flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-black transition active:scale-95"
                                style={genre === ""
                                    ? { background: "linear-gradient(135deg,#10B981,#0D9488)", color: "#fff" }
                                    : { background: "rgba(16,185,129,0.08)", border: "1px solid rgba(16,185,129,0.22)", color: "rgba(160,200,180,0.85)" }}>
                                Barchasi
                            </button>
                            {genres.map(g => (
                                <button key={g.name} onClick={() => setGenre(g === undefined || genre === g.name ? "" : g.name)}
                                    className="flex-shrink-0 flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-black transition active:scale-95"
                                    style={genre === g.name
                                        ? { background: "linear-gradient(135deg,#10B981,#0D9488)", color: "#fff" }
                                        : { background: "rgba(16,185,129,0.08)", border: "1px solid rgba(16,185,129,0.22)", color: "rgba(160,200,180,0.85)" }}>
                                    <Tag className="w-2.5 h-2.5" />{g.name}
                                    <span className="opacity-70">{g.count}</span>
                                </button>
                            ))}
                        </div>
                    )}

                    <div className="mx-4 mb-3">
                        <button onClick={() => setUploadOpen(true)}
                            className="w-full flex items-center gap-3 p-4 rounded-2xl transition-all duration-150 active:scale-[0.99]"
                            style={{ background: "rgba(16,185,129,0.10)", border: "1px solid rgba(16,185,129,0.25)" }}>
                            <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: "linear-gradient(135deg,#10B981,#0D9488)" }}>
                                <Plus className="w-5 h-5 text-white" />
                            </div>
                            <div className="flex-1 text-left">
                                <p className="text-sm font-black text-white">Trek yuklash</p>
                                <p className="text-[10px]" style={{ color: "rgba(80,180,140,0.80)" }}>
                                    {sub === "music" ? "Musiqangizni" : sub === "podcast" ? "Podkastingizni" : "Audiokitobingizni"} butun Nexus tinglasin
                                </p>
                            </div>
                        </button>
                    </div>
                </>
            )}

            {/* Qidiruv natijalari (audio tab + query bor) */}
            {audioTab && (query.trim() || searching) ? (
                searching && !searchResults ? (
                    <SkelRow />
                ) : searchResults && searchResults.length === 0 ? (
                    <EmptyState icon={Search} title="Natija topilmadi" hint={`"${query}" bo'yicha hech narsa yo'q`} />
                ) : searchResults ? (
                    <TrackRow title={`"${query}" bo'yicha natijalar`} accent="#00CEC8"
                        items={searchResults} onPlay={i => playFrom(searchResults, i)} onLike={toggleLike} onKaraoke={setKaraokeTrack} />
                ) : null
            ) : loading ? (
                <>
                    <SkelRow />
                    <SkelRow />
                </>
            ) : sub === "cinema" ? (
                kino.length === 0 ? (
                    <EmptyState icon={Film} title="Hali kino yo'q" hint="Video bo'limida 'Kino' kategoriyasida yuklangan videolar shu yerda chiqadi" />
                ) : (
                    <div className="px-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                        {kino.map(v => (
                            <div key={v.id} role="button" tabIndex={0}
                                onClick={() => openVideo({ id: v.id, title: v.title, image: v.thumbUrl || "", author: v.author?.name || v.author?.username || "", avatar: v.author?.image || "", views: fmtN(v.views), duration: fmtDur(v.durationSec) })}
                                onKeyDown={e => e.key === "Enter" && openVideo({ id: v.id, title: v.title, image: v.thumbUrl || "", author: v.author?.name || "", avatar: "", views: fmtN(v.views), duration: fmtDur(v.durationSec) })}
                                className="text-left group cursor-pointer">
                                <div className="relative aspect-video rounded-xl overflow-hidden mb-2" style={{ border: "1px solid rgba(43,62,232,0.18)", background: "rgba(43,62,232,0.08)" }}>
                                    {v.thumbUrl
                                        ? <img src={v.thumbUrl} alt={v.title} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" />
                                        : <div className="w-full h-full flex items-center justify-center"><Film className="w-8 h-8 text-white/40" /></div>}
                                    <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" style={{ background: "rgba(5,8,24,0.35)" }}>
                                        <div className="w-12 h-12 rounded-full flex items-center justify-center" style={{ background: "linear-gradient(135deg,#2B3EE8,#00CEC8)" }}><Play className="w-5 h-5 text-white fill-white ml-0.5" /></div>
                                    </div>
                                    {v.price > 0 && <span className="absolute top-2 left-2 px-1.5 py-0.5 rounded text-[10px] font-black text-white" style={{ background: "linear-gradient(135deg,#2B3EE8,#00CEC8)" }}>{formatMoney(v.price, v.priceCurrency ?? "UZS")}</span>}
                                    {v.durationSec > 0 && <span className="absolute bottom-2 right-2 px-1.5 py-0.5 rounded text-[10px] font-bold text-white" style={{ background: "rgba(5,8,24,0.85)" }}>{fmtDur(v.durationSec)}</span>}
                                </div>
                                <h4 className="text-sm font-bold text-white leading-snug line-clamp-2 group-hover:text-[#00CEC8] transition-colors">{v.title}</h4>
                                <p className="text-[11px] mt-1 flex items-center gap-1.5" style={{ color: "rgba(100,120,170,0.8)" }}>
                                    <span className="truncate">{v.author?.name || v.author?.username || ""}</span>
                                    <span>·</span>
                                    <span className="flex items-center gap-0.5"><Eye className="w-2.5 h-2.5" />{fmtN(v.views)}</span>
                                </p>
                            </div>
                        ))}
                    </div>
                )
            ) : sub === "book" ? (
                <EmptyState icon={BookOpen} title="E-kitoblar — tez kunda" hint="Bu bo'lim keyingi bosqichda quriladi" />
            ) : (
                <>
                    <TrackRow title={sub === "music" ? "Top treklar" : sub === "podcast" ? "Mashhur podkastlar" : "Mashhur audiokitoblar"}
                        accent="#10B981" items={topTracks} onPlay={i => playFrom(topTracks, i)} onLike={toggleLike} onKaraoke={setKaraokeTrack}
                        empty="Hali trek yo'q — birinchi bo'lib yuklang!" />
                    <TrackRow title="Yangi qo'shilgan" accent="#00CEC8" items={newTracks} onPlay={i => playFrom(newTracks, i)} onLike={toggleLike} onKaraoke={setKaraokeTrack} hideIfEmpty />
                    <TrackRow title="Sevimlilarim" accent="#EF4444" items={likedTracks} onPlay={i => playFrom(likedTracks, i)} onLike={toggleLike} onKaraoke={setKaraokeTrack} hideIfEmpty />
                </>
            )}

            <NxTrackCreate open={uploadOpen} onClose={() => setUploadOpen(false)} onCreated={load}
                defaultKind={TAB_KIND[sub] ?? "MUSIC"} />
            {karaokeTrack && (
                <NxKaraokePlayer
                    open={true}
                    onClose={() => setKaraokeTrack(null)}
                    trackId={karaokeTrack.id}
                    title={karaokeTrack.title}
                    artist={karaokeTrack.artist ?? karaokeTrack.uploader?.name ?? karaokeTrack.uploader?.username ?? null}
                    cover={karaokeTrack.coverUrl}
                    audioUrl={karaokeTrack.audioUrl}
                />
            )}
        </div>
    );
}

// ─────────────────────────────────────────────────────────────────────────────
function TrackRow({ title, accent, items, onPlay, onLike, onKaraoke, empty, hideIfEmpty }: {
    title: string; accent: string; items: Track[];
    onPlay: (idx: number) => void; onLike: (t: Track) => void;
    onKaraoke?: (t: Track) => void;
    empty?: string; hideIfEmpty?: boolean;
}) {
    if (!items.length && hideIfEmpty) return null;
    return (
        <div className="mb-6">
            <div className="px-4 mb-3 flex items-center gap-2">
                <div className="w-1 h-4 rounded-full" style={{ background: accent }} />
                <span className="text-sm font-black text-white">{title}</span>
                {items.length > 0 && <span className="text-[11px] font-bold" style={{ color: "rgba(100,120,170,0.7)" }}>{items.length}</span>}
            </div>
            {items.length === 0 ? (
                <div className="mx-4 px-4 py-6 rounded-2xl text-center" style={{ background: "rgba(16,185,129,0.05)", border: "1px dashed rgba(16,185,129,0.20)" }}>
                    <p className="text-xs" style={{ color: "rgba(130,170,150,0.75)" }}>{empty}</p>
                </div>
            ) : (
                <div className="flex gap-3 overflow-x-auto px-4 pb-1" style={{ scrollbarWidth: "none" }}>
                    {items.map((t, i) => (
                        <div key={t.id} className="w-36 flex-shrink-0 group">
                            <div role="button" tabIndex={0} onClick={() => onPlay(i)} onKeyDown={e => e.key === "Enter" && onPlay(i)}
                                className="relative w-36 h-36 rounded-2xl overflow-hidden cursor-pointer mb-2"
                                style={{ border: "1px solid rgba(16,185,129,0.20)", background: "rgba(16,185,129,0.06)" }}>
                                <img src={coverOf(t)} alt={t.title} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" />
                                <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity" style={{ background: "rgba(5,8,24,0.40)" }}>
                                    <div className="w-11 h-11 rounded-full flex items-center justify-center" style={{ background: "linear-gradient(135deg,#10B981,#0D9488)" }}>
                                        <Play className="w-5 h-5 text-white fill-white ml-0.5" />
                                    </div>
                                </div>
                                <button onClick={e => { e.stopPropagation(); onLike(t); }}
                                    className="absolute top-2 right-2 w-7 h-7 flex items-center justify-center rounded-lg"
                                    style={{ background: "rgba(5,8,24,0.70)", backdropFilter: "blur(6px)" }}>
                                    <Heart className="w-3.5 h-3.5" style={{ color: t.isLiked ? "#EF4444" : "#fff", fill: t.isLiked ? "#EF4444" : "none" }} />
                                </button>
                                {/* Karaoke tugma — faqat hasKaraoke bo'lsa */}
                                {t.hasKaraoke && onKaraoke && (
                                    <button onClick={e => { e.stopPropagation(); onKaraoke(t); }}
                                        title="Karaoke"
                                        className="absolute top-2 left-2 flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[9px] font-black text-white uppercase"
                                        style={{ background: "linear-gradient(135deg,#8B5CF6,#EC4899)", boxShadow: "0 4px 12px rgba(139,92,246,0.45)" }}>
                                        <Mic2 className="w-2.5 h-2.5" /> KARAOKE
                                    </button>
                                )}
                                <span className="absolute bottom-2 right-2 px-1.5 py-0.5 rounded text-[9px] font-bold text-white flex items-center gap-0.5" style={{ background: "rgba(5,8,24,0.80)" }}>
                                    <Clock className="w-2.5 h-2.5" />{fmtDur(t.durationSec)}
                                </span>
                            </div>
                            <p className="text-xs font-bold text-white truncate">{t.title}</p>
                            <p className="text-[10px] truncate flex items-center gap-1" style={{ color: "rgba(120,150,135,0.85)" }}>
                                {t.uploader?.username ? (
                                    <Link href={`/nexus/u/${t.uploader.username}`}
                                        className="truncate inline-flex items-center gap-0.5 hover:text-white transition-colors"
                                        onClick={e => e.stopPropagation()}>
                                        {t.artist || t.uploader.name || t.uploader.username}
                                        {t.uploader.verified && <NxVerifiedBadge category={t.uploader.verifiedCategory} size={10} />}
                                    </Link>
                                ) : (
                                    <span className="truncate">{t.artist || "Noma'lum"}</span>
                                )}
                                <span>·</span>
                                <span className="flex-shrink-0">{fmtN(t.plays)} tinglash</span>
                            </p>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}

// Skeleton qator (M-2)
function SkelRow() {
    return (
        <div className="mb-6">
            <div className="px-4 mb-3 flex items-center gap-2">
                <div className="w-1 h-4 rounded-full" style={{ background: "rgba(16,185,129,0.30)" }} />
                <div className="h-3 w-24 rounded animate-pulse" style={{ background: "rgba(16,185,129,0.15)" }} />
            </div>
            <div className="flex gap-3 overflow-x-auto px-4 pb-1" style={{ scrollbarWidth: "none" }}>
                {[0,1,2,3,4,5].map(i => (
                    <div key={i} className="w-36 flex-shrink-0 animate-pulse">
                        <div className="w-36 h-36 rounded-2xl mb-2" style={{ background: "rgba(16,185,129,0.10)", border: "1px solid rgba(16,185,129,0.15)" }} />
                        <div className="h-2.5 rounded mb-1" style={{ background: "rgba(16,185,129,0.15)", width: "80%" }} />
                        <div className="h-2 rounded" style={{ background: "rgba(16,185,129,0.10)", width: "60%" }} />
                    </div>
                ))}
            </div>
        </div>
    );
}

function EmptyState({ icon: Icon, title, hint }: { icon: React.ElementType; title: string; hint?: string }) {
    return (
        <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
            <div className="w-14 h-14 rounded-2xl flex items-center justify-center mb-3" style={{ background: "rgba(43,62,232,0.08)", border: "1px solid rgba(43,62,232,0.15)" }}>
                <Icon className="w-6 h-6" style={{ color: "rgba(43,62,232,0.45)" }} />
            </div>
            <p className="text-sm font-bold text-white/70 mb-1">{title}</p>
            {hint && <p className="text-xs max-w-xs" style={{ color: "rgba(110,130,180,0.7)" }}>{hint}</p>}
        </div>
    );
}
