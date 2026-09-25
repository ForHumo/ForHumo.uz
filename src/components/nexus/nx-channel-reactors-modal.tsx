"use client";

// Reaksiya berganlar ro'yxati (owner/admin) — post ostidagi ba'zi emojilar bo'yicha
// kim qanday reaksiya qo'yganini ko'rish.

import { useEffect, useState } from "react";
import { X, Loader2, Smile } from "lucide-react";

type Group = {
    emoji: string;
    count: number;
    users: Array<{ id: string; name: string | null; username: string | null; image: string | null }>;
};

export function NxChannelReactorsModal({
    open, channelId, messageId, onClose,
}: {
    open: boolean;
    channelId: string;
    messageId: string;
    onClose: () => void;
}) {
    const [groups, setGroups] = useState<Group[]>([]);
    const [loading, setLoading] = useState(false);
    const [activeEmoji, setActiveEmoji] = useState<string | null>(null);

    useEffect(() => {
        if (!open) return;
        setLoading(true);
        fetch(`/api/nexus/channels/${channelId}/messages/${messageId}/reactors`)
            .then(r => r.ok ? r.json() : { groups: [] })
            .then(d => {
                setGroups(d.groups ?? []);
                setActiveEmoji(d.groups?.[0]?.emoji ?? null);
            })
            .finally(() => setLoading(false));
    }, [open, channelId, messageId]);

    if (!open) return null;

    const active = groups.find(g => g.emoji === activeEmoji) ?? groups[0];

    return (
        <>
            <div className="fixed inset-0 z-[320] bg-black/60 backdrop-blur-sm" onClick={onClose} />
            <div className="fixed inset-x-0 bottom-0 z-[321] flex max-h-[85vh] flex-col overflow-hidden rounded-t-3xl md:inset-y-0 md:right-0 md:inset-x-auto md:max-h-full md:w-[440px] md:rounded-none md:rounded-l-3xl"
                style={{ background: "var(--nx-elevated)", border: "1px solid rgb(var(--nx-accent-rgb) / 0.30)" }}
                onClick={e => e.stopPropagation()}>
                <div className="flex items-center justify-between px-5 py-4 flex-shrink-0"
                    style={{ borderBottom: "1px solid rgb(var(--nx-accent-rgb) / 0.14)" }}>
                    <h3 className="text-base font-black text-[var(--nx-text)] flex items-center gap-2">
                        <Smile className="w-4 h-4" style={{ color: "var(--nx-accent)" }} /> Reaksiya berganlar
                    </h3>
                    <button onClick={onClose} className="w-8 h-8 rounded-full flex items-center justify-center"
                        style={{ background: "rgb(var(--nx-accent-rgb) / 0.12)" }}>
                        <X className="w-4 h-4 text-[var(--nx-text)]" />
                    </button>
                </div>

                {loading ? (
                    <div className="flex justify-center py-12 flex-1"><Loader2 className="w-6 h-6 animate-spin" style={{ color: "var(--nx-accent)" }} /></div>
                ) : groups.length === 0 ? (
                    <div className="text-center py-12">
                        <Smile className="w-10 h-10 mx-auto mb-3 opacity-30" style={{ color: "var(--nx-accent)" }} />
                        <p className="text-sm" style={{ color: "rgb(var(--nx-text-2-rgb)/0.7)" }}>Hali reaksiya yo&apos;q</p>
                    </div>
                ) : (
                    <>
                        <div className="px-3 py-3 flex-shrink-0 overflow-x-auto" style={{ borderBottom: "1px solid rgb(var(--nx-accent-rgb) / 0.10)", scrollbarWidth: "none" }}>
                            <div className="flex gap-1.5">
                                {groups.map(g => (
                                    <button key={g.emoji} onClick={() => setActiveEmoji(g.emoji)}
                                        className="inline-flex items-center gap-1.5 px-3 h-9 rounded-full flex-shrink-0"
                                        style={activeEmoji === g.emoji
                                            ? { background: "rgb(var(--nx-accent-rgb) / 0.20)", border: "1px solid var(--nx-accent)", color: "white" }
                                            : { background: "var(--nx-surface)", border: "1px solid rgb(var(--nx-accent-rgb) / 0.14)", color: "rgb(var(--nx-text-2-rgb)/0.9)" }}>
                                        <span className="text-lg leading-none">{g.emoji}</span>
                                        <span className="text-xs font-bold">{g.count}</span>
                                    </button>
                                ))}
                            </div>
                        </div>
                        <div className="flex-1 overflow-y-auto p-3" style={{ scrollbarWidth: "none" }}>
                            {active?.users.map(u => (
                                <div key={u.id} className="flex items-center gap-2 px-3 py-2 rounded-lg mb-1"
                                    style={{ background: "var(--nx-surface)" }}>
                                    <img src={u.image ?? "/logos/forhumo.png"} alt=""
                                        className="w-8 h-8 rounded-full object-cover"
                                        style={{ border: "1px solid rgb(var(--nx-accent-rgb) / 0.25)" }} />
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm font-bold text-[var(--nx-text)] truncate">{u.name ?? u.username ?? "?"}</p>
                                        {u.username && <p className="text-[10px]" style={{ color: "var(--nx-text-3)" }}>@{u.username}</p>}
                                    </div>
                                    <span className="text-lg leading-none flex-shrink-0">{active.emoji}</span>
                                </div>
                            ))}
                        </div>
                    </>
                )}
            </div>
        </>
    );
}
