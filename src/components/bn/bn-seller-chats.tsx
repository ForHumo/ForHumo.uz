"use client";

// Sotuvchining chatlar tabi — kabinet ichida.
// Har bir chat — xaridor bilan buyurtmasiz suhbat + narx savdolashuvi.
// Chatga bosilsa BnShopChatButton'ning modal versiyasi ochiladi (viewerIsSeller=true rejim).

import { useCallback, useEffect, useState } from "react";
import { MessageCircle, Loader2, Store as StoreIcon, ChevronRight, Tag, Check, X } from "lucide-react";
import { BN } from "@/lib/bn-theme";
import { BnEmpty } from "./bn-cards";

interface Chat {
    id: string;
    shopSlug: string;
    shopName: string;
    buyer: { name: string | null; username: string | null; image: string | null } | null;
    buyerId: string;
    shopUnread: number;
    lastAt: string;
    last: {
        text: string;
        kind: "TEXT" | "OFFER" | "COUNTER" | "ACCEPT" | "REJECT";
        fromShop: boolean;
        createdAt: string;
    } | null;
}

export function BnSellerChats() {
    const [chats, setChats] = useState<Chat[]>([]);
    const [loading, setLoading] = useState(true);
    const [active, setActive] = useState<Chat | null>(null);

    const load = useCallback(async () => {
        setLoading(true);
        try {
            const r = await fetch("/api/bn/seller/chats", { cache: "no-store" });
            if (r.ok) {
                const j = await r.json();
                setChats(j.chats ?? []);
            }
        } finally { setLoading(false); }
    }, []);

    useEffect(() => { void load(); }, [load]);
    // Polling 20s — do'kon egasi yangi xabar chiqishini kutmaydi
    useEffect(() => {
        const id = window.setInterval(load, 20000);
        return () => window.clearInterval(id);
    }, [load]);

    if (loading && chats.length === 0) {
        return (
            <div className="flex items-center justify-center py-12">
                <Loader2 className="w-6 h-6 animate-spin" style={{ color: BN.gold }} />
            </div>
        );
    }

    if (chats.length === 0) {
        return (
            <BnEmpty
                icon={<MessageCircle className="w-6 h-6" />}
                title="Hali chatlar yo'q"
                text="Xaridorlar do'koningizga savol yozganda yoki narx taklif qilganda shu yerda ko'rinadi."
            />
        );
    }

    const total = chats.length;
    const unread = chats.reduce((s, c) => s + c.shopUnread, 0);

    return (
        <div className="mx-auto max-w-[900px] px-1">
            <div className="flex items-center gap-2 mb-3">
                <MessageCircle className="w-5 h-5" style={{ color: BN.gold }} />
                <h2 className="text-[16px] font-black">Xaridorlar bilan chat</h2>
                <span className="text-[12px] px-2 py-0.5 rounded-full font-bold"
                    style={{ background: BN.surfaceUp, color: BN.text3 }}>
                    {total}
                </span>
                {unread > 0 && (
                    <span className="text-[12px] px-2 py-0.5 rounded-full font-black"
                        style={{ background: BN.gold, color: BN.onGold }}>
                        {unread} yangi
                    </span>
                )}
            </div>

            <div className="space-y-1.5">
                {chats.map(c => <ChatRow key={c.id} c={c} onOpen={() => setActive(c)} />)}
            </div>

            {active && (
                <SellerChatModal
                    chat={active}
                    onClose={() => { setActive(null); void load(); }}
                />
            )}
        </div>
    );
}

