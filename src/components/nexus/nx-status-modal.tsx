"use client";

// Maxsus status tanlash modali — Lucide icon + matn + amal muddati.
// Emoji ISHLATILMAYDI (CLAUDE.md qoidasi) — hamma joyda minimalist Lucide icon'lar.

import { useState } from "react";
import {
    X, Loader2, Trash2,
    Laptop, Gamepad2, Headphones, BookOpen, Dumbbell, UtensilsCrossed,
    Moon, Car, Film, ThermometerSun, Palmtree, Briefcase,
    type LucideIcon,
} from "lucide-react";

interface Preset {
    key: string;
    icon: LucideIcon;
    text: string;
    mins?: number;
    color: string;
}

const PRESETS: Preset[] = [
    { key: "work",      icon: Laptop,           text: "Ishda",              mins: 8 * 60,       color: "#60A5FA" },
    { key: "gaming",    icon: Gamepad2,         text: "O'yinda",            mins: 60,           color: "#A78BFA" },
    { key: "music",     icon: Headphones,       text: "Musiqa tinglayapman",                    color: "#F59E0B" },
    { key: "read",      icon: BookOpen,         text: "O'qiyapman",         mins: 60,           color: "#10B981" },
    { key: "sport",     icon: Dumbbell,         text: "Sport zalida",       mins: 90,           color: "#EF4444" },
    { key: "eating",    icon: UtensilsCrossed,  text: "Ovqatlanmoqda",      mins: 30,           color: "#F97316" },
    { key: "sleep",     icon: Moon,             text: "Uxlayapman",                             color: "#818CF8" },
    { key: "driving",   icon: Car,              text: "Yo'ldaman",                              color: "#06B6D4" },
    { key: "film",      icon: Film,             text: "Film ko'ryapman",                        color: "#EC4899" },
    { key: "sick",      icon: ThermometerSun,   text: "Kasal",              mins: 24 * 60,      color: "#F43F5E" },
    { key: "vacation",  icon: Palmtree,         text: "Ta'tilda",           mins: 7 * 24 * 60,  color: "#14B8A6" },
    { key: "busy",      icon: Briefcase,        text: "Bandman",                                color: "#94A3B8" },
];

interface Props {
    initialEmoji?: string | null;  // BC: backend'da emoji ustunligi bor edi — endi statusKey saqlaymiz
    initialText?: string | null;
    onClose: () => void;
    onSaved: (emoji: string | null, text: string | null) => void;
}

