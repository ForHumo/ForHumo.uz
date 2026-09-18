"use client";

// BN avto moslik tanlagich — sotuvchi qism qaysi mashinalarga to'g'ri kelishini belgilaydi.
// "Universal" (barcha mashina) yoki aniq marka/model ro'yxati + qism raqami.
// Native <select> ishlatilmaydi — styled modal (bn-category-picker naqshi).

import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { Car, Plus, X, Search, Check, Hash, Globe } from "lucide-react";
import { BN } from "@/lib/bn-theme";

export interface FitModel {
    modelId: string;
    makeName: string;
    modelName: string;
}

interface CatModel { id: string; slug: string; name: string; yearFrom: number | null; yearTo: number | null }
interface CatMake { id: string; slug: string; name: string; popular: boolean; models: CatModel[] }

interface Props {
    universalFit: boolean;
    onUniversalChange: (v: boolean) => void;
    fits: FitModel[];
    onFitsChange: (v: FitModel[]) => void;
    partNumber: string;
    onPartNumberChange: (v: string) => void;
    oemNumbers: string;
    onOemChange: (v: string) => void;
}

let catalogCache: CatMake[] | null = null;

export function BnFitSelector({
    universalFit, onUniversalChange, fits, onFitsChange,
    partNumber, onPartNumberChange, oemNumbers, onOemChange,
}: Props) {
    const [pickerOpen, setPickerOpen] = useState(false);

    return (
        <div className="rounded-2xl p-3.5 space-y-3" style={{ background: BN.surfaceUp, border: `1px solid ${BN.borderGold ?? BN.border}` }}>
            <div className="flex items-center gap-2">
                <Car className="w-4 h-4" style={{ color: BN.gold }} />
                <p className="text-[11px] font-black uppercase tracking-wider" style={{ color: BN.text3 }}>
                    Mashina mosligi
                </p>
            </div>

            {/* Qism raqami — avto qism qidiruvining eng muhim kaliti */}
            <div>
                <label className="flex items-center gap-1.5 text-[12px] font-semibold mb-1.5" style={{ color: BN.text2 }}>
                    <Hash className="w-3.5 h-3.5" style={{ color: BN.text3 }} /> Qism raqami (OEM)
                </label>
                <input
                    value={partNumber}
                    onChange={e => onPartNumberChange(e.target.value)}
                    placeholder="48510-80D50"
                    className="w-full h-11 rounded-xl px-3.5 text-[14px] tabular-nums"
                    style={{ background: BN.surface, border: `1px solid ${BN.border}`, color: "#fff" }}
                />
                <p className="text-[11px] mt-1" style={{ color: BN.text3 }}>Xaridorlar aynan shu raqam bo'yicha qidiradi. Bilmasangiz bo'sh qoldiring.</p>
            </div>

            {/* Analog raqamlar */}
            <div>
                <label className="text-[12px] font-semibold mb-1.5 block" style={{ color: BN.text2 }}>
                    Analog raqamlar (ixtiyoriy)
                </label>
                <input
                    value={oemNumbers}
                    onChange={e => onOemChange(e.target.value)}
                    placeholder="45022-SNA, D6019 — vergul bilan ajrating"
                    className="w-full h-11 rounded-xl px-3.5 text-[13px]"
                    style={{ background: BN.surface, border: `1px solid ${BN.border}`, color: "#fff" }}
                />
            </div>

            {/* Universal toggle */}
            <button
                type="button"
                onClick={() => onUniversalChange(!universalFit)}
                className="w-full flex items-center gap-2.5 h-11 px-3 rounded-xl text-left transition-colors"
                style={{
                    background: universalFit ? BN.goldSoft : BN.surface,
                    border: `1px solid ${universalFit ? BN.gold : BN.border}`,
                    color: universalFit ? BN.gold : BN.text2,
                }}
            >
                <Globe className="w-4 h-4 flex-shrink-0" />
                <span className="flex-1 text-[13px] font-semibold">Universal — barcha mashinaga to'g'ri keladi</span>
                {universalFit && <Check className="w-4 h-4 flex-shrink-0" />}
            </button>

            {/* Model tanlash — universal bo'lmasa */}
            {!universalFit && (
                <div>
                    <div className="flex flex-wrap gap-1.5 mb-2">
                        {fits.map(f => (
                            <span
                                key={f.modelId}
                                className="inline-flex items-center gap-1.5 h-8 pl-2.5 pr-1.5 rounded-full text-[12px] font-semibold"
                                style={{ background: BN.goldSoft, color: BN.gold, border: `1px solid ${BN.gold}` }}
                            >
                                {f.makeName} {f.modelName}
                                <button
                                    type="button"
                                    onClick={() => onFitsChange(fits.filter(x => x.modelId !== f.modelId))}
                                    aria-label="O'chirish"
                                    className="w-5 h-5 grid place-items-center rounded-full hover:bg-black/20"
                                >
                                    <X className="w-3 h-3" />
                                </button>
                            </span>
                        ))}
                    </div>
                    <button
                        type="button"
                        onClick={() => setPickerOpen(true)}
                        className="w-full flex items-center justify-center gap-2 h-11 rounded-xl text-[13px] font-black"
                        style={{ background: BN.surface, border: `1px dashed ${BN.border}`, color: BN.text2 }}
                    >
                        <Plus className="w-4 h-4" /> Mashina qo'shish
                    </button>
                    {fits.length === 0 && (
                        <p className="text-[11px] mt-1.5" style={{ color: BN.text3 }}>
                            Kamida bitta mashina belgilang — xaridor &quot;mening mashinam&quot; filtri orqali topadi.
                        </p>
                    )}
                </div>
            )}

            {pickerOpen && (
                <CarPickerModal
                    selectedIds={new Set(fits.map(f => f.modelId))}
                    onToggle={(m) => {
                        const exists = fits.some(f => f.modelId === m.modelId);
                        onFitsChange(exists ? fits.filter(f => f.modelId !== m.modelId) : [...fits, m]);
                    }}
                    onClose={() => setPickerOpen(false)}
                />
            )}
        </div>
    );
}

