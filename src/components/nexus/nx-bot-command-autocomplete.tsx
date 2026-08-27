"use client";

// Bot slash-command autocomplete — kompozitorda `/xyz` yozganda taklif.

import { useEffect, useState } from "react";
import { Loader2, Command } from "lucide-react";

type Cmd = {
    cmd: string; description: string;
    botName: string | null; botHandle: string | null; botImage: string | null;
};

export function NxBotCommandAutocomplete({
    channelId, query, onPick, onClose,
}: {
    channelId: string;
    query: string;
    onPick: (cmd: string) => void;
    onClose: () => void;
}) {
    const [items, setItems] = useState<Cmd[]>([]);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        setLoading(true);
        const t = setTimeout(() => {
            fetch(`/api/nexus/channels/${channelId}/bot-commands?q=${encodeURIComponent(query)}`)
                .then(r => r.ok ? r.json() : { items: [] })
                .then(d => setItems(d.items ?? []))
                .finally(() => setLoading(false));
        }, 150);
        return () => clearTimeout(t);
    }, [channelId, query]);

    if (!loading && items.length === 0) return null;

    return (
        <div className="absolute bottom-full left-2 mb-2 min-w-[280px] max-h-[280px] overflow-y-auto z-[400] rounded-2xl"
            style={{ background: "rgba(8,12,32,0.99)", border: "1px solid rgba(43,62,232,0.3)", boxShadow: "0 12px 32px rgba(0,0,0,0.4)", scrollbarWidth: "none" }}>
            <div className="px-3 py-2 text-[10px] uppercase tracking-widest flex items-center gap-1.5"
                style={{ color: "rgba(140,160,210,0.7)", borderBottom: "1px solid rgba(43,62,232,0.14)" }}>
                <Command className="w-3 h-3" /> Bot buyruqlari
            </div>
            {loading ? (
                <div className="flex justify-center py-4"><Loader2 className="w-4 h-4 animate-spin" style={{ color: "#2B3EE8" }} /></div>
            ) : (
                items.map((c, i) => (
                    <button key={i}
                        onClick={() => { onPick(c.cmd); onClose(); }}
                        className="w-full flex items-center gap-2 px-3 py-2 text-left hover:bg-white/5">
                        <img src={c.botImage ?? "/logos/forhumo.png"} alt=""
                            className="w-7 h-7 rounded-full object-cover flex-shrink-0" />
                        <div className="flex-1 min-w-0">
                            <p className="text-sm text-white truncate">
                                <span style={{ color: "#00CEC8" }}>{c.cmd}</span>
                                {c.botHandle && <span className="text-[11px] ml-1" style={{ color: "rgba(140,160,210,0.6)" }}>@{c.botHandle}</span>}
                            </p>
                            {c.description && <p className="text-[11px] truncate" style={{ color: "rgba(180,195,235,0.75)" }}>{c.description}</p>}
                        </div>
                    </button>
                ))
            )}
        </div>
    );
}
