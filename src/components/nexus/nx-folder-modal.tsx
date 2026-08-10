"use client";

// Nexus custom papka yaratish modali (Telegram uslubi).
// Nom + emoji + rang + turlar (private/channel/group/bot).

import { useState } from "react";
import { X, Loader2, Folder } from "lucide-react";

interface Folder {
    id: string;
    name: string;
    emoji: string | null;
    color: string | null;
    includeTypes: string[];
    includeUnread: boolean;
    includeChatIds: string[];
    excludeChatIds: string[];
    sort: number;
}

const EMOJI_OPTIONS = ["📁", "💼", "👥", "📢", "🤖", "❤️", "⭐", "🔥", "🎯", "📚"];
const COLOR_OPTIONS: Array<{ id: string; hex: string }> = [
    { id: "red",    hex: "#EF4444" },
    { id: "orange", hex: "#F97316" },
    { id: "violet", hex: "#8B5CF6" },
    { id: "green",  hex: "#10B981" },
    { id: "blue",   hex: "#3B82F6" },
    { id: "cyan",   hex: "#06B6D4" },
    { id: "pink",   hex: "#EC4899" },
];

const TYPE_OPTIONS: Array<{ id: string; label: string }> = [
    { id: "private", label: "Shaxsiy (DM)" },
    { id: "channel", label: "Kanallar" },
    { id: "group",   label: "Guruhlar" },
    { id: "bot",     label: "Agentlar" },
];