function ChatRow({ c, onOpen }: { c: Chat; onOpen: () => void }) {
    const buyerName = c.buyer?.name ?? c.buyer?.username ?? "Mijoz";
    const buyerInitial = (c.buyer?.name ?? c.buyer?.username ?? "M").charAt(0).toUpperCase();
    const hasUnread = c.shopUnread > 0;
    const timeAgo = fmtTimeAgo(new Date(c.lastAt));

    // Xabar oldi belgi
    let kindIcon: React.ReactNode = null;
    let kindColor: string = BN.text2;
    if (c.last?.kind === "OFFER" || c.last?.kind === "COUNTER") {
        kindIcon = <Tag className="w-3 h-3" />;
        kindColor = BN.gold;
    } else if (c.last?.kind === "ACCEPT") {
        kindIcon = <Check className="w-3 h-3" />;
        kindColor = BN.ok;
    } else if (c.last?.kind === "REJECT") {
        kindIcon = <X className="w-3 h-3" />;
        kindColor = BN.err;
    }

    return (
        <button
            onClick={onOpen}
            className="w-full flex items-center gap-3 p-3 rounded-2xl text-left transition-colors"
            style={{
                background: hasUnread ? BN.goldSoft : BN.surface,
                border: `1px solid ${hasUnread ? BN.borderGold : BN.border}`,
            }}
        >
            {c.buyer?.image ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={c.buyer.image} alt="" className="w-11 h-11 rounded-full object-cover flex-shrink-0" />
            ) : (
                <div className="w-11 h-11 rounded-full grid place-items-center flex-shrink-0 text-[15px] font-black"
                    style={{ background: BN.surfaceUp, color: BN.text2 }}>
                    {buyerInitial}
                </div>
            )}
            <div className="flex-1 min-w-0">
                <div className="flex items-baseline gap-2">
                    <div className="text-[13.5px] font-bold truncate" style={{ color: BN.text }}>{buyerName}</div>
                    <div className="text-[10.5px] flex-shrink-0" style={{ color: BN.text3 }}>{timeAgo}</div>
                </div>
                <div className="flex items-center gap-1.5 mt-0.5">
                    {kindIcon && <span style={{ color: kindColor }}>{kindIcon}</span>}
                    <div className="text-[12.5px] truncate" style={{ color: hasUnread ? BN.text : BN.text3 }}>
                        {c.last?.fromShop && "Siz: "}
                        {c.last?.text ?? "..."}
                    </div>
                </div>
                <div className="flex items-center gap-1.5 mt-1">
                    <StoreIcon className="w-3 h-3" style={{ color: BN.text3 }} />
                    <span className="text-[10.5px]" style={{ color: BN.text3 }}>{c.shopName}</span>
                </div>
            </div>
            {hasUnread && (
                <span className="min-w-[22px] h-[22px] px-1.5 grid place-items-center rounded-full text-[11px] font-black flex-shrink-0"
                    style={{ background: BN.gold, color: BN.onGold }}>
                    {c.shopUnread > 9 ? "9+" : c.shopUnread}
                </span>
            )}
            <ChevronRight className="w-4 h-4 flex-shrink-0" style={{ color: BN.text3 }} />
        </button>
    );
}

function fmtTimeAgo(d: Date): string {
    const s = Math.floor((Date.now() - d.getTime()) / 1000);
    if (s < 60) return "hozir";
    if (s < 3600) return `${Math.floor(s / 60)} daq`;
    if (s < 86400) return `${Math.floor(s / 3600)} soat`;
    if (s < 7 * 86400) return `${Math.floor(s / 86400)} kun`;
    return d.toLocaleDateString("uz-UZ", { day: "2-digit", month: "short" });
}

// ── Sotuvchi chat modal (buyer bilan ochilgan chat) ─────────────────────────
// Umumiy BnShopChatButton mavjud lekin u xaridor tomon uchun. Sotuvchi tomonda
// biz `?buyerId=` bilan GET chaqiramiz, POST'da ham `buyerId` qo'shamiz.

import { createPortal } from "react-dom";
import { useRef } from "react";
import { X as XIcon, Send, Loader2 as Spin } from "lucide-react";
import { bnToast } from "./bn-toast";

interface Msg {
    id: string;
    fromShop: boolean;
    text: string;
    imageUrl: string | null;
    createdAt: string;
    readAt: string | null;
    kind: "TEXT" | "OFFER" | "COUNTER" | "ACCEPT" | "REJECT";
    productId: string | null;
    offerAmount: number | null;
    offerStatus: "PENDING" | "ACCEPTED" | "REJECTED" | "COUNTERED" | null;
}

