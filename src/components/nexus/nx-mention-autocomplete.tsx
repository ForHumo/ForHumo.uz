"use client";

// @mention autocomplete — kompozitorda @ yozganda a'zolar taklifi ochiladi.
// Bosilsa @username matnga qo'shiladi.

import { useEffect, useState } from "react";
import { Loader2, AtSign } from "lucide-react";

type MentionUser = { id: string; name: string | null; username: string | null; image: string | null };

export function NxMentionAutocomplete({
    channelId, query, onPick, onClose,
}: {
    channelId: string;
    query: string;                     // "@abc" — user typed
    onPick: (username: string) => void;
    onClose: () => void;
}) {
    const [items, setItems] = useState<MentionUser[]>([]);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        const q = query.replace(/^@/, "");
        setLoading(true);
        const t = setTimeout(() => {
            fetch(`/api/nexus/channels/${channelId}/mention-suggest?q=${encodeURIComponent(q)}`)
                .then(r => r.ok ? r.json() : { items: [] })
                .then(d => setItems(d.items ?? []))
                .finally(() => setLoading(false));
        }, 200);
        return () => clearTimeout(t);
    }, [channelId, query]);

    if (!items.length && !loading) return null;

    return (
        <div className="absolute bottom-full left-2 mb-2 min-w-[240px] max-h-[280px] overflow-y-auto z-[400] rounded-2xl"
            style={{ background: "rgba(8,12,32,0.99)", border: "1px solid rgba(43,62,232,0.3)", boxShadow: "0 12px 32px rgba(0,0,0,0.4)", scrollbarWidth: "none" }}>
            <div className="px-3 py-2 text-[10px] uppercase tracking-widest flex items-center gap-1.5"
                style={{ color: "rgba(140,160,210,0.7)", borderBottom: "1px solid rgba(43,62,232,0.14)" }}>
                <AtSign className="w-3 h-3" /> A&apos;zoni tanlang
            </div>
            {loading ? (
                <div className="flex justify-center py-6">
                    <Loader2 className="w-4 h-4 animate-spin" style={{ color: "#2B3EE8" }} />
                </div>
            ) : (
                items.map(u => (
                    <button key={u.id}
                        onClick={() => { if (u.username) { onPick(u.username); onClose(); } }}
                        className="w-full flex items-center gap-2 px-3 py-2 text-left hover:bg-white/5">
                        <img src={u.image ?? "/logos/forhumo.png"} alt=""
                            className="w-8 h-8 rounded-full object-cover flex-shrink-0"
                            style={{ border: "1px solid rgba(43,62,232,0.25)" }} />
                        <div className="flex-1 min-w-0">
                            <p className="text-sm font-bold text-white truncate">{u.name ?? u.username}</p>
                            {u.username && <p className="text-[11px]" style={{ color: "rgba(120,140,185,0.7)" }}>@{u.username}</p>}
                        </div>
                    </button>
                ))
            )}
        </div>
    );
}
