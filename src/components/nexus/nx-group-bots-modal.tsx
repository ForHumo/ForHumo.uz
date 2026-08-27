"use client";

// Guruh botlari — qo'shish/olib tashlash + agents discover.

import { useEffect, useState } from "react";
import { X, Loader2, Bot, Plus, Trash2, Radio } from "lucide-react";

type ChBot = {
    id: string; agentId: string; autoListen: boolean;
    agent: { id: string; name: string; handle: string | null; avatarUrl: string | null; verified: boolean } | null;
};
type Agent = {
    id: string; name: string; handle: string | null; description: string | null;
    avatarUrl: string | null; verified: boolean;
};

export function NxGroupBotsModal({
    open, channelId, onClose,
}: {
    open: boolean;
    channelId: string;
    onClose: () => void;
}) {
    const [bots, setBots] = useState<ChBot[]>([]);
    const [canManage, setCanManage] = useState(false);
    const [loading, setLoading] = useState(false);
    const [addOpen, setAddOpen] = useState(false);
    const [q, setQ] = useState("");
    const [suggestions, setSuggestions] = useState<Agent[]>([]);

    const load = () => {
        setLoading(true);
        fetch(`/api/nexus/channels/${channelId}/bots`)
            .then(r => r.ok ? r.json() : { bots: [], canManage: false })
            .then(d => { setBots(d.bots ?? []); setCanManage(!!d.canManage); })
            .finally(() => setLoading(false));
    };

    useEffect(() => { if (open) load(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [open, channelId]);

    useEffect(() => {
        if (!addOpen) return;
        const t = setTimeout(() => {
            fetch(`/api/nexus/agents/discover?q=${encodeURIComponent(q)}`)
                .then(r => r.ok ? r.json() : { agents: [] })
                .then(d => setSuggestions(d.agents ?? []));
        }, 250);
        return () => clearTimeout(t);
    }, [q, addOpen]);

    const add = async (agentId: string, autoListen: boolean) => {
        await fetch(`/api/nexus/channels/${channelId}/bots`, {
            method: "POST", headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ agentId, autoListen }),
        });
        setAddOpen(false);
        load();
    };

    const remove = async (agentId: string) => {
        if (!confirm("Botni olib tashlaysizmi?")) return;
        await fetch(`/api/nexus/channels/${channelId}/bots?agentId=${agentId}`, { method: "DELETE" });
        load();
    };

    const toggleAutoListen = async (bot: ChBot) => {
        await fetch(`/api/nexus/channels/${channelId}/bots`, {
            method: "POST", headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ agentId: bot.agentId, autoListen: !bot.autoListen }),
        });
        load();
    };

    if (!open) return null;

    return (
        <>
            <div className="fixed inset-0 z-[320] bg-black/60 backdrop-blur-sm" onClick={onClose} />
            <div className="fixed inset-x-0 bottom-0 z-[321] flex max-h-[85vh] flex-col overflow-hidden rounded-t-3xl md:inset-y-0 md:right-0 md:inset-x-auto md:max-h-full md:w-[440px] md:rounded-none md:rounded-l-3xl"
                style={{ background: "rgba(8,12,32,0.99)", border: "1px solid rgba(43,62,232,0.3)" }}
                onClick={e => e.stopPropagation()}>
                <div className="flex items-center justify-between px-5 py-4 flex-shrink-0"
                    style={{ borderBottom: "1px solid rgba(43,62,232,0.14)" }}>
                    <h3 className="text-base font-black text-white flex items-center gap-2">
                        <Bot className="w-4 h-4" style={{ color: "#00CEC8" }} /> Botlar
                    </h3>
                    <button onClick={onClose} className="w-8 h-8 rounded-full flex items-center justify-center"
                        style={{ background: "rgba(43,62,232,0.12)" }}>
                        <X className="w-4 h-4 text-white" />
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto p-3" style={{ scrollbarWidth: "none" }}>
                    {loading ? (
                        <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin" style={{ color: "#2B3EE8" }} /></div>
                    ) : bots.length === 0 ? (
                        <p className="py-8 text-center text-xs" style={{ color: "rgba(120,140,185,0.6)" }}>Bot qo&apos;shilmagan</p>
                    ) : bots.map(b => (
                        <div key={b.id} className="flex items-center gap-3 rounded-2xl px-3 py-2.5 mb-1"
                            style={{ background: "rgba(11,18,40,0.55)", border: "1px solid rgba(43,62,232,0.14)" }}>
                            <img src={b.agent?.avatarUrl ?? "/logos/forhumo.png"} alt=""
                                className="w-10 h-10 rounded-full object-cover" />
                            <div className="flex-1 min-w-0">
                                <p className="text-sm font-bold text-white truncate">{b.agent?.name ?? "?"}</p>
                                {b.agent?.handle && <p className="text-[11px]" style={{ color: "rgba(140,160,210,0.7)" }}>@{b.agent.handle}</p>}
                            </div>
                            {canManage && (
                                <>
                                    <button onClick={() => toggleAutoListen(b)}
                                        title={b.autoListen ? "Har xabarni tinglaydi" : "Faqat /command"}
                                        className="w-8 h-8 rounded-full flex items-center justify-center"
                                        style={b.autoListen
                                            ? { background: "rgba(0,206,200,0.15)", border: "1px solid rgba(0,206,200,0.35)" }
                                            : { background: "rgba(140,160,210,0.10)" }}>
                                        <Radio className="w-3.5 h-3.5" style={{ color: b.autoListen ? "#00CEC8" : "rgba(140,160,210,0.7)" }} />
                                    </button>
                                    <button onClick={() => remove(b.agentId)}
                                        className="w-8 h-8 rounded-full flex items-center justify-center"
                                        style={{ background: "rgba(255,80,90,0.10)" }}>
                                        <Trash2 className="w-3.5 h-3.5" style={{ color: "#FF505A" }} />
                                    </button>
                                </>
                            )}
                        </div>
                    ))}
                </div>

                {canManage && (
                    <div className="flex-shrink-0 p-3" style={{ borderTop: "1px solid rgba(43,62,232,0.14)" }}>
                        {!addOpen ? (
                            <button onClick={() => setAddOpen(true)}
                                className="w-full py-2.5 rounded-xl text-sm font-bold flex items-center justify-center gap-2"
                                style={{ background: "linear-gradient(135deg,#2B3EE8,#00CEC8)", color: "white" }}>
                                <Plus className="w-4 h-4" /> Bot qo&apos;shish
                            </button>
                        ) : (
                            <div className="space-y-2">
                                <input value={q} onChange={e => setQ(e.target.value)}
                                    placeholder="Bot qidiring @handle yoki nomi..."
                                    className="w-full rounded-xl px-3 py-2 text-sm text-white outline-none"
                                    style={{ background: "rgba(5,8,24,0.60)", border: "1px solid rgba(43,62,232,0.22)" }} />
                                <div className="max-h-[180px] overflow-y-auto space-y-1" style={{ scrollbarWidth: "none" }}>
                                    {suggestions.map(a => (
                                        <button key={a.id} onClick={() => add(a.id, false)}
                                            className="w-full flex items-center gap-2 px-2 py-2 rounded-lg text-left hover:bg-white/5">
                                            <img src={a.avatarUrl ?? "/logos/forhumo.png"} alt=""
                                                className="w-8 h-8 rounded-full object-cover" />
                                            <div className="flex-1 min-w-0">
                                                <p className="text-xs font-bold text-white truncate">{a.name}</p>
                                                {a.handle && <p className="text-[10px]" style={{ color: "rgba(140,160,210,0.7)" }}>@{a.handle}</p>}
                                            </div>
                                        </button>
                                    ))}
                                </div>
                                <button onClick={() => setAddOpen(false)}
                                    className="w-full py-1.5 rounded-lg text-xs"
                                    style={{ color: "rgba(140,160,210,0.7)" }}>Yopish</button>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </>
    );
}
