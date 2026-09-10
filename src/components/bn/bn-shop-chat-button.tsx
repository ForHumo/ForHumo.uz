"use client";

// BN Do'kon chat + Narx savdolashuvi.
//
// Xaridor tomon:
//   - Oddiy chat (free-text)
//   - Narx taklifi: slider bilan raqam tanlash + izoh yozib yuborish
//   - Sotuvchi qarshi taklif bersa — [Qabul] / [Rad] / [Yangi taklif] tugmalari
//
// Sotuvchi tomon:
//   - Xaridor taklifiga [Qabul] / [Rad] / [Qarshi taklif]

import { useCallback, useEffect, useRef, useState } from "react";
import { MessageCircle, X, Send, Loader2, TagIcon, CheckCircle2, XCircle, ChevronDown } from "lucide-react";
import { BN } from "@/lib/bn-theme";

interface OfferProduct {
    id: string;
    title: string;
    price: number;
    imageUrl?: string | null;
}

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

interface Props {
    shopSlug: string;
    shopName: string;
    /** Bosh sahifadagi kichkina tugma o'rniga — buyer tomonidan mahsulot detalidan boshqa CTA sifatida chaqirilishi mumkin */
    triggerLabel?: string;
    /** Mahsulot konteksti — bo'lsa modal ochilganda "Narx taklif qilish" tab paydo bo'ladi */
    product?: OfferProduct | null;
}

export function BnShopChatButton({ shopSlug, shopName, triggerLabel, product = null }: Props) {
    const [open, setOpen] = useState(false);
    const [initialText, setInitialText] = useState<string>("");

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
                {triggerLabel ?? "Yozishish"}
            </button>

            {open && (
                <BnShopChatModal
                    shopSlug={shopSlug}
                    shopName={shopName}
                    initialText={initialText}
                    product={product}
                    onClose={() => { setOpen(false); setInitialText(""); }}
                />
            )}
        </>
    );
}

function BnShopChatModal({
    shopSlug, shopName, initialText, product, onClose,
}: {
    shopSlug: string; shopName: string; initialText?: string;
    product: OfferProduct | null; onClose: () => void;
}) {
    const [messages, setMessages] = useState<Msg[]>([]);
    const [loading, setLoading] = useState(true);
    const [sending, setSending] = useState(false);
    const [text, setText] = useState(initialText ?? "");
    const [showOfferForm, setShowOfferForm] = useState(!!initialText && !!product);
    const [viewerIsSeller, setViewerIsSeller] = useState(false);
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
                setViewerIsSeller(!!j.viewerIsSeller);
            }
        } finally { setLoading(false); }
    }, [shopSlug]);

    useEffect(() => { void load(); }, [load]);

    useEffect(() => {
        const id = window.setInterval(load, 4000);
        return () => window.clearInterval(id);
    }, [load]);

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
                body: JSON.stringify({ text: t, kind: "TEXT" }),
            });
            if (r.ok) { setText(""); void load(); }
        } finally { setSending(false); }
    }, [text, shopSlug, load]);

    const sendOffer = useCallback(async (offerAmount: number, note: string) => {
        if (!product || !offerAmount) return;
        setSending(true);
        try {
            const r = await fetch(`/api/bn/shops/${shopSlug}/chat`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    text: note.trim(),
                    kind: "OFFER",
                    productId: product.id,
                    offerAmount,
                }),
            });
            if (r.ok) { setShowOfferForm(false); void load(); }
        } finally { setSending(false); }
    }, [product, shopSlug, load]);

    const respondToOffer = useCallback(async (offerId: string, action: "ACCEPT" | "REJECT") => {
        setSending(true);
        try {
            await fetch(`/api/bn/shops/${shopSlug}/chat`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ kind: action, answersOfferId: offerId, text: "" }),
            });
            void load();
        } finally { setSending(false); }
    }, [shopSlug, load]);

    return (
        <div className="fixed inset-0 z-[200] bg-black/70 flex items-end sm:items-center justify-center p-0 sm:p-4">
            <div className="w-full sm:max-w-md rounded-t-2xl sm:rounded-2xl shadow-2xl max-h-[90vh] flex flex-col overflow-hidden"
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
                        className="p-1.5 rounded" style={{ background: BN.surfaceUp }}>
                        <X className="w-4 h-4" style={{ color: BN.text2 }} />
                    </button>
                </div>

                {/* Mahsulot chip (agar berilgan bo'lsa) */}
                {product && (
                    <div className="px-3 py-2 flex items-center gap-2"
                        style={{ background: BN.goldSoft, borderBottom: `1px solid ${BN.borderGold}` }}>
                        {product.imageUrl && (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={product.imageUrl} alt="" className="w-8 h-8 rounded-lg object-cover shrink-0" />
                        )}
                        <div className="flex-1 min-w-0">
                            <div className="text-[11px]" style={{ color: BN.text3 }}>Muhokamada</div>
                            <div className="text-[13px] font-bold truncate" style={{ color: BN.gold }}>{product.title}</div>
                        </div>
                        <div className="text-[12px] font-black tabular-nums" style={{ color: BN.gold }}>
                            {product.price.toLocaleString("uz-UZ")} so&apos;m
                        </div>
                    </div>
                )}

                {/* Messages */}
                <div ref={scrollRef} className="flex-1 overflow-y-auto p-3 space-y-2 min-h-[320px]"
                    style={{ background: BN.bg }}>
                    {loading ? (
                        <div className="flex justify-center py-6">
                            <Loader2 className="w-5 h-5 animate-spin" style={{ color: BN.text3 }} />
                        </div>
                    ) : messages.length === 0 ? (
                        <div className="text-center py-8 text-xs" style={{ color: BN.text3 }}>
                            Hozircha xabar yo&apos;q.<br />
                            Do&apos;konga savolingizni yozing yoki narx taklif qiling.
                        </div>
                    ) : (
                        messages.map(m => (
                            <MessageBubble key={m.id} m={m}
                                originalPrice={product?.price}
                                viewerIsSeller={viewerIsSeller}
                                onRespond={respondToOffer}
                                sending={sending}
                            />
                        ))
                    )}
                </div>

                {/* Offer form (agar mahsulot + user showOfferForm bosgan) */}
                {product && showOfferForm && (
                    <OfferForm
                        product={product}
                        onCancel={() => setShowOfferForm(false)}
                        onSend={sendOffer}
                        sending={sending}
                        initialNote={text}
                    />
                )}

                {/* Composer */}
                {!showOfferForm && (
                    <div className="p-3 space-y-2" style={{ borderTop: `1px solid ${BN.border}` }}>
                        {product && (
                            <button
                                onClick={() => setShowOfferForm(true)}
                                className="w-full h-10 flex items-center justify-center gap-1.5 rounded-xl text-[13px] font-black transition-transform active:scale-[0.98]"
                                style={{ background: BN.goldSoft, color: BN.gold, border: `1px solid ${BN.borderGold}` }}
                            >
                                <TagIcon className="w-4 h-4" />
                                Narx taklif qilish
                            </button>
                        )}
                        <div className="flex gap-2">
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
                )}
            </div>
        </div>
    );
}

