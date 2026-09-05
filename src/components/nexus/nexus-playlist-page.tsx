"use client";

// Nexus playlist permalink sahifasi - public playlist ko'rish + tinglash.

import { useEffect, useState } from "react";
import { Link } from "@/i18n/routing";
import { Play, ArrowLeft, Music, Loader2, User, Lock, Share2, Trash2 } from "lucide-react";

interface Track {
    id: string; title: string; artist: string | null;
    coverUrl: string | null; audioUrl: string;
    durationSec: number; kind: string;
    position: number; addedAt: string;
}
interface Resp {
    id: string; name: string; description: string | null;
    coverUrl: string | null; isPublic: boolean; playsCount: number;
    updatedAt: string; isMine: boolean;
    owner: { username: string | null; name: string | null; image: string | null } | null;
    tracks: Track[];
}

function fmtDur(s: number): string {
    const m = Math.floor(s / 60);
    const rest = s % 60;
    return `${m}:${String(rest).padStart(2, "0")}`;
}

export function NexusPlaylistPage({ id }: { id: string }) {
    const [data, setData] = useState<Resp | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        fetch(`/api/nexus/playlists/${id}`, { cache: "no-store" })
            .then(async r => {
                if (r.ok) setData(await r.json());
                else if (r.status === 403) setError("Bu pleylist yashirin");
                else setError("Pleylist topilmadi");
            })
            .catch(() => setError("Xatolik"))
            .finally(() => setLoading(false));
    }, [id]);

    const removeTrack = async (trackId: string) => {
        if (!data?.isMine) return;
        try {
            await fetch(`/api/nexus/playlists/${id}/tracks?trackId=${trackId}`, { method: "DELETE" });
            setData(prev => prev ? { ...prev, tracks: prev.tracks.filter(t => t.id !== trackId) } : prev);
        } catch { /* skip */ }
    };

    const playAll = () => {
        // Fire event - nx-player-ctx uchun
        try {
            window.dispatchEvent(new CustomEvent("nexus:play-playlist", { detail: { tracks: data?.tracks || [] } }));
        } catch { /* skip */ }
    };

    if (loading) {
        return (
            <div className="min-h-screen grid place-items-center bg-neutral-50 dark:bg-neutral-950">
                <Loader2 className="w-6 h-6 animate-spin text-neutral-400" />
            </div>
        );
    }
    if (error || !data) {
        return (
            <div className="min-h-screen grid place-items-center bg-neutral-50 dark:bg-neutral-950 p-4">
                <div className="text-center">
                    <Lock className="w-10 h-10 mx-auto mb-2 opacity-30 text-neutral-400" />
                    <p className="text-[13px] text-neutral-500">{error || "Pleylist mavjud emas"}</p>
                    <Link href={"/nexus" as never}
                        className="inline-block mt-4 h-10 px-4 rounded-xl bg-black text-white text-[13px] font-black">
                        Nexus'ga qaytish
                    </Link>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-neutral-50 dark:bg-neutral-950">
            <div className="max-w-3xl mx-auto px-4 py-6">
                <div className="flex items-center gap-3 mb-5">
                    <Link href={"/nexus" as never}
                        className="w-10 h-10 rounded-xl grid place-items-center hover:bg-neutral-100 dark:hover:bg-neutral-800">
                        <ArrowLeft className="w-4 h-4" />
                    </Link>
                </div>

                <div className="flex flex-col sm:flex-row gap-5 mb-6">
                    <div className="w-full sm:w-48 aspect-square rounded-2xl overflow-hidden flex-shrink-0"
                        style={{ background: "linear-gradient(135deg, #a855f7 0%, #ec4899 100%)" }}>
                        {data.coverUrl ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={data.coverUrl} alt="" className="w-full h-full object-cover" />
                        ) : (
                            <div className="w-full h-full grid place-items-center">
                                <Music className="w-16 h-16 text-white/70" />
                            </div>
                        )}
                    </div>
                    <div className="min-w-0 flex-1">
                        <p className="text-[11px] font-black uppercase tracking-widest text-neutral-500 mb-1">
                            {data.isPublic ? "OMMAVIY PLEYLIST" : "SHAXSIY PLEYLIST"}
                        </p>
                        <h1 className="text-[28px] font-black leading-tight mb-1">{data.name}</h1>
                        {data.description && (
                            <p className="text-[13.5px] text-neutral-600 dark:text-neutral-400 mb-3">{data.description}</p>
                        )}
                        <div className="flex items-center gap-2 mb-4 text-[12px] text-neutral-500">
                            {data.owner && (
                                <div className="flex items-center gap-1.5">
                                    {data.owner.image ? (
                                        // eslint-disable-next-line @next/next/no-img-element
                                        <img src={data.owner.image} alt="" className="w-5 h-5 rounded-full" />
                                    ) : <User className="w-3.5 h-3.5" />}
                                    <span className="font-bold">
                                        {data.owner.username ? `@${data.owner.username}` : data.owner.name}
                                    </span>
                                </div>
                            )}
                            <span>·</span>
                            <span>{data.tracks.length} trek</span>
                            {data.playsCount > 0 && <><span>·</span><span>{data.playsCount} ijro</span></>}
                        </div>

                        <div className="flex items-center gap-2">
                            <button onClick={playAll} disabled={data.tracks.length === 0}
                                className="h-11 px-5 rounded-xl bg-purple-600 text-white text-[13.5px] font-black inline-flex items-center gap-1.5 hover:bg-purple-700 disabled:opacity-40">
                                <Play className="w-4 h-4" fill="white" /> Barchasini ijro qilish
                            </button>
                            <button onClick={() => navigator.clipboard.writeText(window.location.href).catch(() => {})}
                                className="h-11 px-3 rounded-xl border border-neutral-200 dark:border-neutral-800 text-[13px] font-bold inline-flex items-center gap-1.5 hover:bg-neutral-100 dark:hover:bg-neutral-800">
                                <Share2 className="w-4 h-4" /> Ulash
                            </button>
                        </div>
                    </div>
                </div>

                <div className="rounded-2xl overflow-hidden bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800">
                    {data.tracks.length === 0 && (
                        <div className="p-8 text-center">
                            <Music className="w-10 h-10 mx-auto mb-2 opacity-30 text-neutral-400" />
                            <p className="text-[12.5px] text-neutral-500">Pleylist bo'sh</p>
                        </div>
                    )}
                    {data.tracks.map((t, i) => (
                        <div key={t.id} className="flex items-center gap-3 p-3 border-b border-neutral-100 dark:border-neutral-800 hover:bg-neutral-50 dark:hover:bg-neutral-800/50">
                            <span className="w-6 text-[11.5px] font-bold text-neutral-500 text-center">{i + 1}</span>
                            <div className="w-11 h-11 rounded-lg overflow-hidden flex-shrink-0 bg-neutral-200 dark:bg-neutral-800">
                                {t.coverUrl && (
                                    // eslint-disable-next-line @next/next/no-img-element
                                    <img src={t.coverUrl} alt="" className="w-full h-full object-cover" />
                                )}
                            </div>
                            <div className="flex-1 min-w-0">
                                <p className="text-[13px] font-bold truncate">{t.title}</p>
                                <p className="text-[11.5px] text-neutral-500 truncate">{t.artist || "—"}</p>
                            </div>
                            <span className="text-[11.5px] text-neutral-500 tabular-nums">{fmtDur(t.durationSec)}</span>
                            {data.isMine && (
                                <button onClick={() => removeTrack(t.id)}
                                    className="w-8 h-8 rounded-lg grid place-items-center hover:bg-red-100 dark:hover:bg-red-950/40 text-neutral-400 hover:text-red-500">
                                    <Trash2 className="w-3.5 h-3.5" />
                                </button>
                            )}
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