function CarPickerModal({
    selectedIds, onToggle, onClose,
}: {
    selectedIds: Set<string>;
    onToggle: (m: FitModel) => void;
    onClose: () => void;
}) {
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
            } catch { /* bo'sh qoladi */ }
            finally { if (alive) setLoading(false); }
        })();
        return () => { alive = false; };
    }, []);

    useEffect(() => {
        function onKey(e: KeyboardEvent) { if (e.key === "Escape") onClose(); }
        window.addEventListener("keydown", onKey);
        return () => window.removeEventListener("keydown", onKey);
    }, [onClose]);

    // Qidiruv — marka yoki model nomi bo'yicha (yassi ro'yxat)
    const searchResults = useMemo(() => {
        const s = q.trim().toLowerCase();
        if (!s) return null;
        const out: FitModel[] = [];
        for (const mk of makes) {
            for (const md of mk.models) {
                if (`${mk.name} ${md.name}`.toLowerCase().includes(s)) {
                    out.push({ modelId: md.id, makeName: mk.name, modelName: md.name });
                }
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
                    <div className="flex items-center justify-between mb-3">
                        <h2 className="text-[17px] font-black">Mashinani tanlang</h2>
                        <button onClick={onClose} className="w-8 h-8 grid place-items-center rounded-full hover:bg-white/10" style={{ color: BN.text3 }}>
                            <X className="w-4 h-4" />
                        </button>
                    </div>
                    <div className="relative">
                        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none" style={{ color: BN.text3 }} />
                        <input
                            autoFocus
                            value={q}
                            onChange={e => setQ(e.target.value)}
                            placeholder="Nexia, Cobalt, Damas..."
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
                        ) : (
                            searchResults.map(m => (
                                <ModelRow key={m.modelId} label={`${m.makeName} ${m.modelName}`} selected={selectedIds.has(m.modelId)} onClick={() => onToggle(m)} indent={false} />
                            ))
                        )
                    ) : (
                        makes.map(mk => {
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
                                        <span className="text-[12px]" style={{ color: BN.text3 }}>{mk.models.length}</span>
                                    </button>
                                    {isOpen && mk.models.map(md => (
                                        <ModelRow
                                            key={md.id}
                                            label={md.name}
                                            sub={md.yearFrom ? `${md.yearFrom}–${md.yearTo ?? "hozir"}` : undefined}
                                            selected={selectedIds.has(md.id)}
                                            onClick={() => onToggle({ modelId: md.id, makeName: mk.name, modelName: md.name })}
                                            indent
                                        />
                                    ))}
                                </div>
                            );
                        })
                    )}
                </div>

                <div className="p-3" style={{ borderTop: `1px solid ${BN.border}` }}>
                    <button
                        onClick={onClose}
                        className="w-full h-11 rounded-xl text-[14px] font-black"
                        style={{ background: BN.gold, color: BN.onGold }}
                    >
                        Tayyor
                    </button>
                </div>
            </div>
        </div>,
        document.body,
    );
}

function ModelRow({ label, sub, selected, onClick, indent }: { label: string; sub?: string; selected: boolean; onClick: () => void; indent: boolean }) {
    return (
        <button
            onClick={onClick}
            className="w-full flex items-center justify-between gap-2 h-11 rounded-xl text-[14px] text-left transition-colors"
            style={{
                background: selected ? BN.goldSoft : "transparent",
                color: selected ? BN.gold : "#fff",
                paddingLeft: indent ? 28 : 14,
                paddingRight: 14,
            }}
        >
            <span className="flex items-center gap-2">
                <span className="font-medium">{label}</span>
                {sub && <span className="text-[11px]" style={{ color: BN.text3 }}>{sub}</span>}
            </span>
            {selected && <Check className="w-4 h-4 flex-shrink-0" />}
        </button>
    );
}
