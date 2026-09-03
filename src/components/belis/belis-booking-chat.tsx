"use client";

// Belis buyurtma chat — portal modal, 5s polling.
// Mijoz ↔ @sevinch bevosita yozishuvi.

import { useState, useEffect, useRef, useCallback } from "react";
import { createPortal } from "react-dom";
import { X, Send, Loader2, ImagePlus, MessageCircle } from "lucide-react";
import { BELIS, BELIS_GOLD_GRADIENT } from "@/lib/belis-theme";

interface Msg {
    id: string;
    senderId: string;
    isMine: boolean;
    text: string;
    imageUrl: string | null;
    readAt: string | null;
    createdAt: string;
}

const POLL_MS = 5000;

export function BelisChatButton({ code, otherName }: { code: string; otherName: string }) {
    const [open, setOpen] = useState(false);
    const [unread, setUnread] = useState(0);

    useEffect(() => {
        if (open) { setUnread(0); return; }
        let stopped = false;
        async function tick() {
            try {
                const r = await fetch(`/api/belis/bookings/${code}/messages`, { cache: "no-store" });
                const d = await r.json();
                if (stopped) return;
                if (Array.isArray(d?.messages)) {
                    setUnread(d.messages.filter((m: Msg) => !m.isMine && !m.readAt).length);
                }
            } catch { /* noop */ }
        }
        tick();
        const id = setInterval(tick, 30_000);
        return () => { stopped = true; clearInterval(id); };
    }, [code, open]);

    return (
        <>
            <button onClick={() => setOpen(true)}
                className="relative inline-flex items-center gap-1.5 h-10 px-4 rounded-xl text-[13px] font-black"
                style={{ background: BELIS.goldSoft, color: BELIS.onGold }}>
                <MessageCircle className="w-4 h-4" />
                Chat
                {unread > 0 && (
                    <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] rounded-full grid place-items-center text-[10px] font-black px-1"
                        style={{ background: BELIS.err, color: "#fff" }}>
                        {unread}
                    </span>
                )}
            </button>
            {open && <BelisChat code={code} otherName={otherName} onClose={() => setOpen(false)} />}
        </>
    );
}

