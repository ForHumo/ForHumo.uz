"use client";

// Katta stiker picker — Twemoji asosli.
// 128px stiker sifatida ko'rsatiladi (text emoji o'rniga).

import { useState } from "react";
import { X, Sticker } from "lucide-react";
import { Emoji } from "@/lib/twemoji";

const STICKER_SETS: Array<{ id: string; label: string; items: string[] }> = [
    { id: "faces", label: "Yuzlar", items: ["😀","😂","🥰","😍","😊","🤣","😎","😭","😘","🥺","😅","🤗","😴","🤔","😉","😳","🥳","😇","🙃","😌","😔","😤","😡","🤯","🤩","😱","🤪","😜","🤤","😷"] },
    { id: "hands",  label: "Qo'llar", items: ["👋","🤚","✋","👌","🤌","🤏","🤞","🤟","🤘","🤙","👈","👉","👆","👇","👍","👎","👊","✊","🤛","🤜","👏","🙌","🙏","💪","🫶","👐"] },
    { id: "heart",  label: "Yurak",  items: ["❤️","🧡","💛","💚","💙","💜","🖤","🤍","🤎","💔","❣️","💕","💞","💓","💗","💖","💘","💝","💟","❤️‍🔥"] },
    { id: "fun",    label: "Kayfiyat",items: ["🎉","🎊","🎁","🎂","🎈","🎆","🎇","✨","⭐","🌟","💫","🔥","💯","💥","💦","💤","🌈","☀️","🌙","⚡","💎","🏆","🥇","🎯"] },
    { id: "life",   label: "Hayot",  items: ["🌸","🌺","🌷","🌹","🌻","💐","🌱","🌲","🌳","🍀","☕","🍕","🍔","🍦","🍰","🍎","🍓","🍉","🥑","🥕","🍇","🍒","🍑","🍩"] },
    { id: "anim",   label: "Hayvon", items: ["🐶","🐱","🐰","🦊","🐻","🐼","🐯","🦁","🐨","🐮","🐷","🐸","🐵","🙈","🐔","🐣","🦄","🐝","🐢","🐬","🦋","🐟","🦉","🐺"] },
];

export function NxStickerPicker({
    open, onPick, onClose,
}: {
    open: boolean;
    onPick: (emoji: string) => void;
    onClose: () => void;
}) {
    const [tab, setTab] = useState("faces");
    if (!open) return null;
    const current = STICKER_SETS.find(s => s.id === tab)!;

    return (
        <>
            <div className="fixed inset-0 z-[400] bg-black/60" onClick={onClose} />
            <div className="fixed inset-x-4 bottom-20 md:inset-x-auto md:right-4 md:bottom-24 max-w-md mx-auto md:mx-0 md:w-96 z-[401] rounded-2xl overflow-hidden"
                style={{ background: "rgba(8,12,32,0.99)", border: "1px solid rgba(43,62,232,0.3)", boxShadow: "0 12px 32px rgba(0,0,0,0.4)" }}
                onClick={e => e.stopPropagation()}>
                <div className="flex items-center justify-between px-4 py-3"
                    style={{ borderBottom: "1px solid rgba(43,62,232,0.14)" }}>
                    <h3 className="text-sm font-black text-white flex items-center gap-2">
                        <Sticker className="w-4 h-4" style={{ color: "#00CEC8" }} /> Stikerlar
                    </h3>
                    <button onClick={onClose} className="w-7 h-7 rounded-md flex items-center justify-center hover:bg-white/5">
                        <X className="w-4 h-4 text-white" />
                    </button>
                </div>
                <div className="grid grid-cols-4 gap-2 p-3 max-h-[280px] overflow-y-auto" style={{ scrollbarWidth: "none" }}>
                    {current.items.map(s => (
                        <button key={s} onClick={() => onPick(s)}
                            className="aspect-square flex items-center justify-center rounded-xl hover:bg-white/5 transition active:scale-90">
                            <Emoji char={s} size={48} />
                        </button>
                    ))}
                </div>
                <div className="flex gap-1 px-2 py-2 overflow-x-auto"
                    style={{ borderTop: "1px solid rgba(43,62,232,0.14)", scrollbarWidth: "none" }}>
                    {STICKER_SETS.map(s => (
                        <button key={s.id} onClick={() => setTab(s.id)}
                            className="flex-shrink-0 px-2.5 py-1.5 rounded-lg text-[10px] font-bold whitespace-nowrap"
                            style={tab === s.id
                                ? { background: "rgba(0,206,200,0.15)", color: "#00CEC8" }
                                : { background: "transparent", color: "rgba(140,160,210,0.8)" }}>
                            {s.label}
                        </button>
                    ))}
                </div>
            </div>
        </>
    );
}