// ── Xabar sharlari ─────────────────────────────────────────────────────────

function MessageBubble({
    m, originalPrice, viewerIsSeller, onRespond, sending,
}: {
    m: Msg;
    originalPrice?: number;
    viewerIsSeller: boolean;
    onRespond: (id: string, action: "ACCEPT" | "REJECT") => void;
    sending: boolean;
}) {
    if (m.kind === "OFFER" || m.kind === "COUNTER") {
        return <OfferBubble m={m} originalPrice={originalPrice} viewerIsSeller={viewerIsSeller} onRespond={onRespond} sending={sending} />;
    }
    if (m.kind === "ACCEPT" || m.kind === "REJECT") {
        return <SystemBubble m={m} />;
    }
    // TEXT (default)
    return (
        <div className={`flex ${m.fromShop ? "justify-start" : "justify-end"}`}>
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
    );
}

function OfferBubble({
    m, originalPrice, viewerIsSeller, onRespond, sending,
}: {
    m: Msg;
    originalPrice?: number;
    viewerIsSeller: boolean;
    onRespond: (id: string, action: "ACCEPT" | "REJECT") => void;
    sending: boolean;
}) {
    const amount = m.offerAmount ?? 0;
    const status = m.offerStatus ?? "PENDING";
    const isPending = status === "PENDING";
    // Taklifga faqat qarshi tomon javob bera oladi:
    //   xaridor taklif (fromShop=false) → sotuvchi javob beradi
    //   sotuvchi qarshi taklif (fromShop=true) → xaridor javob beradi
    const canRespond = isPending && (m.fromShop ? !viewerIsSeller : viewerIsSeller);

    const pct = originalPrice ? Math.round((amount / originalPrice) * 100) : null;
    const label = m.kind === "COUNTER" ? "Qarshi taklif" : "Narx taklifi";
    const statusMeta: Record<string, { text: string; color: string; bg: string; icon: React.ReactNode }> = {
        PENDING:   { text: "Kutilmoqda", color: BN.gold,  bg: BN.goldSoft, icon: null },
        ACCEPTED:  { text: "Qabul qilindi", color: BN.ok, bg: `${BN.ok}22`, icon: <CheckCircle2 className="w-3.5 h-3.5" /> },
        REJECTED:  { text: "Rad etildi", color: BN.err,   bg: `${BN.err}22`, icon: <XCircle className="w-3.5 h-3.5" /> },
        COUNTERED: { text: "Qarshi taklif berildi", color: BN.text3, bg: BN.surfaceUp, icon: <ChevronDown className="w-3.5 h-3.5" /> },
    };
    const meta = statusMeta[status] ?? statusMeta.PENDING;

    return (
        <div className={`flex ${m.fromShop ? "justify-start" : "justify-end"}`}>
            <div className="max-w-[85%] rounded-2xl overflow-hidden"
                style={{
                    background: m.fromShop ? BN.surfaceUp : BN.gold,
                    color: m.fromShop ? BN.text : BN.onGold,
                    border: `1px solid ${m.fromShop ? BN.border : BN.gold}`,
                }}
            >
                {/* Sarlavha */}
                <div className="px-3 py-2 flex items-center gap-1.5 text-[11px] font-black uppercase tracking-wider opacity-80">
                    <TagIcon className="w-3.5 h-3.5" />
                    {label}
                </div>
                {/* Summa */}
                <div className="px-3 pb-2">
                    <div className="text-[22px] font-black tabular-nums leading-tight">
                        {amount.toLocaleString("uz-UZ")} so&apos;m
                    </div>
                    {pct !== null && (
                        <div className="text-[11px] opacity-70 mt-0.5">
                            E&apos;lon narxining {pct}% i
                        </div>
                    )}
                </div>
                {/* Izoh (agar bor bo'lsa) */}
                {m.text && !m.text.startsWith("Narx taklifi:") && !m.text.startsWith("Qarshi taklif:") && (
                    <div className="px-3 pb-2 text-[13px] whitespace-pre-wrap opacity-90">{m.text}</div>
                )}
                {/* Status chip */}
                <div className="px-3 pb-2">
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold"
                        style={{ background: meta.bg, color: meta.color }}>
                        {meta.icon} {meta.text}
                    </span>
                </div>
                {/* Javob tugmalari — faqat qarshi tomonga ko'rinadi */}
                {canRespond && (
                    <div className="grid grid-cols-2 gap-0 border-t"
                        style={{ borderColor: m.fromShop ? BN.border : "rgba(0,0,0,0.15)" }}>
                        <button
                            onClick={() => onRespond(m.id, "REJECT")}
                            disabled={sending}
                            className="py-2.5 text-[13px] font-black disabled:opacity-50 hover:opacity-80"
                            style={{ color: m.fromShop ? BN.err : "#7A1F1F", background: "transparent" }}
                        >
                            <XCircle className="w-4 h-4 inline mr-1" />
                            Rad
                        </button>
                        <button
                            onClick={() => onRespond(m.id, "ACCEPT")}
                            disabled={sending}
                            className="py-2.5 text-[13px] font-black disabled:opacity-50 hover:opacity-80"
                            style={{
                                color: m.fromShop ? BN.ok : "#0E4B27",
                                background: "transparent",
                                borderLeft: `1px solid ${m.fromShop ? BN.border : "rgba(0,0,0,0.15)"}`,
                            }}
                        >
                            <CheckCircle2 className="w-4 h-4 inline mr-1" />
                            Qabul
                        </button>
                    </div>
                )}
                <div className="px-3 pb-2 text-[10px] opacity-60">
                    {new Date(m.createdAt).toLocaleTimeString("uz-UZ", { hour: "2-digit", minute: "2-digit" })}
                </div>
            </div>
        </div>
    );
}