export function NxFolderModal({
    open, onClose, onSaved,
}: {
    open: boolean;
    onClose: () => void;
    onSaved: (f: Folder) => void;
}) {
    const [name, setName] = useState("");
    const [emoji, setEmoji] = useState<string>("");
    const [color, setColor] = useState<string>("");
    const [types, setTypes] = useState<Set<string>>(new Set());
    const [includeUnread, setIncludeUnread] = useState(false);
    const [busy, setBusy] = useState(false);
    const [err, setErr] = useState<string | null>(null);

    if (!open) return null;

    async function save() {
        setBusy(true); setErr(null);
        try {
            const r = await fetch("/api/nexus/folders", {
                method: "POST", headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    name: name.trim(),
                    emoji: emoji || null,
                    color: color || null,
                    includeTypes: [...types],
                    includeUnread,
                }),
            });
            const d = await r.json();
            if (!r.ok) { setErr(d.error || "Saqlab bo'lmadi"); return; }
            onSaved(d.folder);
            setName(""); setEmoji(""); setColor(""); setTypes(new Set()); setIncludeUnread(false);
            onClose();
        } finally { setBusy(false); }
    }

    return (
        <>
            <div className="fixed inset-0 z-[70]" style={{ background: "rgba(5,8,24,0.65)" }}
                onClick={() => !busy && onClose()} />
            <div className="fixed z-[70] left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[92%] max-w-md rounded-2xl overflow-hidden max-h-[90vh] flex flex-col"
                style={{ background: "rgba(8,12,32,0.98)", border: "1px solid rgba(43,62,232,0.25)", boxShadow: "0 24px 64px rgba(0,0,0,0.70)" }}>
                <div className="px-5 py-4 flex items-center gap-3 flex-shrink-0"
                    style={{ borderBottom: "1px solid rgba(43,62,232,0.14)" }}>
                    <div className="w-9 h-9 rounded-xl flex items-center justify-center"
                        style={{ background: "linear-gradient(135deg,#2B3EE8,#00CEC8)" }}>
                        <Folder className="w-4 h-4 text-white" />
                    </div>
                    <div className="flex-1">
                        <h3 className="text-sm font-black text-white">Yangi papka</h3>
                        <p className="text-[11px]" style={{ color: "rgba(140,160,210,0.65)" }}>
                            Chatlaringizni papkalarga bo&apos;ling
                        </p>
                    </div>
                    <button onClick={() => !busy && onClose()} disabled={busy}
                        className="w-7 h-7 rounded-full flex items-center justify-center disabled:opacity-40"
                        style={{ background: "rgba(43,62,232,0.12)" }}>
                        <X className="w-3.5 h-3.5 text-white/60" />
                    </button>
                </div>

                <div className="p-5 space-y-4 overflow-y-auto">
                    {/* Nom */}
                    <div>
                        <label className="text-[10px] font-bold uppercase tracking-wider text-white/50">Nom</label>
                        <input value={name} onChange={e => setName(e.target.value)}
                            placeholder="Ish, IT, Do'stlar..."
                            maxLength={30} autoFocus
                            className="w-full mt-1.5 px-3 py-2.5 rounded-xl bg-transparent text-white text-sm focus:outline-none"
                            style={{ border: "1px solid rgba(43,62,232,0.30)" }} />
                    </div>

                    {/* Emoji */}
                    <div>
                        <label className="text-[10px] font-bold uppercase tracking-wider text-white/50">Emoji</label>
                        <div className="mt-2 flex flex-wrap gap-1.5">
                            {EMOJI_OPTIONS.map(e => (
                                <button key={e} onClick={() => setEmoji(emoji === e ? "" : e)}
                                    className="w-9 h-9 rounded-lg text-lg transition-all active:scale-90"
                                    style={emoji === e
                                        ? { background: "rgba(0,206,200,0.20)", border: "1px solid rgba(0,206,200,0.55)" }
                                        : { background: "rgba(43,62,232,0.08)", border: "1px solid rgba(43,62,232,0.18)" }}>
                                    {e}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Rang */}
                    <div>
                        <label className="text-[10px] font-bold uppercase tracking-wider text-white/50">Rang</label>
                        <div className="mt-2 flex flex-wrap gap-2">
                            {COLOR_OPTIONS.map(c => (
                                <button key={c.id} onClick={() => setColor(color === c.id ? "" : c.id)}
                                    className="w-7 h-7 rounded-full transition-all active:scale-90"
                                    style={{
                                        background: c.hex,
                                        boxShadow: color === c.id ? `0 0 0 2px rgba(255,255,255,0.30), 0 0 0 4px ${c.hex}` : "none",
                                    }} title={c.id} />
                            ))}
                        </div>
                    </div>

                    {/* Turlar */}
                    <div>
                        <label className="text-[10px] font-bold uppercase tracking-wider text-white/50">Chat turlari</label>
                        <div className="mt-2 space-y-1.5">
                            {TYPE_OPTIONS.map(t => (
                                <label key={t.id} className="flex items-center gap-3 px-3 py-2 rounded-xl cursor-pointer"
                                    style={{ background: "rgba(43,62,232,0.06)" }}>
                                    <input type="checkbox" checked={types.has(t.id)}
                                        onChange={() => {
                                            const n = new Set(types);
                                            if (n.has(t.id)) n.delete(t.id); else n.add(t.id);
                                            setTypes(n);
                                        }}
                                        className="w-4 h-4 rounded"
                                        style={{ accentColor: "#00CEC8" }} />
                                    <span className="text-sm text-white">{t.label}</span>
                                </label>
                            ))}
                            <label className="flex items-center gap-3 px-3 py-2 rounded-xl cursor-pointer"
                                style={{ background: "rgba(43,62,232,0.06)" }}>
                                <input type="checkbox" checked={includeUnread}
                                    onChange={e => setIncludeUnread(e.target.checked)}
                                    className="w-4 h-4 rounded" style={{ accentColor: "#00CEC8" }} />
                                <span className="text-sm text-white">Faqat o&apos;qilmaganlar</span>
                            </label>
                        </div>
                    </div>

                    {err && <p className="text-xs" style={{ color: "#EF4444" }}>{err}</p>}
                </div>

                <div className="p-3 flex gap-2 flex-shrink-0" style={{ borderTop: "1px solid rgba(43,62,232,0.14)" }}>
                    <button onClick={() => !busy && onClose()} disabled={busy}
                        className="flex-1 py-2.5 rounded-xl text-xs font-bold text-white/70"
                        style={{ background: "rgba(43,62,232,0.10)" }}>Bekor</button>
                    <button onClick={save} disabled={busy || !name.trim()}
                        className="flex-1 py-2.5 rounded-xl text-xs font-black text-white disabled:opacity-40 flex items-center justify-center gap-2"
                        style={{ background: "linear-gradient(135deg,#2B3EE8,#00CEC8)" }}>
                        {busy && <Loader2 size={14} className="animate-spin" />}
                        Yaratish
                    </button>
                </div>
            </div>
        </>
    );
}
