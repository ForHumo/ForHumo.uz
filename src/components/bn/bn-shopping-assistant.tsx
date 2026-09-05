"use client";

// AI xarid yordamchi - suzuvchi tugma + modal.
// Xaridor tabiiy tilda yozadi ("arzon 5kg guruch"), AI mahsulotlarni ko'rsatadi.

import { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { Sparkles, X, Send, Loader2, ShoppingBag } from "lucide-react";
import { BN, fmtPrice } from "@/lib/bn-theme";
import { BnLink } from "./bn-nav";

interface Product {
    id: string; slug: string; title: string;
    price: number; oldPrice: number | null; marketAvgPrice: number | null;
    images: string[]; rating: number; ratingCount: number;
    shop: { name: string; city: string } | null;
}

interface Resp {
    ok: boolean;
    reply?: string;
    products?: Product[];
    error?: string;
    message?: string;
}

const EXAMPLES = [
    "Arzon 5kg guruch",
    "Sifatli olma",
    "Bolalar kiyimi 100 mingdan arzon",
    "Uy uchun kerakli mahsulotlar",
];

export function BnShoppingAssistant() {
    const [open, setOpen] = useState(false);
    const [text, setText] = useState("");
    const [busy, setBusy] = useState(false);
    const [resp, setResp] = useState<Resp | null>(null);
    const [mounted, setMounted] = useState(false);
    const inputRef = useRef<HTMLInputElement>(null);

    useEffect(() => { setMounted(true); }, []);
    useEffect(() => {
        if (open && inputRef.current) inputRef.current.focus();
    }, [open]);

    const search = async (q?: string) => {
        const query = (q ?? text).trim();
        if (!query || busy) return;
        if (q) setText(q);
        setBusy(true); setResp(null);
        try {
            const r = await fetch("/api/bn/shopping-assistant", {
                method: "POST", headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ text: query }),
            });
            const j: Resp = await r.json();
            setResp(j);
        } catch {
            setResp({ ok: false, message: "Tarmoq xatosi" });
        } finally {
            setBusy(false);
        }
    };

    if (!mounted) return null;

    if (!open) {
        return createPortal(
            <button onClick={() => setOpen(true)}
                title="AI xarid yordam"
                className="fixed bottom-24 left-4 z-[500] h-11 pl-3 pr-4 rounded-full inline-flex items-center gap-2 shadow-2xl hover:scale-105 transition-transform"
                style={{ background: BN.gold, color: BN.onGold, boxShadow: BN.shadow }}>
                <Sparkles className="w-4 h-4" />
                <span className="text-[13px] font-black">Nima izlaysiz?</span>
            </button>,
            document.body,
        );
    }

    return createPortal(
        <div className="fixed inset-0 z-[1000] flex items-end sm:items-center justify-center p-0 sm:p-4"
            style={{ background: "rgba(0,0,0,0.7)" }}
            onClick={() => setOpen(false)}>
            <div onClick={e => e.stopPropagation()}
                className="w-full sm:max-w-2xl max-h-[90vh] rounded-t-3xl sm:rounded-3xl overflow-hidden flex flex-col"
                style={{ background: BN.surface, border: `1px solid ${BN.borderGold}` }}>
                {/* Header */}
                <div className="flex items-center gap-2 px-4 py-3 border-b" style={{ borderColor: BN.border }}>
                    <span className="w-9 h-9 rounded-xl grid place-items-center flex-shrink-0"
                        style={{ background: BN.gold, color: BN.onGold }}>
                        <Sparkles className="w-4 h-4" />
                    </span>
                    <div className="flex-1 min-w-0">
                        <p className="text-[14px] font-black" style={{ color: BN.text }}>AI xarid yordamchi</p>
                        <p className="text-[11px]" style={{ color: BN.text3 }}>O'zbekcha yozing — men topaman</p>
                    </div>
                    <button onClick={() => setOpen(false)}
                        className="w-9 h-9 rounded-lg grid place-items-center hover:brightness-95"
                        style={{ color: BN.text2 }}>
                        <X className="w-4 h-4" />
                    </button>
                </div>

                {/* Input */}
                <form onSubmit={e => { e.preventDefault(); search(); }}
                    className="p-3 border-b flex items-center gap-2" style={{ borderColor: BN.border }}>
                    <input ref={inputRef}
                        value={text} onChange={e => setText(e.target.value)}
                        placeholder="Masalan: arzon 5kg guruch"
                        disabled={busy} maxLength={400}
                        className="flex-1 h-11 px-3 rounded-xl text-[14px]"
                        style={{ background: BN.surfaceUp, border: `1px solid ${BN.border}`, color: BN.text }} />
                    <button type="submit" disabled={busy || !text.trim()}
                        className="h-11 w-11 rounded-xl grid place-items-center disabled:opacity-40 hover:brightness-95"
                        style={{ background: BN.gold, color: BN.onGold }}>
                        {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                    </button>
                </form>

                {/* Misollar */}
                {!resp && !busy && (
                    <div className="px-4 py-3 border-b" style={{ borderColor: BN.border }}>
                        <p className="text-[11px] font-black uppercase tracking-wider mb-2" style={{ color: BN.text3 }}>
                            Misol so'rovlar
                        </p>
                        <div className="flex flex-wrap gap-1.5">
                            {EXAMPLES.map(ex => (
                                <button key={ex} onClick={() => search(ex)}
                                    className="h-8 px-3 rounded-lg text-[12px] font-bold hover:brightness-95"
                                    style={{ background: BN.surfaceUp, color: BN.text2, border: `1px solid ${BN.border}` }}>
                                    {ex}
                                </button>
                            ))}
                        </div>
                    </div>
                )}

                {/* Natijalar */}
                <div className="flex-1 overflow-y-auto p-4">
                    {busy && (
                        <div className="flex flex-col items-center justify-center py-10">
                            <Loader2 className="w-6 h-6 animate-spin mb-2" style={{ color: BN.gold }} />
                            <p className="text-[12px]" style={{ color: BN.text3 }}>AI qidiryapti…</p>
                        </div>
                    )}

                    {resp && resp.reply && (
                        <div className="mb-3 p-3 rounded-xl flex items-start gap-2"
                            style={{ background: BN.goldSoft, border: `1px solid ${BN.borderGold}` }}>
                            <Sparkles className="w-4 h-4 flex-shrink-0 mt-0.5" style={{ color: BN.gold }} />
                            <p className="text-[13px] font-bold" style={{ color: BN.text }}>{resp.reply}</p>
                        </div>
                    )}

                    {resp && resp.message && !resp.reply && (
                        <div className="text-center py-8">
                            <p className="text-[13px]" style={{ color: BN.text2 }}>{resp.message}</p>
                        </div>
                    )}

                    {resp && resp.products && resp.products.length === 0 && (
                        <div className="text-center py-8">
                            <ShoppingBag className="w-10 h-10 mx-auto mb-2 opacity-40" style={{ color: BN.text3 }} />
                            <p className="text-[13px]" style={{ color: BN.text2 }}>Mos mahsulot topilmadi. Boshqacha yozing.</p>
                        </div>
                    )}

                    {resp && resp.products && resp.products.length > 0 && (
                        <div className="grid grid-cols-2 gap-2">
                            {resp.products.map(p => {
                                const saving = p.oldPrice && p.oldPrice > p.price ? Math.round(((p.oldPrice - p.price) / p.oldPrice) * 100) : 0;
                                return (
                                    <BnLink key={p.id} href={`/p/${p.slug}`}
                                        onClick={() => setOpen(false)}
                                        className="rounded-xl overflow-hidden hover:brightness-95 transition"
                                        style={{ background: BN.surfaceUp, border: `1px solid ${BN.border}` }}>
                                        <div className="w-full aspect-square overflow-hidden" style={{ background: BN.surface }}>
                                            {p.images[0] && (
                                                // eslint-disable-next-line @next/next/no-img-element
                                                <img src={p.images[0]} alt="" className="w-full h-full object-cover" />
                                            )}
                                        </div>
                                        <div className="p-2">
                                            <p className="text-[12px] font-bold line-clamp-2" style={{ color: BN.text }}>{p.title}</p>
                                            <div className="flex items-baseline gap-1.5 mt-1">
                                                <p className="text-[13px] font-black" style={{ color: BN.gold }}>{fmtPrice(p.price)}</p>
                                                {saving > 0 && (
                                                    <span className="text-[9.5px] font-black px-1 rounded"
                                                        style={{ background: BN.ok, color: "#fff" }}>-{saving}%</span>
                                                )}
                                            </div>
                                            {p.shop && (
                                                <p className="text-[10.5px] mt-0.5 truncate" style={{ color: BN.text3 }}>{p.shop.name}</p>
                                            )}
                                        </div>
                                    </BnLink>
                                );
                            })}
                        </div>
                    )}
                </div>
            </div>
        </div>,
        document.body,
    );
}
