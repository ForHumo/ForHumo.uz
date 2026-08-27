"use client";

// Agent inline mode — composer'da "@botname query" yozganda avtomatik natijalar.
// Foydalanuvchi natijani tanlaydi -> DM'ga xabar sifatida yuboriladi.

import { useEffect, useRef, useState } from "react";
import { Loader2, Sparkles, Bot } from "lucide-react";

type InlineResult = {
    id: string;
    title: string;
    description?: string;
    thumbnailUrl?: string;
    message: {
        text?: string;
        mediaUrl?: string;
        mediaType?: string;
        mediaMime?: string;
        mediaName?: string;
    };
};

export function NxAgentInlineMode({
    bot, query, convId, onPick, onClose,
}: {
    bot: string;
    query: string;
    convId?: string | null;
    onPick: (result: InlineResult) => void;
    onClose: () => void;
}) {
    const [results, setResults] = useState<InlineResult[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const lastQueryRef = useRef<string>("");

    useEffect(() => {
        const key = `${bot}::${query}`;
        if (lastQueryRef.current === key) return;
        lastQueryRef.current = key;

        const timer = setTimeout(() => {
            setLoading(true);
            setError(null);
            const url = `/api/nexus/agents/inline?bot=${encodeURIComponent(bot)}&q=${encodeURIComponent(query)}${convId ? `&convId=${convId}` : ""}`;
            fetch(url)
                .then(r => r.ok ? r.json() : { results: [] })
                .then(d => {
                    setResults(d.results ?? []);
                    if (d.error) setError(d.error);
                })
                .catch(() => setError("So'rov xato"))
                .finally(() => setLoading(false));
        }, 350);
        return () => clearTimeout(timer);
    }, [bot, query, convId]);

    return (
        <div className="absolute bottom-full left-2 right-2 mb-2 max-h-[320px] overflow-y-auto z-[400] rounded-2xl"
            style={{
                background: "rgba(8,12,32,0.99)",
                border: "1px solid rgba(43,62,232,0.30)",
                boxShadow: "0 12px 32px rgba(0,0,0,0.4)",
                scrollbarWidth: "none",
            }}>
            <div className="px-3 py-2 text-[10px] uppercase tracking-widest flex items-center justify-between"
                style={{ color: "rgba(140,160,210,0.7)", borderBottom: "1px solid rgba(43,62,232,0.14)" }}>
                <div className="flex items-center gap-1.5">
                    <Sparkles className="w-3 h-3" /> Inline · @{bot}
                    {query && <span className="opacity-60">· {query.slice(0, 30)}</span>}
                </div>
                <button onClick={onClose} className="text-[10px] hover:text-white">Yopish</button>
            </div>
            {loading ? (
                <div className="flex justify-center py-4">
                    <Loader2 className="w-4 h-4 animate-spin" style={{ color: "#2B3EE8" }} />
                </div>
            ) : error ? (
                <div className="p-4 text-center text-xs" style={{ color: "#EF4444" }}>
                    {error}
                </div>
            ) : results.length === 0 ? (
                <div className="p-4 text-center">
                    <Bot className="w-6 h-6 mx-auto mb-1 opacity-40" style={{ color: "#00CEC8" }} />
                    <p className="text-xs" style={{ color: "rgba(160,176,224,0.75)" }}>
                        {query ? "Natija yo'q" : "So'rov yozing..."}
                    </p>
                </div>
            ) : (
                <div className="p-1">
                    {results.map(r => (
                        <button key={r.id}
                            onClick={() => onPick(r)}
                            className="w-full flex items-start gap-2 px-2 py-2 rounded-lg text-left hover:bg-white/[0.05]">
                            {r.thumbnailUrl && (
                                <img src={r.thumbnailUrl} alt=""
                                    className="w-10 h-10 rounded-lg object-cover flex-shrink-0"
                                    style={{ background: "rgba(43,62,232,0.10)" }} />
                            )}
                            <div className="flex-1 min-w-0">
                                <p className="text-xs font-bold text-white truncate">{r.title}</p>
                                {r.description && (
                                    <p className="text-[11px] mt-0.5 line-clamp-2"
                                        style={{ color: "rgba(180,195,235,0.75)" }}>
                                        {r.description}
                                    </p>
                                )}
                            </div>
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
}
