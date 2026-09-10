"use client";

// Do'kon sahifasida "Yozishish" tugmasi + chat modal.
// Xaridor tugmani bosadi → chat oynasi ochiladi → sotuvchi bilan yozishuv.

import { useCallback, useEffect, useRef, useState } from "react";
import { MessageCircle, X, Send, Loader2 } from "lucide-react";
import { BN } from "@/lib/bn-theme";

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
    const [initialText, setInitialText] = useState<string>("");

    // ?chat=1 bilan avto ochish (push bosilganda) + ?msg= bilan matn oldindan to'ldiriladi
    useEffect(() => {
        if (typeof window === "undefined") return;
        const params = new URL(window.location.href).searchParams;
        if (params.get("chat") === "1") {
            setOpen(true);
            const preset = params.get("msg");
            if (preset) setInitialText(preset);
            const cleaned = new URL(window.location.href);
            cleaned.searchParams.delete("chat");
            cleaned.searchParams.delete("msg");
            window.history.replaceState({}, "", cleaned.toString());
        }
    }, []);

    return (
        <>
            <button
                onClick={() => setOpen(true)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-transform active:scale-[0.98]"
                style={{ background: BN.gold, color: BN.onGold }}
            >
                <MessageCircle className="w-3.5 h-3.5" />
                Yozishish
            </button>

            {open && <BnShopChatModal shopSlug={shopSlug} shopName={shopName} initialText={initialText} onClose={() => { setOpen(false); setInitialText(""); }} />}
        </>
    );
}

function BnShopChatModal({
    shopSlug, shopName, initialText, onClose,
}: { shopSlug: string; shopName: string; initialText?: string; onClose: () => void }) {
    const [messages, setMessages] = useState<Msg[]>([]);
    const [loading, setLoading] = useState(true);
    const [sending, setSending] = useState(false);
    const [text, setText] = useState(initialText ?? "");
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
        <div className="fixed inset-0 z-[200] bg-black/70 flex items-end sm:items-center justify-center p-0 sm:p-4">
            <div className="w-full sm:max-w-md rounded-t-2xl sm:rounded-2xl shadow-2xl max-h-[85vh] flex flex-col"
                style={{ background: BN.surface, border: `1px solid ${BN.border}` }}>
                {/* Header */}
                <div className="flex items-center justify-between px-4 py-3" style={{ borderBottom: `1px solid ${BN.border}` }}>
                    <div className="flex items-center gap-2 min-w-0">
                        <MessageCircle className="w-5 h-5 shrink-0" style={{ color: BN.gold }} />
                        <div className="min-w-0">
                            <div className="text-sm font-bold truncate" style={{ color: BN.text }}>{shopName}</div>
                            <div className="text-[11px]" style={{ color: BN.text3 }}>Do&apos;kon bilan chat</div>
                        </div>
                    </div>
                    <button onClick={onClose} aria-label="Yopish"
                        className="p-1.5 rounded"
                        style={{ background: BN.surfaceUp }}>
                        <X className="w-4 h-4" style={{ color: BN.text2 }} />
                    </button>
                </div>

                {/* Messages */}
                <div ref={scrollRef} className="flex-1 overflow-y-auto p-3 space-y-2 min-h-[300px]" style={{ background: BN.bg }}>
                    {loading ? (
                        <div className="flex justify-center py-6">
                            <Loader2 className="w-5 h-5 animate-spin" style={{ color: BN.text3 }} />
                        </div>
                    ) : messages.length === 0 ? (
                        <div className="text-center py-8 text-xs" style={{ color: BN.text3 }}>
                            Hozircha xabar yo&apos;q.<br />
                            Do&apos;konga savolingizni yozing — sotuvchi javob beradi.
                        </div>
                    ) : (
                        messages.map(m => (
                            <div key={m.id} className={`flex ${m.fromShop ? "justify-start" : "justify-end"}`}>
                                <div
                                    className={`max-w-[80%] px-3 py-2 rounded-2xl text-sm ${m.fromShop ? "rounded-bl-md" : "rounded-br-md"}`}
                                    style={{
                                        background: m.fromShop ? BN.surfaceUp : BN.gold,
                                        color: m.fromShop ? BN.text : BN.onGold,
                                    }}
                                >
                                    {m.imageUrl && (
                                        // eslint-disable-next-line @next/next/no-img-element
                                        <img src={m.imageUrl} alt="" className="max-w-full rounded-lg mb-1" />
                                    )}
                                    {m.text && <div className="whitespace-pre-wrap break-words">{m.text}</div>}
                                    <div className="text-[10px] mt-1 opacity-70">
                                        {new Date(m.createdAt).toLocaleTimeString("uz-UZ", { hour: "2-digit", minute: "2-digit" })}
                                    </div>
                                </div>
                            </div>
                        ))
                    )}
                </div>

                {/* Composer */}
                <div className="p-3 flex gap-2" style={{ borderTop: `1px solid ${BN.border}` }}>
                    <input
                        type="text"
                        value={text}
                        onChange={e => setText(e.target.value)}
                        onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); void send(); } }}
                        placeholder="Xabar yozing..."
                        className="flex-1 px-3 py-2 rounded-lg text-sm focus:outline-none"
                        style={{ background: BN.surfaceUp, border: `1px solid ${BN.border}`, color: BN.text }}
                        maxLength={2000}
                    />
                    <button
                        onClick={send}
                        disabled={sending || !text.trim()}
                        className="px-3 rounded-lg disabled:opacity-50"
                        style={{ background: BN.gold, color: BN.onGold }}
                        aria-label="Yuborish"
                    >
                        {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                    </button>
                </div>
            </div>
        </div>
    );
}
