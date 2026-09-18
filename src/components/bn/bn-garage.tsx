"use client";

// BN "Mening mashinam" (garaj) — xaridor mashinasini tanlaydi, avto qismlar
// unga to'g'ri kelishi bo'yicha filtrlanadi. localStorage'da saqlanadi (bitta mashina).
// Native <select> ishlatilmaydi — styled modal.

import { useCallback, useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { Car, ChevronDown, X, Search, Check, Trash2 } from "lucide-react";
import { BN } from "@/lib/bn-theme";

export interface GarageCar {
    modelId: string;
    makeName: string;
    modelName: string;
}

const KEY = "bn-garage-v1";

// ── Hook: garaj holati (localStorage) ────────────────────────────────────────
export function useGarage() {
    const [car, setCar] = useState<GarageCar | null>(null);
    const [ready, setReady] = useState(false);

    useEffect(() => {
        try {
            const raw = localStorage.getItem(KEY);
            if (raw) {
                const v = JSON.parse(raw);
                if (v?.modelId) setCar(v);
            }
        } catch { /* private mode / bloklangan */ }
        setReady(true);
    }, []);

    const save = useCallback((c: GarageCar | null) => {
        setCar(c);
        try {
            if (c) localStorage.setItem(KEY, JSON.stringify(c));
            else localStorage.removeItem(KEY);
        } catch { /* fail-safe */ }
    }, []);

    return { car, setCar: save, ready };
}

interface CatModel { id: string; slug: string; name: string; yearFrom: number | null; yearTo: number | null }
interface CatMake { id: string; slug: string; name: string; popular: boolean; models: CatModel[] }

// ── Garaj paneli ─────────────────────────────────────────────────────────────
export function BnGarageBar({ car, onChange }: { car: GarageCar | null; onChange: (c: GarageCar | null) => void }) {
    const [open, setOpen] = useState(false);

    return (
        <div
            className="flex items-center gap-2.5 rounded-2xl p-2.5 mb-4"
            style={{ background: car ? BN.goldSoft : BN.surface, border: `1px solid ${car ? BN.gold : BN.border}` }}
        >
            <div className="w-9 h-9 grid place-items-center rounded-xl flex-shrink-0" style={{ background: car ? BN.gold : BN.surfaceUp, color: car ? BN.onGold : BN.text3 }}>
                <Car className="w-5 h-5" strokeWidth={2.2} />
            </div>
            <div className="flex-1 min-w-0">
                <p className="text-[11px] font-bold uppercase tracking-wider" style={{ color: car ? BN.gold : BN.text3 }}>
                    Mening mashinam
                </p>
                <p className="text-[14px] font-black truncate" style={{ color: car ? BN.gold : BN.text2 }}>
                    {car ? `${car.makeName} ${car.modelName}` : "Tanlanmagan — barcha qismlar"}
                </p>
            </div>
            {car && (
                <button
                    type="button"
                    onClick={() => onChange(null)}
                    aria-label="Tozalash"
                    className="w-9 h-9 grid place-items-center rounded-xl flex-shrink-0"
                    style={{ background: BN.surface, color: BN.text3 }}
                >
                    <Trash2 className="w-4 h-4" />
                </button>
            )}
            <button
                type="button"
                onClick={() => setOpen(true)}
                className="flex items-center gap-1.5 h-9 px-3.5 rounded-xl text-[13px] font-black flex-shrink-0"
                style={{ background: car ? BN.surface : BN.gold, color: car ? BN.text : BN.onGold, border: car ? `1px solid ${BN.border}` : "none" }}
            >
                {car ? "O'zgartirish" : "Tanlash"}
                <ChevronDown className="w-4 h-4" />
            </button>

            {open && (
                <GaragePicker
                    current={car?.modelId ?? null}
                    onSelect={(c) => { onChange(c); setOpen(false); }}
                    onClose={() => setOpen(false)}
                />
            )}
        </div>
    );
}

let catalogCache: CatMake[] | null = null;

function GaragePicker({ current, onSelect, onClose }: { current: string | null; onSelect: (c: GarageCar) => void; onClose: () => void }) {
    const [makes, setMakes] = useState<CatMake[]>(catalogCache ?? []);
    const [loading, setLoading] = useState(!catalogCache);
    const [q, setQ] = useState("");
    const [openMake, setOpenMake] = useState<string | null>(null);

    useEffect(() => {
        if (catalogCache) return;
        let alive = true;
        (async () => {
            try {
                const r = await fetch("/api/bn/cars");
                const d = await r.json();
                if (!alive) return;
                catalogCache = d.makes ?? [];
                setMakes(catalogCache!);
            } catch { /* bo'sh */ }
            finally { if (alive) setLoading(false); }
        })();
        return () => { alive = false; };
    }, []);

    useEffect(() => {
        function onKey(e: KeyboardEvent) { if (e.key === "Escape") onClose(); }
        window.addEventListener("keydown", onKey);
        return () => window.removeEventListener("keydown", onKey);
    }, [onClose]);

    const searchResults = useMemo(() => {
        const s = q.trim().toLowerCase();
        if (!s) return null;
        const out: GarageCar[] = [];
        for (const mk of makes) for (const md of mk.models) {
            if (`${mk.name} ${md.name}`.toLowerCase().includes(s)) {
                out.push({ modelId: md.id, makeName: mk.name, modelName: md.name });
            }
        }
        return out.slice(0, 40);
    }, [q, makes]);

    if (typeof document === "undefined") return null;
    return createPortal(
        <div
            className="bn-overlay-in fixed inset-0 z-[300] flex items-end sm:items-center justify-center p-0 sm:p-4"
            style={{ background: "rgba(0,0,0,0.7)", backdropFilter: "blur(6px)" }}
            onClick={onClose}
        >
            <div
                className="bn-sheet-in w-full sm:max-w-[520px] max-h-[85vh] flex flex-col rounded-t-3xl sm:rounded-3xl overflow-hidden"
                style={{ background: BN.surface, border: `1px solid ${BN.border}` }}
                onClick={e => e.stopPropagation()}
            >
                <div className="p-4 pb-3" style={{ borderBottom: `1px solid ${BN.border}` }}>
                    <div className="flex items-center justify-between mb-1">
                        <h2 className="text-[17px] font-black">Mashinangizni tanlang</h2>
                        <button onClick={onClose} className="w-8 h-8 grid place-items-center rounded-full hover:bg-white/10" style={{ color: BN.text3 }}>
                            <X className="w-4 h-4" />
                        </button>
                    </div>
                    <p className="text-[12px] mb-3" style={{ color: BN.text3 }}>Faqat mashinangizga to'g'ri keladigan qismlar ko'rsatiladi.</p>
                    <div className="relative">
                        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none" style={{ color: BN.text3 }} />
                        <input
                            autoFocus
                            value={q}
                            onChange={e => setQ(e.target.value)}
                            placeholder="Nexia, Cobalt, Spark..."
                            className="w-full h-11 pl-10 pr-3 rounded-xl text-[14px] outline-none"
                            style={{ background: BN.surfaceUp, border: `1px solid ${BN.border}`, color: "#fff" }}
                        />
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto p-2">
                    {loading ? (
                        <div className="p-8 text-center text-[13px]" style={{ color: BN.text3 }}>Yuklanmoqda...</div>
                    ) : searchResults ? (
                        searchResults.length === 0 ? (
                            <div className="p-8 text-center text-[13px]" style={{ color: BN.text3 }}>Topilmadi</div>
                        ) : searchResults.map(m => (
                            <Row key={m.modelId} label={`${m.makeName} ${m.modelName}`} selected={m.modelId === current} onClick={() => onSelect(m)} indent={false} />
                        ))
                    ) : makes.map(mk => {
                        const isOpen = openMake === mk.slug;
                        return (
                            <div key={mk.id}>
                                <button
                                    onClick={() => setOpenMake(isOpen ? null : mk.slug)}
                                    className="w-full flex items-center justify-between gap-2 h-11 px-3 rounded-xl text-[14px] font-bold text-left hover:bg-white/5"
                                >
                                    <span className="flex items-center gap-2">
                                        {mk.name}
                                        {mk.popular && <span className="text-[10px] px-1.5 py-0.5 rounded-full" style={{ background: BN.goldSoft, color: BN.gold }}>ommabop</span>}
                                    </span>
                                    <ChevronDown className="w-4 h-4 transition-transform" style={{ color: BN.text3, transform: isOpen ? "rotate(180deg)" : undefined }} />
                                </button>
                                {isOpen && mk.models.map(md => (
                                    <Row
                                        key={md.id}
                                        label={md.name}
                                        sub={md.yearFrom ? `${md.yearFrom}–${md.yearTo ?? "hozir"}` : undefined}
                                        selected={md.id === current}
                                        onClick={() => onSelect({ modelId: md.id, makeName: mk.name, modelName: md.name })}
                                        indent
                                    />
                                ))}
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>,
        document.body,
    );
}

function Row({ label, sub, selected, onClick, indent }: { label: string; sub?: string; selected: boolean; onClick: () => void; indent: boolean }) {
    return (
        <button
            onClick={onClick}
            className="w-full flex items-center justify-between gap-2 h-11 rounded-xl text-[14px] text-left transition-colors"
            style={{ background: selected ? BN.goldSoft : "transparent", color: selected ? BN.gold : "#fff", paddingLeft: indent ? 28 : 14, paddingRight: 14 }}
        >
            <span className="flex items-center gap-2">
                <span className="font-medium">{label}</span>
                {sub && <span className="text-[11px]" style={{ color: BN.text3 }}>{sub}</span>}
            </span>
            {selected && <Check className="w-4 h-4 flex-shrink-0" />}
        </button>
    );
}