export function NxStatusModal({ initialEmoji, initialText, onClose, onSaved }: Props) {
    // Boshlang'ich preset key'ni matn bo'yicha topamiz
    const initialKey = PRESETS.find(p => p.text === initialText)?.key ?? null;
    const [selectedKey, setSelectedKey] = useState<string | null>(initialKey);
    const [text, setText] = useState(initialText ?? "");
    const [mins, setMins] = useState<number | null>(null);
    const [busy, setBusy] = useState(false);
    const [err, setErr] = useState<string | null>(null);

    const selected = selectedKey ? PRESETS.find(p => p.key === selectedKey) : null;
    const SelectedIcon = selected?.icon ?? Briefcase;
    void initialEmoji; // BC — endi ishlatilmaydi

    async function save() {
        if (!selectedKey && !text.trim()) { setErr("Icon yoki matn tanlang"); return; }
        setBusy(true);
        setErr(null);
        try {
            // BC — backend'da hozircha emoji ustuni bor, statusKey'ni emoji'ga o'rniga yozamiz
            // (frontend har xil joyda emoji o'rniga icon ko'rsatishga qarab moslashadi)
            const r = await fetch("/api/user/status", {
                method: "POST", headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    emoji: selectedKey ? `:${selectedKey}:` : undefined,
                    text: text.trim() || undefined,
                    expiresInMinutes: mins ?? 0,
                }),
            });
            const d = await r.json().catch(() => ({}));
            if (r.ok) { onSaved(selectedKey ? `:${selectedKey}:` : null, text.trim() || null); onClose(); }
            else setErr(d?.error ?? "Saqlab bo'lmadi");
        } finally { setBusy(false); }
    }
    async function clearStatus() {
        setBusy(true);
        try {
            await fetch("/api/user/status", { method: "DELETE" });
            onSaved(null, null); onClose();
        } finally { setBusy(false); }
    }

    return (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4"
            style={{ background: "rgba(3,7,25,0.75)", backdropFilter: "blur(6px)" }}
            onClick={() => !busy && onClose()}>
            <div onClick={e => e.stopPropagation()}
                className="w-full max-w-md rounded-2xl overflow-hidden flex flex-col"
                style={{ background: "#0B1228", border: "1px solid rgba(43,62,232,0.30)", maxHeight: "85vh" }}>
                <div className="p-4 flex items-center justify-between border-b" style={{ borderColor: "rgba(43,62,232,0.20)" }}>
                    <p className="text-sm font-black" style={{ color: "rgba(220,230,255,0.95)" }}>Maxsus status</p>
                    <button onClick={onClose} disabled={busy}
                        className="w-7 h-7 rounded-md flex items-center justify-center hover:bg-white/[0.06]">
                        <X className="w-4 h-4" style={{ color: "rgba(160,176,224,0.85)" }} />
                    </button>
                </div>

                <div className="p-4 space-y-3 overflow-y-auto">
                    <div className="flex gap-2">
                        <div className="w-14 h-11 flex items-center justify-center rounded-lg flex-shrink-0"
                            style={{ background: "rgba(43,62,232,0.08)", border: "1px solid rgba(43,62,232,0.30)" }}>
                            <SelectedIcon className="w-5 h-5" style={{ color: selected?.color ?? "rgba(160,176,224,0.85)" }} />
                        </div>
                        <input value={text} onChange={e => setText(e.target.value.slice(0, 60))}
                            placeholder="Nima qilyapsiz..."
                            className="flex-1 h-11 px-3 rounded-lg bg-transparent text-white text-sm focus:outline-none"
                            style={{ border: "1px solid rgba(43,62,232,0.30)" }} />
                    </div>

                    <div>
                        <p className="text-[10px] font-bold uppercase tracking-wider mb-1.5" style={{ color: "rgba(140,160,210,0.65)" }}>Qancha vaqt</p>
                        <div className="flex flex-wrap gap-1.5">
                            {[
                                { m: null, label: "Doimiy" },
                                { m: 30, label: "30 daq" },
                                { m: 60, label: "1 soat" },
                                { m: 4 * 60, label: "4 soat" },
                                { m: 24 * 60, label: "Bugun" },
                                { m: 7 * 24 * 60, label: "Hafta" },
                            ].map(o => (
                                <button key={o.label} onClick={() => setMins(o.m)}
                                    className="text-[11px] font-bold px-2.5 py-1 rounded-full transition"
                                    style={{
                                        background: mins === o.m ? "rgba(0,206,200,0.20)" : "rgba(43,62,232,0.08)",
                                        border: `1px solid ${mins === o.m ? "rgba(0,206,200,0.50)" : "rgba(43,62,232,0.20)"}`,
                                        color: mins === o.m ? "#00CEC8" : "rgba(220,230,255,0.85)",
                                    }}>
                                    {o.label}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div>
                        <p className="text-[10px] font-bold uppercase tracking-wider mb-1.5" style={{ color: "rgba(140,160,210,0.65)" }}>Tayyor variantlar</p>
                        <div className="grid grid-cols-2 gap-1.5">
                            {PRESETS.map(p => {
                                const isActive = selectedKey === p.key;
                                const Icon = p.icon;
                                return (
                                    <button key={p.key} onClick={() => {
                                        setSelectedKey(p.key); setText(p.text);
                                        if (typeof p.mins === "number") setMins(p.mins);
                                    }}
                                        className="flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-left transition"
                                        style={{
                                            background: isActive ? "rgba(0,206,200,0.10)" : "rgba(43,62,232,0.06)",
                                            border: `1px solid ${isActive ? "rgba(0,206,200,0.40)" : "rgba(43,62,232,0.15)"}`,
                                        }}>
                                        <Icon className="w-4 h-4 flex-shrink-0" style={{ color: p.color }} />
                                        <span className="text-xs truncate" style={{ color: isActive ? "#00CEC8" : "rgba(220,230,255,0.90)" }}>
                                            {p.text}
                                        </span>
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    {err && <p className="text-[11px] font-bold" style={{ color: "#EF4444" }}>{err}</p>}
                </div>

                <div className="p-4 border-t flex gap-2" style={{ borderColor: "rgba(43,62,232,0.20)" }}>
                    {(initialEmoji || initialText) && (
                        <button onClick={clearStatus} disabled={busy}
                            title="Statusni o'chirish"
                            className="w-10 h-10 rounded-lg flex items-center justify-center"
                            style={{ background: "rgba(239,68,68,0.10)", border: "1px solid rgba(239,68,68,0.30)" }}>
                            <Trash2 className="w-4 h-4" style={{ color: "#EF4444" }} />
                        </button>
                    )}
                    <button onClick={onClose} disabled={busy}
                        className="flex-1 h-10 rounded-lg text-sm font-black"
                        style={{ background: "rgba(11,18,40,0.85)", color: "#fff", border: "1px solid rgba(43,62,232,0.30)" }}>
                        Bekor
                    </button>
                    <button onClick={save} disabled={busy || (!selectedKey && !text.trim())}
                        className="flex-1 h-10 rounded-lg text-sm font-black text-white disabled:opacity-40 flex items-center justify-center gap-2"
                        style={{ background: "linear-gradient(135deg,#2B3EE8,#00CEC8)" }}>
                        {busy && <Loader2 className="w-4 h-4 animate-spin" />}
                        Saqlash
                    </button>
                </div>
            </div>
        </div>
    );
}

// Status key'dan icon topish (sidebar status ko'rsatkichi uchun)
export function statusIconForKey(key: string | null | undefined): LucideIcon | null {
    if (!key) return null;
    const k = key.replace(/^:|:$/g, "");
    return PRESETS.find(p => p.key === k)?.icon ?? null;
}
export function statusColorForKey(key: string | null | undefined): string | null {
    if (!key) return null;
    const k = key.replace(/^:|:$/g, "");
    return PRESETS.find(p => p.key === k)?.color ?? null;
}