function BelisChat({ code, otherName, onClose }: {
    code: string; otherName: string; onClose: () => void;
}) {
    const [msgs, setMsgs] = useState<Msg[]>([]);
    const [text, setText] = useState("");
    const [sending, setSending] = useState(false);
    const [loading, setLoading] = useState(true);
    const [uploading, setUploading] = useState(false);
    const [mounted, setMounted] = useState(false);
    const scrollRef = useRef<HTMLDivElement>(null);
    const fileRef = useRef<HTMLInputElement>(null);

    useEffect(() => { setMounted(true); }, []);

    const load = useCallback(async (opts?: { silent?: boolean }) => {
        if (!opts?.silent) setLoading(true);
        try {
            const r = await fetch(`/api/belis/bookings/${code}/messages`, { cache: "no-store" });
            const d = await r.json();
            if (Array.isArray(d?.messages)) setMsgs(d.messages);
        } catch { /* noop */ } finally {
            if (!opts?.silent) setLoading(false);
        }
    }, [code]);

    useEffect(() => {
        load();
        const id = setInterval(() => load({ silent: true }), POLL_MS);
        return () => clearInterval(id);
    }, [load]);

    useEffect(() => {
        if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }, [msgs.length]);

    async function send(imageUrl?: string) {
        const t = text.trim();
        if (!t && !imageUrl) return;
        setSending(true);
        try {
            const r = await fetch(`/api/belis/bookings/${code}/messages`, {
                method: "POST",
                headers: { "content-type": "application/json" },
                body: JSON.stringify({ text: t, imageUrl }),
            });
            const d = await r.json();
            if (r.ok && d?.message) {
                setMsgs(prev => [...prev, d.message]);
                setText("");
            }
        } finally { setSending(false); }
    }

    async function uploadAndSend(file: File) {
        setUploading(true);
        try {
            const fd = new FormData();
            fd.append("file", file);
            fd.append("kind", "chat");
            const r = await fetch("/api/belis/upload/image", { method: "POST", body: fd });
            const d = await r.json();
            if (r.ok && d?.url) await send(d.url);
        } finally { setUploading(false); }
    }

    if (!mounted) return null;

    return createPortal(
        <div className="fixed inset-0 z-[9999] flex items-end sm:items-center justify-center p-0 sm:p-4"
            style={{ background: "rgba(58,53,32,0.65)" }} onClick={onClose}>
            <div className="w-full sm:max-w-md h-[100dvh] sm:h-[80vh] sm:max-h-[720px] flex flex-col sm:rounded-3xl overflow-hidden"
                style={{ background: BELIS.surface, border: `1px solid ${BELIS.border}` }}
                onClick={e => e.stopPropagation()}>
                <div className="flex items-center gap-3 p-3 flex-shrink-0" style={{ borderBottom: `1px solid ${BELIS.border}` }}>
                    <span className="w-9 h-9 rounded-xl grid place-items-center flex-shrink-0"
                        style={{ background: BELIS_GOLD_GRADIENT, color: BELIS.onGold }}>
                        <MessageCircle className="w-4 h-4" />
                    </span>
                    <div className="flex-1 min-w-0">
                        <p className="text-[13.5px] font-black line-clamp-1" style={{ color: BELIS.text }}>{otherName}</p>
                        <p className="text-[11px]" style={{ color: BELIS.text3 }}>#{code}</p>
                    </div>
                    <button onClick={onClose} className="p-1" style={{ color: BELIS.text3 }}>
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <div ref={scrollRef}
                    className="flex-1 overflow-y-auto p-3 space-y-2"
                    style={{ background: BELIS.bg }}>
                    {loading && msgs.length === 0 && (
                        <div className="flex items-center justify-center py-8">
                            <Loader2 className="w-5 h-5 animate-spin" style={{ color: BELIS.gold }} />
                        </div>
                    )}
                    {!loading && msgs.length === 0 && (
                        <div className="text-center py-10 text-[13px]" style={{ color: BELIS.text3 }}>
                            Buyurtma bo&apos;yicha shu yerda yozishing mumkin
                        </div>
                    )}
                    {msgs.map(m => (
                        <div key={m.id} className={`flex ${m.isMine ? "justify-end" : "justify-start"}`}>
                            <div className="max-w-[80%] px-3 py-2 rounded-2xl"
                                style={{
                                    background: m.isMine ? BELIS_GOLD_GRADIENT : BELIS.surface,
                                    color: m.isMine ? BELIS.onGold : BELIS.text,
                                    border: m.isMine ? "none" : `1px solid ${BELIS.border}`,
                                }}>
                                {m.imageUrl && (
                                    // eslint-disable-next-line @next/next/no-img-element
                                    <img src={m.imageUrl} alt="" className="w-full max-w-[280px] rounded-lg mb-1 object-cover" style={{ display: "block" }} />
                                )}
                                {m.text && <p className="text-[13.5px] whitespace-pre-wrap break-words leading-snug">{m.text}</p>}
                                <p className="text-[10px] mt-1 tabular-nums text-right"
                                    style={{ color: m.isMine ? "rgba(58,53,32,0.55)" : BELIS.text3 }}>
                                    {new Date(m.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                                    {m.isMine && (m.readAt ? " ✓✓" : " ✓")}
                                </p>
                            </div>
                        </div>
                    ))}
                </div>

                <div className="flex items-end gap-2 p-3 flex-shrink-0" style={{ borderTop: `1px solid ${BELIS.border}` }}>
                    <input ref={fileRef} type="file" accept="image/*" className="hidden"
                        onChange={e => { const f = e.target.files?.[0]; if (f) uploadAndSend(f); e.target.value = ""; }} />
                    <button onClick={() => fileRef.current?.click()} disabled={uploading || sending}
                        className="w-11 h-11 rounded-xl grid place-items-center flex-shrink-0 disabled:opacity-60"
                        style={{ background: BELIS.bg, color: BELIS.text2 }}>
                        {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <ImagePlus className="w-4 h-4" />}
                    </button>
                    <textarea value={text} onChange={e => setText(e.target.value.slice(0, 2000))}
                        onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } }}
                        placeholder="Xabar yozing…" rows={1}
                        className="flex-1 min-h-[44px] max-h-24 p-3 rounded-xl text-[13.5px] resize-none focus:outline-none"
                        style={{ background: BELIS.bg, color: BELIS.text, border: `1px solid ${BELIS.border}` }} />
                    <button onClick={() => send()} disabled={sending || !text.trim()}
                        className="w-11 h-11 rounded-xl grid place-items-center flex-shrink-0 disabled:opacity-60"
                        style={{ background: BELIS_GOLD_GRADIENT, color: BELIS.onGold }}>
                        {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                    </button>
                </div>
            </div>
        </div>,
        document.body,
    );
}
