"use client";

// Do'kon sahifasida "Yozishish" tugmasi + chat modal.
// Xaridor tugmani bosadi → chat oynasi ochiladi → sotuvchi bilan yozishuv.

import { useCallback, useEffect, useRef, useState } from "react";
import { MessageCircle, X, Send, Loader2 } from "lucide-react";

interface Msg {
    id: string;
    fromShop: boolean;
    text: string;
    imageUrl: string | null;
    createdAt: string;
    readAt: string | null;
}

export function BnShopChatButton({ shopSlug, shopName }: { shopSlug: string; shopName: string }) {
    const [open, setOpen] = useState(false);

    // ?chat=1 bilan avto ochish (push bosilganda)
    useEffect(() => {
        if (typeof window === "undefined") return;
        const params = new URL(window.location.href).searchParams;
        if (params.get("chat") === "1") {
            setOpen(true);
            const cleaned = new URL(window.location.href);
            cleaned.searchParams.delete("chat");
            window.history.replaceState({}, "", cleaned.toString());
        }
    }, []);

    return (
        <>
            <button
                onClick={() => setOpen(true)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-sky-500 text-white text-xs font-medium hover:bg-sky-600"
            >
                <MessageCircle className="w-3.5 h-3.5" />
                Yozishish
            </button>

            {open && <BnShopChatModal shopSlug={shopSlug} shopName={shopName} onClose={() => setOpen(false)} />}
        </>
    );
}

function BnShopChatModal({
    shopSlug, shopName, onClose,
}: { shopSlug: string; shopName: string; onClose: () => void }) {
    const [messages, setMessages] = useState<Msg[]>([]);
    const [loading, setLoading] = useState(true);
    const [sending, setSending] = useState(false);
    const [text, setText] = useState("");
    const scrollRef = useRef<HTMLDivElement>(null);

    const load = useCallback(async () => {
        try {
            const r = await fetch(`/api/bn/shops/${shopSlug}/chat`, { cache: "no-store" });
            if (r.status === 401) {
                window.location.href = `/api/auth/signin?callbackUrl=${encodeURIComponent(window.location.href)}`;
                return;
            }
            if (r.ok) {
                const j = await r.json();
                setMessages(j.messages ?? []);
            }
        } finally { setLoading(false); }
    }, [shopSlug]);

    useEffect(() => { void load(); }, [load]);

    // Polling 4s
    useEffect(() => {
        const id = window.setInterval(load, 4000);
        return () => window.clearInterval(id);
    }, [load]);

    // Auto-scroll pastga
    useEffect(() => {
        if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }, [messages]);

    const send = useCallback(async () => {
        const t = text.trim();
        if (!t) return;
        setSending(true);
        try {
            const r = await fetch(`/api/bn/shops/${shopSlug}/chat`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ text: t }),
            });
            if (r.ok) {
                setText("");
                void load();
            }
        } finally { setSending(false); }
    }, [text, shopSlug, load]);

    return (
        <div className="fixed inset-0 z-[200] bg-black/60 flex items-end sm:items-center justify-center p-0 sm:p-4">
            <div className="w-full sm:max-w-md bg-white dark:bg-neutral-900 rounded-t-2xl sm:rounded-2xl shadow-xl max-h-[85vh] flex flex-col">
                {/* Header */}
                <div className="flex items-center justify-between px-4 py-3 border-b border-neutral-200 dark:border-neutral-800">
                    <div className="flex items-center gap-2 min-w-0">
                        <MessageCircle className="w-5 h-5 text-sky-500 shrink-0" />
                        <div className="min-w-0">
                            <div className="text-sm font-semibold truncate">{shopName}</div>
                            <div className="text-[11px] text-neutral-500">Do&apos;kon bilan chat</div>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-1.5 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded">
                        <X className="w-4 h-4" />
                    </button>
                </div>

                {/* Messages */}
                <div ref={scrollRef} className="flex-1 overflow-y-auto p-3 space-y-2 min-h-[300px]">
                    {loading ? (
                        <div className="flex justify-center py-6">
                            <Loader2 className="w-5 h-5 animate-spin text-neutral-400" />
                        </div>
                    ) : messages.length === 0 ? (
                        <div className="text-center py-8 text-xs text-neutral-500">
                            Hozircha xabar yo&apos;q.<br />
                            Do&apos;konga savolingizni yozing — sotuvchi javob beradi.
                        </div>
                    ) : (
                        messages.map(m => (
                            <div
                                key={m.id}
                                className={`flex ${m.fromShop ? "justify-start" : "justify-end"}`}
                            >
                                <div
                                    className={`max-w-[80%] px-3 py-2 rounded-2xl text-sm ${
                                        m.fromShop
                                            ? "bg-neutral-100 dark:bg-neutral-800 rounded-bl-md"
                                            : "bg-sky-500 text-white rounded-br-md"
                                    }`}
                                >
                                    {m.imageUrl && (
                                        // eslint-disable-next-line @next/next/no-img-element
                                        <img src={m.imageUrl} alt="" className="max-w-full rounded-lg mb-1" />
                                    )}
                                    {m.text && <div className="whitespace-pre-wrap break-words">{m.text}</div>}
                                    <div className={`text-[10px] mt-1 ${m.fromShop ? "text-neutral-500" : "text-white/70"}`}>
                                        {new Date(m.createdAt).toLocaleTimeString("uz-UZ", { hour: "2-digit", minute: "2-digit" })}
                                    </div>
                                </div>
                            </div>
                        ))
                    )}
                </div>

                {/* Composer */}
                <div className="p-3 border-t border-neutral-200 dark:border-neutral-800 flex gap-2">
                    <input
                        type="text"
                        value={text}
                        onChange={e => setText(e.target.value)}
                        onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); void send(); } }}
                        placeholder="Xabar yozing..."
                        className="flex-1 px-3 py-2 rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-950 text-sm"
                        maxLength={2000}
                    />
                    <button
                        onClick={send}
                        disabled={sending || !text.trim()}
                        className="px-3 rounded-lg bg-sky-500 text-white disabled:opacity-50 hover:bg-sky-600"
                    >
                        {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                    </button>
                </div>
            </div>
        </div>
    );
}
