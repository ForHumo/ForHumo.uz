"use client";

// Bot inline mode popover (Telegram uslub): composer'da "@botname query" yozilganda
// ochiladi, bot javob natijalarini ko'rsatadi. Natija tanlansa xabar to'g'ridan-to'g'ri
// yuboriladi (composer matni tozalanadi).
//
// Foydalanish (composer yonida):
//   <NxInlinePopover text={input} convId={selectedId} onSent={() => setInput("")} />

import { useEffect, useState } from "react";
import { Bot, Loader2 } from "lucide-react";

interface InlineResult {
    id: string;
    title: string;
    description?: string;
    thumbnailUrl?: string;
    message: { text?: string; mediaUrl?: string; mediaType?: string; mediaMime?: string; mediaName?: string };
}

interface Props {
    text: string;
    convId: string | null;
    onSent: () => void;
}

const TRIGGER = /(?:^|\n)@([a-z0-9_]{2,20})\s([^\n]{0,200})$/i;

export function NxInlinePopover({ text, convId, onSent }: Props) {
    const [bot, setBot] = useState<string | null>(null);
    const [q, setQ] = useState<string>("");
    const [results, setResults] = useState<InlineResult[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [sending, setSending] = useState<string | null>(null);
    const [idx, setIdx] = useState(0);

    // Trigger aniqlash
    useEffect(() => {
        const m = text.match(TRIGGER);
        if (!m) { setBot(null); setQ(""); setResults([]); setError(null); return; }
        setBot(m[1]);
        setQ(m[2]);
        setIdx(0);
    }, [text]);

    // Debounced fetch
    useEffect(() => {
        if (!bot) return;
        setError(null);
        setLoading(true);
        const t = setTimeout(async () => {
            try {
                const params = new URLSearchParams({ bot, q });
                if (convId) params.set("convId", convId);
                const r = await fetch(`/api/nexus/agents/inline?${params.toString()}`);
                if (!r.ok) { setResults([]); setLoading(false); return; }
                const data = await r.json();
                setResults(Array.isArray(data.results) ? data.results : []);
            } catch {
                setResults([]);
            } finally {
                setLoading(false);
            }
        }, 300);
        return () => clearTimeout(t);
    }, [bot, q, convId]);

    async function pick(r: InlineResult) {
        if (!convId || sending) return;
        setSending(r.id);
        setError(null);
        try {
            const body: Record<string, unknown> = {};
            if (r.message.text) body.text = r.message.text;
            if (r.message.mediaUrl) {
                body.mediaUrl = r.message.mediaUrl;
                body.mediaType = r.message.mediaType || "file";
                if (r.message.mediaMime) body.mediaMime = r.message.mediaMime;
                if (r.message.mediaName) body.mediaName = r.message.mediaName;
            }
            const res = await fetch(`/api/nexus/messages/${convId}`, {
                method: "POST", headers: { "Content-Type": "application/json" },
                body: JSON.stringify(body),
            });
            if (!res.ok) {
                const d = await res.json().catch(() => ({}));
                setError(d?.error || "Yuborib bo'lmadi");
                setSending(null);
                return;
            }
            setSending(null);
            setBot(null); setResults([]);
            onSent();
        } catch {
            setError("Tarmoq xatosi");
            setSending(null);
        }
    }

    if (!bot) return null;

    return (
        <div className="absolute bottom-full left-0 right-0 mb-2 mx-3 rounded-2xl overflow-hidden z-30"
            style={{ background: "rgba(11,18,40,0.96)", border: "1px solid rgba(43,62,232,0.30)", backdropFilter: "blur(14px)", maxHeight: "50vh" }}>
            <div className="px-3 py-2 border-b border-white/[0.06] flex items-center gap-2 text-xs text-white/60">
                <Bot className="w-3.5 h-3.5" style={{ color: "#00CEC8" }} />
                <span><span className="font-bold text-white">@{bot}</span> {q ? `— ${q}` : ""}</span>
                {loading && <Loader2 className="w-3 h-3 animate-spin ml-auto" />}
            </div>
            <div className="overflow-y-auto" style={{ maxHeight: "42vh" }}>
                {error && <div className="px-3 py-4 text-xs text-red-400">{error}</div>}
                {!loading && !error && results.length === 0 && (
                    <div className="px-3 py-6 text-center text-xs text-white/50">
                        {q.length === 0 ? "Query yozing..." : "Natija topilmadi"}
                    </div>
                )}
                {results.map((r, i) => (
                    <button key={r.id}
                        onClick={() => pick(r)}
                        disabled={!convId || !!sending}
                        className="w-full flex items-start gap-3 px-3 py-2.5 text-left hover:bg-white/[0.06] transition disabled:opacity-50"
                        style={i === idx ? { background: "rgba(0,206,200,0.08)" } : undefined}>
                        {r.thumbnailUrl
                            ? <img src={r.thumbnailUrl} alt="" className="w-10 h-10 rounded-lg object-cover flex-shrink-0" />
                            : <div className="w-10 h-10 rounded-lg bg-white/[0.05] flex items-center justify-center flex-shrink-0"><Bot className="w-4 h-4 text-white/40" /></div>}
                        <div className="flex-1 min-w-0">
                            <div className="text-sm font-bold text-white truncate">{r.title}</div>
                            {r.description && <div className="text-xs text-white/60 truncate">{r.description}</div>}
                        </div>
                        {sending === r.id && <Loader2 className="w-4 h-4 animate-spin text-white/70 flex-shrink-0" />}
                    </button>
                ))}
            </div>
        </div>
    );
}
