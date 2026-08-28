"use client";

// Bitta karaoke performance sahifasi — /nexus/karaoke/[id]
// Katta player + performer + trek + duet options + trek leaderboard
import { useEffect, useState, useCallback } from "react";
import { Link } from "@/i18n/routing";
import { ArrowLeft, Loader2, Trophy } from "lucide-react";
import { NxPlayerProvider } from "./nx-player-ctx";
import { NxShare } from "./nx-share";
import { KaraokePerformanceCard, type KaraokePerformance } from "./nx-karaoke-performances";

function PermalinkInner({ id }: { id: string }) {
    const [perf, setPerf] = useState<KaraokePerformance | null>(null);
    const [leaderboard, setLeaderboard] = useState<KaraokePerformance[]>([]);
    const [loading, setLoading] = useState(true);
    const [notFound, setNotFound] = useState(false);

    const load = useCallback(async () => {
        setLoading(true);
        try {
            const d = await fetch(`/api/nexus/karaoke/performances/${id}`).then(r => r.json());
            if (!d.performance) { setNotFound(true); return; }
            setPerf(d.performance);
            // Shu trek uchun top ijrolar
            const trackId = d.performance.track?.id;
            if (trackId) {
                const l = await fetch(`/api/nexus/karaoke/performances?trackId=${trackId}&scope=trending&limit=10`).then(r => r.json());
                setLeaderboard((l.performances ?? []).filter((p: KaraokePerformance) => p.id !== id));
            }
        } catch { setNotFound(true); }
        finally { setLoading(false); }
    }, [id]);

    useEffect(() => { load(); }, [load]);

    return (
        <div className="fixed inset-0 z-[100] flex flex-col" style={{ background: "#050818" }}>
            {/* Header */}
            <div className="flex-shrink-0 flex items-center gap-3 px-4 pt-4 pb-3" style={{ borderBottom: "1px solid rgba(139,92,246,0.20)" }}>
                <Link href="/nexus/karaoke" className="w-9 h-9 flex items-center justify-center rounded-xl"
                    style={{ background: "rgba(139,92,246,0.10)", border: "1px solid rgba(139,92,246,0.25)" }}>
                    <ArrowLeft className="w-4 h-4 text-white" />
                </Link>
                <h1 className="text-lg font-black text-white flex-1">Karaoke ijro</h1>
            </div>

            <div className="flex-1 overflow-y-auto px-4 py-4" style={{ scrollbarWidth: "none" }}>
                {loading ? (
                    <div className="flex justify-center py-16">
                        <Loader2 className="w-8 h-8 animate-spin" style={{ color: "#EC4899" }} />
                    </div>
                ) : notFound || !perf ? (
                    <div className="text-center py-16">
                        <p className="text-sm font-black text-white/70 mb-1">Ijro topilmadi</p>
                        <p className="text-xs" style={{ color: "rgba(180,150,220,0.65)" }}>
                            Ehtimol egasi o&apos;chirgan yoki maxfiy qilingan
                        </p>
                    </div>
                ) : (
                    <>
                        {/* Asosiy performance */}
                        <div className="mb-6">
                            <KaraokePerformanceCard p={perf} />
                        </div>

                        {/* Trek bo'yicha leaderboard */}
                        {leaderboard.length > 0 && perf.track && (
                            <div>
                                <div className="flex items-center gap-2 mb-3">
                                    <Trophy className="w-4 h-4" style={{ color: "#F5B301" }} />
                                    <h2 className="text-sm font-black text-white">Shu trek bo&apos;yicha top</h2>
                                    <span className="text-[11px]" style={{ color: "rgba(180,150,220,0.75)" }}>{leaderboard.length}</span>
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                    {leaderboard.map(l => <KaraokePerformanceCard key={l.id} p={l} />)}
                                </div>
                            </div>
                        )}
                    </>
                )}
            </div>
        </div>
    );
}

export function NexusKaraokePermalink({ id }: { id: string }) {
    return (
        <NxPlayerProvider>
            <PermalinkInner id={id} />
            <NxShare />
        </NxPlayerProvider>
    );
}
