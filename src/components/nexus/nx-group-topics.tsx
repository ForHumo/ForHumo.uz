"use client";

// Topics/Forums — mavzular ro'yxati va tanlash.
// Bosilsa `onSelect(topicId)` chaqiriladi (null = umumiy).

import { useEffect, useState } from "react";
import { X, Loader2, Hash, Plus, MessageSquare, Trash2 } from "lucide-react";

type Topic = {
    id: string; name: string; icon: string | null; closed: boolean;
    createdAt: string; messageCount: number; lastMessageAt: string | null;
};

const ICONS = ["📌","💡","❓","📢","🎯","🔥","💬","🎉","📅","💰","🎓","🍕","⚽","🎵","🚀","💻"];

export function NxGroupTopicsModal({
    open, channelId, canManage, currentTopicId, onSelect, onClose,
}: {
    open: boolean;
    channelId: string;
    canManage: boolean;
    currentTopicId: string | null;
    onSelect: (topicId: string | null) => void;
    onClose: () => void;
}) {
    const [topics, setTopics] = useState<Topic[]>([]);
    const [loading, setLoading] = useState(false);
    const [createOpen, setCreateOpen] = useState(false);
    const [newName, setNewName] = useState("");
    const [newIcon, setNewIcon] = useState(ICONS[0]);
    const [busy, setBusy] = useState(false);

    const load = () => {
        setLoading(true);
        fetch(`/api/nexus/channels/${channelId}/topics`)
            .then(r => r.ok ? r.json() : { topics: [] })
            .then(d => setTopics(d.topics ?? []))
            .finally(() => setLoading(false));
    };

    useEffect(() => { if (open) load(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [open, channelId]);

    const create = async () => {
        if (!newName.trim()) return;
        setBusy(true);
        try {
            const r = await fetch(`/api/nexus/channels/${channelId}/topics`, {
                method: "POST", headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ name: newName.trim(), icon: newIcon }),
            });
            if (r.ok) {
                setNewName("");
                setCreateOpen(false);
                load();
            }
        } finally { setBusy(false); }
    };

    const del = async (topicId: string) => {
        if (!confirm("Mavzu o'chirilsinmi? Xabarlar umumiyga qaytadi.")) return;
        await fetch(`/api/nexus/channels/${channelId}/topics/${topicId}`, { method: "DELETE" });
        load();
    };

    if (!open) return null;

    return (
        <>
            <div className="fixed inset-0 z-[320] bg-black/60 backdrop-blur-sm" onClick={onClose} />
            <div className="fixed inset-x-0 bottom-0 z-[321] flex max-h-[85vh] flex-col overflow-hidden rounded-t-3xl md:inset-y-0 md:right-0 md:inset-x-auto md:max-h-full md:w-[420px] md:rounded-none md:rounded-l-3xl"
                style={{ background: "rgba(8,12,32,0.99)", border: "1px solid rgba(43,62,232,0.3)" }}
                onClick={e => e.stopPropagation()}>
                <div className="flex items-center justify-between px-5 py-4 flex-shrink-0"
                    style={{ borderBottom: "1px solid rgba(43,62,232,0.14)" }}>
                    <h3 className="text-base font-black text-white flex items-center gap-2">
                        <Hash className="w-4 h-4" style={{ color: "#00CEC8" }} /> Mavzular
                    </h3>
                    <button onClick={onClose} className="w-8 h-8 rounded-full flex items-center justify-center"
                        style={{ background: "rgba(43,62,232,0.12)" }}>
                        <X className="w-4 h-4 text-white" />
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto p-3" style={{ scrollbarWidth: "none" }}>
                    {/* Umumiy chat */}
                    <button onClick={() => { onSelect(null); onClose(); }}
                        className="w-full flex items-center gap-3 rounded-2xl px-3 py-3 mb-1 text-left"
                        style={{
                            background: currentTopicId === null ? "rgba(0,206,200,0.10)" : "rgba(11,18,40,0.55)",
                            border: `1px solid ${currentTopicId === null ? "rgba(0,206,200,0.30)" : "rgba(43,62,232,0.14)"}`,
                        }}>
                        <MessageSquare className="w-4 h-4 flex-shrink-0" style={{ color: "rgba(160,176,224,0.85)" }} />
                        <p className="flex-1 text-sm font-bold text-white">Umumiy</p>
                    </button>

                    {loading && (
                        <div className="flex justify-center py-6"><Loader2 className="w-5 h-5 animate-spin" style={{ color: "#2B3EE8" }} /></div>
                    )}

                    {topics.map(t => (
                        <div key={t.id} className="flex items-center gap-2 rounded-2xl px-3 py-2.5 mb-1"
                            style={{
                                background: currentTopicId === t.id ? "rgba(0,206,200,0.10)" : "rgba(11,18,40,0.55)",
                                border: `1px solid ${currentTopicId === t.id ? "rgba(0,206,200,0.30)" : "rgba(43,62,232,0.14)"}`,
                            }}>
                            <button onClick={() => { onSelect(t.id); onClose(); }}
                                className="flex-1 flex items-center gap-2 text-left">
                                <span className="text-xl flex-shrink-0">{t.icon ?? "#"}</span>
                                <div className="flex-1 min-w-0">
                                    <p className="text-sm font-bold text-white truncate">{t.name}</p>
                                    <p className="text-[11px]" style={{ color: "rgba(140,160,210,0.7)" }}>
                                        {t.messageCount} xabar
                                    </p>
                                </div>
                            </button>
                            {canManage && (
                                <button onClick={() => del(t.id)}
                                    className="w-7 h-7 rounded-md flex items-center justify-center"
                                    style={{ background: "rgba(255,80,90,0.10)" }}>
                                    <Trash2 className="w-3.5 h-3.5" style={{ color: "#FF505A" }} />
                                </button>
                            )}
                        </div>
                    ))}
                </div>

                {canManage && (
                    <div className="flex-shrink-0 p-3" style={{ borderTop: "1px solid rgba(43,62,232,0.14)" }}>
                        {!createOpen ? (
                            <button onClick={() => setCreateOpen(true)}
                                className="w-full py-2.5 rounded-xl text-sm font-bold flex items-center justify-center gap-2"
                                style={{ background: "linear-gradient(135deg,#2B3EE8,#00CEC8)", color: "white" }}>
                                <Plus className="w-4 h-4" /> Yangi mavzu
                            </button>
                        ) : (
                            <div className="space-y-2">
                                <input value={newName} onChange={e => setNewName(e.target.value)}
                                    placeholder="Mavzu nomi..." maxLength={80}
                                    className="w-full rounded-xl px-3 py-2 text-sm text-white outline-none"
                                    style={{ background: "rgba(5,8,24,0.60)", border: "1px solid rgba(43,62,232,0.22)" }} />
                                <div className="flex gap-1 overflow-x-auto py-1" style={{ scrollbarWidth: "none" }}>
                                    {ICONS.map(i => (
                                        <button key={i} onClick={() => setNewIcon(i)}
                                            className="flex-shrink-0 w-9 h-9 rounded-lg flex items-center justify-center text-xl"
                                            style={newIcon === i
                                                ? { background: "rgba(0,206,200,0.15)", border: "1px solid rgba(0,206,200,0.35)" }
                                                : { background: "rgba(11,18,40,0.55)", border: "1px solid rgba(43,62,232,0.14)" }}>
                                            {i}
                                        </button>
                                    ))}
                                </div>
                                <div className="flex gap-2">
                                    <button onClick={() => setCreateOpen(false)}
                                        className="flex-1 py-2 rounded-xl text-xs font-bold"
                                        style={{ background: "rgba(43,62,232,0.12)", color: "white" }}>Bekor</button>
                                    <button onClick={create} disabled={busy || !newName.trim()}
                                        className="flex-1 py-2 rounded-xl text-xs font-bold text-white disabled:opacity-50"
                                        style={{ background: "linear-gradient(135deg,#2B3EE8,#00CEC8)" }}>
                                        {busy ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> : "Yaratish"}
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </>
    );
}
