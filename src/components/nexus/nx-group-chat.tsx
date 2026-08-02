"use client";

// Guruh chaqiruv chati (LiveKit DataChannel). LiveKitRoom ichida ishlaydi.
// useChat hook barcha ishtirokchilar bilan real-time xabar almashadi.

import { useState, useRef, useEffect } from "react";
import { useChat, useLocalParticipant } from "@livekit/components-react";
import { X, Send, MessageSquare } from "lucide-react";

export function NxGroupChat({ open, onClose }: { open: boolean; onClose: () => void }) {
    const { chatMessages, send, isSending } = useChat();
    const { localParticipant } = useLocalParticipant();
    const [text, setText] = useState("");
    const listRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (listRef.current) listRef.current.scrollTop = listRef.current.scrollHeight;
    }, [chatMessages, open]);

    if (!open) return null;

    const submit = async (e: React.FormEvent) => {
        e.preventDefault();
        const t = text.trim();
        if (!t || isSending) return;
        setText("");
        try { await send(t); } catch { }
    };

    return (
        <>
            <div className="fixed inset-0 z-[310] bg-black/60 backdrop-blur-sm md:hidden"
                onClick={onClose} />
            <div className="fixed inset-x-0 bottom-0 z-[311] flex max-h-[70vh] flex-col overflow-hidden rounded-t-3xl bg-[#080C20] shadow-2xl md:inset-y-0 md:inset-x-auto md:right-0 md:max-h-full md:w-[380px] md:rounded-none md:rounded-l-3xl"
                style={{ border: "1px solid rgba(43,62,232,0.22)" }}
                onClick={e => e.stopPropagation()}>
                <div className="flex flex-shrink-0 items-center justify-between px-5 pt-5 pb-3">
                    <h3 className="flex items-center gap-2 text-base font-black text-white">
                        <MessageSquare className="h-4 w-4" style={{ color: "#00CEC8" }} /> Chat
                    </h3>
                    <button onClick={onClose}
                        className="flex h-8 w-8 items-center justify-center rounded-full"
                        style={{ background: "rgba(43,62,232,0.12)", border: "1px solid rgba(43,62,232,0.22)" }}>
                        <X className="h-4 w-4 text-white" />
                    </button>
                </div>

                <div ref={listRef} className="flex-1 space-y-2 overflow-y-auto px-4 py-2" style={{ scrollbarWidth: "none" }}>
                    {chatMessages.length === 0 && (
                        <p className="py-10 text-center text-xs" style={{ color: "rgba(120,140,185,0.6)" }}>Suhbat boshlang</p>
                    )}
                    {chatMessages.map((m, i) => {
                        const mine = m.from?.identity === localParticipant?.identity;
                        const label = m.from?.name || m.from?.identity || "?";
                        return (
                            <div key={i} className={`flex ${mine ? "justify-end" : "justify-start"}`}>
                                <div className="flex max-w-[80%] flex-col gap-0.5">
                                    {!mine && (
                                        <p className="pl-2 text-[10px] font-bold" style={{ color: "rgba(0,206,200,0.85)" }}>{label}</p>
                                    )}
                                    <div className={`rounded-2xl px-3 py-2 text-sm ${mine ? "text-white" : "text-white"}`}
                                        style={mine
                                            ? { background: "linear-gradient(135deg,#2B3EE8,#00CEC8)" }
                                            : { background: "rgba(43,62,232,0.15)" }}>
                                        {m.message}
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>

                <form onSubmit={submit}
                    className="flex flex-shrink-0 items-center gap-2 px-4 py-3"
                    style={{ borderTop: "1px solid rgba(43,62,232,0.15)" }}>
                    <input value={text} onChange={e => setText(e.target.value)}
                        placeholder="Xabar yozing..."
                        className="flex-1 rounded-xl px-3 py-2 text-sm text-white outline-none"
                        style={{ background: "rgba(5,8,24,0.60)", border: "1px solid rgba(43,62,232,0.22)", caretColor: "#00CEC8" }} />
                    <button type="submit" disabled={isSending || !text.trim()}
                        className="flex h-9 w-9 items-center justify-center rounded-xl text-white shadow-lg disabled:opacity-40"
                        style={{ background: "linear-gradient(135deg,#2B3EE8,#00CEC8)" }}>
                        <Send className="h-4 w-4" />
                    </button>
                </form>
            </div>
        </>
    );
}