function SellerChatModal({ chat, onClose }: { chat: Chat; onClose: () => void }) {
    const [messages, setMessages] = useState<Msg[]>([]);
    const [loading, setLoading] = useState(true);
    const [text, setText] = useState("");
    const [sending, setSending] = useState(false);
    const scrollRef = useRef<HTMLDivElement>(null);

    const load = useCallback(async () => {
        try {
            const r = await fetch(`/api/bn/shops/${chat.shopSlug}/chat?buyerId=${chat.buyerId}`, { cache: "no-store" });
            if (r.ok) {
                const j = await r.json();
                setMessages(j.messages ?? []);
            }
        } finally { setLoading(false); }
    }, [chat.shopSlug, chat.buyerId]);

    useEffect(() => { void load(); }, [load]);
    useEffect(() => {
        const id = window.setInterval(load, 4000);
        return () => window.clearInterval(id);
    }, [load]);
    useEffect(() => {
        if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }, [messages]);

    async function send() {
        const t = text.trim();
        if (!t) return;
        setSending(true);
        try {
            const r = await fetch(`/api/bn/shops/${chat.shopSlug}/chat`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ text: t, kind: "TEXT", buyerId: chat.buyerId }),
            });
            if (r.ok) { setText(""); void load(); }
            else bnToast("Xabar yuborilmadi", "error");
        } finally { setSending(false); }
    }

    async function respondToOffer(id: string, action: "ACCEPT" | "REJECT") {
        setSending(true);
        try {
            const r = await fetch(`/api/bn/shops/${chat.shopSlug}/chat`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ kind: action, answersOfferId: id, buyerId: chat.buyerId, text: "" }),
            });
            if (!r.ok) {
                const d = await r.json().catch(() => ({}));
                bnToast(d?.error === "offer_already_resolved"
                    ? "Bu taklif allaqachon hal qilingan"
                    : "Amal bajarilmadi", "error");
            }
            void load();
        } finally { setSending(false); }
    }

    async function sendCounter(offerId: string, amount: number, note: string) {
        setSending(true);
        try {
            const productId = messages.find(m => m.id === offerId)?.productId;
            if (!productId) return;
            const r = await fetch(`/api/bn/shops/${chat.shopSlug}/chat`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    kind: "COUNTER", answersOfferId: offerId, buyerId: chat.buyerId,
                    productId, offerAmount: amount, text: note,
                }),
            });
            if (r.ok) { void load(); }
            else bnToast("Qarshi taklif yuborilmadi", "error");
        } finally { setSending(false); }
    }

    const buyerName = chat.buyer?.name ?? chat.buyer?.username ?? "Mijoz";
    if (typeof document === "undefined") return null;

    return createPortal(
        <div className="fixed inset-0 z-[200] bg-black/70 flex items-end sm:items-center justify-center p-0 sm:p-4">
            <div className="w-full sm:max-w-md rounded-t-2xl sm:rounded-2xl shadow-2xl max-h-[90vh] flex flex-col overflow-hidden"
                style={{ background: BN.surface, border: `1px solid ${BN.border}` }}>
                {/* Header */}
                <div className="flex items-center justify-between px-4 py-3" style={{ borderBottom: `1px solid ${BN.border}` }}>
                    <div className="flex items-center gap-2 min-w-0">
                        {chat.buyer?.image ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={chat.buyer.image} alt="" className="w-9 h-9 rounded-full object-cover" />
                        ) : (
                            <div className="w-9 h-9 rounded-full grid place-items-center text-[13px] font-black"
                                style={{ background: BN.surfaceUp, color: BN.text2 }}>
                                {buyerName.charAt(0).toUpperCase()}
                            </div>
                        )}
                        <div className="min-w-0">
                            <div className="text-sm font-bold truncate" style={{ color: BN.text }}>{buyerName}</div>
                            <div className="text-[11px]" style={{ color: BN.text3 }}>Xaridor · {chat.shopName}</div>
                        </div>
                    </div>
                    <button onClick={onClose} aria-label="Yopish"
                        className="p-1.5 rounded" style={{ background: BN.surfaceUp }}>
                        <XIcon className="w-4 h-4" style={{ color: BN.text2 }} />
                    </button>
                </div>

                {/* Messages */}
                <div ref={scrollRef} className="flex-1 overflow-y-auto p-3 space-y-2 min-h-[320px]"
                    style={{ background: BN.bg }}>
                    {loading ? (
                        <div className="flex justify-center py-6">
                            <Spin className="w-5 h-5 animate-spin" style={{ color: BN.text3 }} />
                        </div>
                    ) : messages.length === 0 ? (
                        <div className="text-center py-8 text-xs" style={{ color: BN.text3 }}>
                            Hozircha xabar yo&apos;q
                        </div>
                    ) : (
                        messages.map(m => <SellerMessageBubble key={m.id} m={m}
                            onRespond={respondToOffer}
                            onCounter={sendCounter}
                            sending={sending}
                        />)
                    )}
                </div>

                {/* Composer */}
                <div className="p-3 flex gap-2" style={{ borderTop: `1px solid ${BN.border}` }}>
                    <input
                        type="text"
                        value={text}
                        onChange={e => setText(e.target.value)}
                        onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); void send(); } }}
                        placeholder="Xaridorga yozing..."
                        className="flex-1 px-3 py-2 rounded-lg text-sm focus:outline-none"
                        style={{ background: BN.surfaceUp, border: `1px solid ${BN.border}`, color: BN.text }}
                        maxLength={2000}
                    />
                    <button onClick={send} disabled={sending || !text.trim()}
                        className="px-3 rounded-lg disabled:opacity-50"
                        style={{ background: BN.gold, color: BN.onGold }}
                        aria-label="Yuborish">
                        {sending ? <Spin className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                    </button>
                </div>
            </div>
        </div>,
        document.body,
    );
}