function SystemBubble({ m }: { m: Msg }) {
    const isAccept = m.kind === "ACCEPT";
    return (
        <div className="flex justify-center">
            <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[12px] font-bold"
                style={{
                    background: isAccept ? `${BN.ok}22` : `${BN.err}22`,
                    color: isAccept ? BN.ok : BN.err,
                }}
            >
                {isAccept ? <CheckCircle2 className="w-3.5 h-3.5" /> : <XCircle className="w-3.5 h-3.5" />}
                {m.text}
            </div>
        </div>
    );
}

// ── Taklif formasi (slider + izoh) ─────────────────────────────────────────

function OfferForm({
    product, onCancel, onSend, sending, initialNote,
}: {
    product: OfferProduct;
    onCancel: () => void;
    onSend: (amount: number, note: string) => void;
    sending: boolean;
    initialNote?: string;
}) {
    const min = Math.max(1, Math.round(product.price * 0.3));
    const max = product.price;
    // 90% dan boshlaymiz — real hayotda savdolashuv odatda 5-15% chegirma
    const [amount, setAmount] = useState(Math.round(product.price * 0.9));
    const [note, setNote] = useState(initialNote ?? "");
    const pct = Math.round((amount / product.price) * 100);
    // Ehtimol: 100% = 100, 90% = 60, 80% = 30, 70% = 15, ≤60% = 5 (heuristika)
    const successPct = amount >= product.price ? 100
        : amount >= product.price * 0.95 ? 80
        : amount >= product.price * 0.90 ? 60
        : amount >= product.price * 0.85 ? 40
        : amount >= product.price * 0.75 ? 20
        : amount >= product.price * 0.6  ? 10
        : 5;
    const [inputStr, setInputStr] = useState(String(amount));

    useEffect(() => {
        setInputStr(String(amount));
    }, [amount]);

    return (
        <div className="p-3 space-y-3" style={{ borderTop: `1px solid ${BN.border}`, background: BN.surface }}>
            <div className="flex items-center justify-between">
                <div className="text-[13px] font-black" style={{ color: BN.text }}>
                    Narx taklif qiling
                </div>
                <button onClick={onCancel} className="text-[12px] font-bold" style={{ color: BN.text3 }}>
                    Bekor qilish
                </button>
            </div>

            {/* Katta raqam kirituvchi */}
            <div>
                <div className="text-[10px] mb-1" style={{ color: BN.text3 }}>Sizning taklifingiz</div>
                <div className="flex items-baseline gap-2 rounded-xl px-3 py-2.5"
                    style={{ background: BN.surfaceUp, border: `1px solid ${BN.borderGold}` }}>
                    <input
                        type="text"
                        inputMode="numeric"
                        value={inputStr}
                        onChange={e => {
                            const digits = e.target.value.replace(/\D/g, "");
                            setInputStr(digits);
                            const n = Number(digits);
                            if (Number.isFinite(n) && n > 0) {
                                setAmount(Math.max(min, Math.min(max, n)));
                            }
                        }}
                        onBlur={() => setInputStr(String(amount))}
                        className="flex-1 bg-transparent text-[20px] font-black tabular-nums focus:outline-none"
                        style={{ color: BN.gold }}
                    />
                    <span className="text-[13px] font-bold" style={{ color: BN.text3 }}>so&apos;m</span>
                </div>
            </div>

            {/* Slider */}
            <div>
                <input
                    type="range"
                    min={min}
                    max={max}
                    step={Math.max(1000, Math.round(product.price / 100))}
                    value={amount}
                    onChange={e => setAmount(Number(e.target.value))}
                    className="w-full accent-[var(--bn-gold)]"
                    style={{ accentColor: BN.gold }}
                    aria-label="Taklif narxi"
                />
                <div className="flex justify-between text-[10px] mt-0.5" style={{ color: BN.text3 }}>
                    <span>{min.toLocaleString("uz-UZ")} so&apos;m</span>
                    <span>{max.toLocaleString("uz-UZ")} so&apos;m</span>
                </div>
            </div>

            {/* Statistika: % + ehtimol */}
            <div className="grid grid-cols-2 gap-2">
                <div className="rounded-xl px-3 py-2" style={{ background: BN.surfaceUp }}>
                    <div className="text-[10px]" style={{ color: BN.text3 }}>E&apos;londan</div>
                    <div className="text-[16px] font-black tabular-nums" style={{ color: pct >= 100 ? BN.ok : pct >= 85 ? BN.gold : BN.text }}>
                        {pct}%
                    </div>
                </div>
                <div className="rounded-xl px-3 py-2" style={{ background: BN.surfaceUp }}>
                    <div className="text-[10px]" style={{ color: BN.text3 }}>Qabul ehtimoli</div>
                    <div className="text-[16px] font-black tabular-nums"
                        style={{ color: successPct >= 60 ? BN.ok : successPct >= 30 ? BN.gold : BN.err }}>
                        {successPct}%
                    </div>
                </div>
            </div>

            {/* Ixtiyoriy izoh */}
            <textarea
                value={note}
                onChange={e => setNote(e.target.value)}
                placeholder="Ixtiyoriy izoh (nima uchun shu narxni taklif qilyapsiz)..."
                rows={2}
                maxLength={500}
                className="w-full px-3 py-2 rounded-xl text-[13px] resize-none focus:outline-none"
                style={{ background: BN.surfaceUp, border: `1px solid ${BN.border}`, color: BN.text }}
            />

            {/* Yuborish */}
            <button
                onClick={() => onSend(amount, note)}
                disabled={sending || amount < min}
                className="w-full h-11 rounded-xl text-[14px] font-black flex items-center justify-center gap-2 disabled:opacity-50 transition-transform active:scale-[0.98]"
                style={{ background: BN.gold, color: BN.onGold }}
            >
                {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                Taklif yuborish
            </button>
        </div>
    );
}
