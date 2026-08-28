"use client";

// Barcha karaoke performance'lar sahifasi — /nexus/karaoke
import { useEffect, useState, useCallback } from "react";
import { Link } from "@/i18n/routing";
import { ArrowLeft, Trophy, Sparkles, User, Loader2 } from "lucide-react";
import { NxPlayerProvider } from "./nx-player-ctx";
import { NxShare } from "./nx-share";
import { KaraokePerformanceCard, type KaraokePerformance } from "./nx-karaoke-performances";

type Scope = "trending" | "new" | "mine";

const PAGE = 20;

function KaraokePageInner() {
    const [scope, setScope] = useState<Scope>("trending");
    const [items, setItems] = useState<KaraokePerformance[]>([]);
    const [loading, setLoading] = useState(true);
    const [loadingMore, setLoadingMore] = useState(false);
    const [hasMore, setHasMore] = useState(false);

    const load = useCallback(async () => {
        setLoading(true);
        try {
            const d = await fetch(`/api/nexus/karaoke/performances?scope=${scope}&limit=${PAGE}&offset=0`).then(r => r.json());
            const list: KaraokePerformance[] = d.performances ?? [];
            setItems(list);
            setHasMore(!!d.hasMore);
        } finally { setLoading(false); }
    }, [scope]);

    useEffect(() => { load(); }, [load]);

    async function loadMore() {
        if (loadingMore || !hasMore) return;
        setLoadingMore(true);
        try {
            const d = await fetch(`/api/nexus/karaoke/performances?scope=${scope}&limit=${PAGE}&offset=${items.length}`).then(r => r.json());
            const list: KaraokePerformance[] = d.performances ?? [];
            setItems(prev => [...prev, ...list]);
            setHasMore(!!d.hasMore);
        } finally { setLoadingMore(false); }
    }

    return (
        <div className="fixed inset-0 z-[100] flex flex-col" style={{ background: "#050818" }}>
            {/* Header */}
            <div className="flex-shrink-0 flex items-center gap-3 px-4 pt-4 pb-3" style={{ borderBottom: "1px solid rgba(139,92,246,0.20)" }}>
                <Link href="/nexus" className="w-9 h-9 flex items-center justify-center rounded-xl"
                    style={{ background: "rgba(139,92,246,0.10)", border: "1px solid rgba(139,92,246,0.25)" }}>
                    <ArrowLeft className="w-4 h-4 text-white" />
                </Link>
                <div className="flex-1">
                    <h1 className="text-lg font-black text-white flex items-center gap-2">
                        <Trophy className="w-5 h-5" style={{ color: "#EC4899" }} />
                        Karaoke
                    </h1>
                    <p className="text-[10px]" style={{ color: "rgba(180,150,220,0.75)" }}>Barcha ijrolar — kim eng yaxshi?</p>
                </div>
            </div>

            {/* Tab bar */}
            <div className="flex-shrink-0 flex gap-2 px-4 pt-3 pb-2">
                {([
                    { id: "trending", label: "Top", icon: Trophy },
                    { id: "new", label: "Yangi", icon: Sparkles },
                    { id: "mine", label: "Mening", icon: User },
                ] as { id: Scope; label: string; icon: React.ElementType }[]).map(t => (
                    <button key={t.id} onClick={() => setScope(t.id)}
                        className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-xs font-black transition active:scale-95"
                        style={scope === t.id
                            ? { background: "linear-gradient(135deg,#8B5CF6,#EC4899)", color: "#fff" }
                            : { background: "rgba(139,92,246,0.06)", border: "1px solid rgba(139,92,246,0.20)", color: "rgba(180,150,220,0.85)" }}>
                        <t.icon className="w-3.5 h-3.5" />{t.label}
                    </button>
                ))}
            </div>

            {/* Ro'yxat */}
            <div className="flex-1 overflow-y-auto px-4 py-3" style={{ scrollbarWidth: "none" }}>
                {loading ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {[0,1,2,3].map(i => (
                            <div key={i} className="h-40 rounded-2xl animate-pulse" style={{ background: "rgba(236,72,153,0.08)" }} />
                        ))}
                    </div>
                ) : items.length === 0 ? (
                    <div className="text-center py-16">
                        <Trophy className="w-12 h-12 mx-auto mb-3" style={{ color: "rgba(236,72,153,0.30)" }} />
                        <p className="text-sm font-black text-white/70 mb-1">
                            {scope === "mine" ? "Hali karaoke qilmadingiz" : "Hozircha ijrolar yo'q"}
                        </p>
                        <p className="text-xs" style={{ color: "rgba(180,150,220,0.65)" }}>
                            {scope === "mine" ? "Musiqa bo'limida KARAOKE badge'i bor trekni topib, kuylab ko'ring"
                                : "Birinchi bo'lib karaoke ijro qilib ulashing!"}
                        </p>
                    </div>
                ) : (
                    <>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            {items.map(p => (
                                <KaraokePerformanceCard key={p.id} p={p}
                                    onDeleted={id => setItems(prev => prev.filter(x => x.id !== id))} />
                            ))}
                        </div>
                        {hasMore && (
                            <div className="flex justify-center mt-4">
                                <button onClick={loadMore} disabled={loadingMore}
                                    className="px-5 py-2 rounded-xl text-xs font-black text-white active:scale-95 disabled:opacity-50"
                                    style={{ background: "linear-gradient(135deg,#8B5CF6,#EC4899)" }}>
                                    {loadingMore ? <><Loader2 className="w-3 h-3 animate-spin inline mr-1" />Yuklanmoqda</> : "Ko'proq"}
                                </button>
                            </div>
                        )}
                    </>
                )}
            </div>
        </div>
    );
}

export function NexusKaraokePage() {
    return (
        <NxPlayerProvider>
            <KaraokePageInner />
            <NxShare />
        </NxPlayerProvider>
    );
}