function SellerMessageBubble({
    m, onRespond, onCounter, sending,
}: {
    m: Msg;
    onRespond: (id: string, action: "ACCEPT" | "REJECT") => void;
    onCounter: (id: string, amount: number, note: string) => void;
    sending: boolean;
}) {
    const [counterOpen, setCounterOpen] = useState(false);
    const [counterAmt, setCounterAmt] = useState<number>(m.offerAmount ?? 0);
    const [counterNote, setCounterNote] = useState("");

    if (m.kind === "OFFER" || m.kind === "COUNTER") {
        const isPending = m.offerStatus === "PENDING";
        // Sotuvchi tomon: xaridor taklif yuborsa (fromShop=false) → sotuvchi javob beradi
        // Sotuvchi o'zi qarshi taklif yuborsa (fromShop=true) → xaridor javob beradi (sotuvchida tugma yo'q)
        const canRespond = isPending && !m.fromShop;
        const status = m.offerStatus ?? "PENDING";
        const statusText = status === "PENDING" ? "Kutilmoqda"
            : status === "ACCEPTED" ? "Qabul qildingiz"
            : status === "REJECTED" ? "Rad etdingiz"
            : "Qarshi taklif berildi";
        const statusColor = status === "PENDING" ? BN.gold
            : status === "ACCEPTED" ? BN.ok
            : status === "REJECTED" ? BN.err
            : BN.text3;

        return (
            <div className={`flex ${m.fromShop ? "justify-end" : "justify-start"}`}>
                <div className="max-w-[85%] rounded-2xl overflow-hidden"
                    style={{
                        background: m.fromShop ? BN.gold : BN.surfaceUp,
                        color: m.fromShop ? BN.onGold : BN.text,
                        border: `1px solid ${m.fromShop ? BN.gold : BN.border}`,
                    }}
                >
                    <div className="px-3 py-2 text-[11px] font-black uppercase tracking-wider opacity-80">
                        {m.kind === "OFFER" ? "Xaridor taklifi" : "Sizning qarshi taklif"}
                    </div>
                    <div className="px-3 pb-2">
                        <div className="text-[22px] font-black tabular-nums leading-tight">
                            {(m.offerAmount ?? 0).toLocaleString("uz-UZ")} so&apos;m
                        </div>
                    </div>
                    {m.text && !m.text.startsWith("Narx taklifi:") && !m.text.startsWith("Qarshi taklif:") && (
                        <div className="px-3 pb-2 text-[13px] whitespace-pre-wrap opacity-90">{m.text}</div>
                    )}
                    <div className="px-3 pb-2">
                        <span className="inline-block px-2 py-0.5 rounded-full text-[11px] font-bold"
                            style={{ background: `${statusColor}22`, color: statusColor }}>
                            {statusText}
                        </span>
                    </div>
                    {canRespond && !counterOpen && (
                        <div className="grid grid-cols-3 gap-0 border-t"
                            style={{ borderColor: m.fromShop ? BN.border : BN.border }}>
                            <button onClick={() => onRespond(m.id, "REJECT")} disabled={sending}
                                className="py-2.5 text-[12px] font-black disabled:opacity-50"
                                style={{ color: BN.err }}>
                                Rad
                            </button>
                            <button onClick={() => setCounterOpen(true)} disabled={sending}
                                className="py-2.5 text-[12px] font-black disabled:opacity-50"
                                style={{ color: BN.gold, borderLeft: `1px solid ${BN.border}` }}>
                                Qarshi
                            </button>
                            <button onClick={() => onRespond(m.id, "ACCEPT")} disabled={sending}
                                className="py-2.5 text-[12px] font-black disabled:opacity-50"
                                style={{ color: BN.ok, borderLeft: `1px solid ${BN.border}` }}>
                                Qabul
                            </button>
                        </div>
                    )}
                    {canRespond && counterOpen && (
                        <div className="p-3 border-t space-y-2" style={{ borderColor: BN.border }}>
                            <div className="text-[11px] font-bold" style={{ color: BN.text3 }}>Qarshi taklif narxi</div>
                            <div className="flex items-baseline gap-2 rounded-xl px-3 py-2"
                                style={{ background: BN.surface, border: `1px solid ${BN.borderGold}` }}>
                                <input
                                    type="text"
                                    inputMode="numeric"
                                    value={counterAmt}
                                    onChange={e => setCounterAmt(Number(e.target.value.replace(/\D/g, "")) || 0)}
                                    className="flex-1 bg-transparent text-[16px] font-black tabular-nums focus:outline-none"
                                    style={{ color: BN.gold }}
                                />
                                <span className="text-[12px] font-bold" style={{ color: BN.text3 }}>so&apos;m</span>
                            </div>
                            <textarea value={counterNote} onChange={e => setCounterNote(e.target.value)}
                                placeholder="Ixtiyoriy izoh (nima uchun shu narx)"
                                rows={2} maxLength={300}
                                className="w-full px-3 py-2 rounded-lg text-[13px] resize-none focus:outline-none"
                                style={{ background: BN.surface, border: `1px solid ${BN.border}`, color: BN.text }} />
                            <div className="grid grid-cols-2 gap-2">
                                <button onClick={() => setCounterOpen(false)}
                                    className="h-10 rounded-lg text-[12px] font-bold"
                                    style={{ background: BN.surface, color: BN.text2 }}>
                                    Bekor
                                </button>
                                <button
                                    onClick={() => { onCounter(m.id, counterAmt, counterNote); setCounterOpen(false); }}
                                    disabled={sending || counterAmt <= 0}
                                    className="h-10 rounded-lg text-[12px] font-black disabled:opacity-50"
                                    style={{ background: BN.gold, color: BN.onGold }}>
                                    Yuborish
                                </button>
                            </div>
                        </div>
                    )}
                    <div className="px-3 pb-2 text-[10px] opacity-60">
                        {new Date(m.createdAt).toLocaleTimeString("uz-UZ", { hour: "2-digit", minute: "2-digit" })}
                    </div>
                </div>
            </div>
        );
    }

    if (m.kind === "ACCEPT" || m.kind === "REJECT") {
        const isAccept = m.kind === "ACCEPT";
        return (
            <div className="flex justify-center">
                <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[12px] font-bold"
                    style={{
                        background: isAccept ? `${BN.ok}22` : `${BN.err}22`,
                        color: isAccept ? BN.ok : BN.err,
                    }}>
                    {m.text}
                </div>
            </div>
        );
    }

    // TEXT
    return (
        <div className={`flex ${m.fromShop ? "justify-end" : "justify-start"}`}>
            <div className={`max-w-[80%] px-3 py-2 rounded-2xl text-sm ${m.fromShop ? "rounded-br-md" : "rounded-bl-md"}`}
                style={{
                    background: m.fromShop ? BN.gold : BN.surfaceUp,
                    color: m.fromShop ? BN.onGold : BN.text,
                }}>
                {m.text && <div className="whitespace-pre-wrap break-words">{m.text}</div>}
                <div className="text-[10px] mt-1 opacity-70">
                    {new Date(m.createdAt).toLocaleTimeString("uz-UZ", { hour: "2-digit", minute: "2-digit" })}
                </div>
            </div>
        </div>
    );
}
