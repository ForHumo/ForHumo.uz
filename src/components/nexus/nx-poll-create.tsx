"use client";

// DM'da so'rovnoma yaratish modali — Telegram uslubi.
// Foydalanuvchi so'rovi:
// "guruh va kanallarda telegramdagi so'ovnoma tuzish funksiyasi ka'bi
// yaratishimiz kerak" — guruh yo'q, DM'da boshladik.

import { useState } from "react";
import { X, Plus, Trash2, BarChart2, Loader2 } from "lucide-react";

interface Props {
    open: boolean;
    onClose: () => void;
    onCreated: (poll: {
        question: string;
        options: string[];
        expiresAt: string | null;
        multi: boolean;
    }) => Promise<void>;
}

const DURATIONS: { key: string; label: string; hours: number | null }[] = [
    { key: "1h", label: "1 soat", hours: 1 },
    { key: "24h", label: "24 soat", hours: 24 },
    { key: "72h", label: "3 kun", hours: 72 },
    { key: "168h", label: "7 kun", hours: 168 },
    { key: "none", label: "Cheklovsiz", hours: null },
];

export function NxPollCreate({ open, onClose, onCreated }: Props) {
    const [question, setQuestion] = useState("");
    const [options, setOptions] = useState<string[]>(["", ""]);
    const [duration, setDuration] = useState("24h");
    const [multi, setMulti] = useState(false);
    const [busy, setBusy] = useState(false);
    const [err, setErr] = useState<string | null>(null);

    if (!open) return null;

    const validOptions = options.map(o => o.trim()).filter(Boolean);
    const canSubmit = question.trim().length > 0 && validOptions.length >= 2 && !busy;

    async function submit() {
        if (!canSubmit) return;
        setBusy(true); setErr(null);
        try {
            const dur = DURATIONS.find(d => d.key === duration);
            const expiresAt = dur?.hours ? new Date(Date.now() + dur.hours * 3600_000).toISOString() : null;
            await onCreated({
                question: question.trim().slice(0, 300),
                options: validOptions.slice(0, 10),
                expiresAt,
                multi,
            });
            // Muvaffaqiyatli — modalni parent yopadi + tozalash
            setQuestion(""); setOptions(["", ""]); setDuration("24h"); setMulti(false);
        } catch (e) {
            setErr(e instanceof Error ? e.message : "Xato");
        } finally { setBusy(false); }
    }

    function addOption() {
        if (options.length >= 10) return;
        setOptions([...options, ""]);
    }
    function removeOption(i: number) {
        if (options.length <= 2) return;
        setOptions(options.filter((_, j) => j !== i));
    }
    function updateOption(i: number, val: string) {
        setOptions(options.map((o, j) => j === i ? val.slice(0, 100) : o));
    }

    return (
        <div className="fixed inset-0 z-[80] flex items-end sm:items-center justify-center p-0 sm:p-4"
            style={{ background: "rgba(5,8,24,0.85)", backdropFilter: "blur(12px)" }} onClick={onClose}>
            <div className="w-full sm:max-w-md rounded-t-3xl sm:rounded-3xl overflow-hidden"
                style={{ background: "rgba(11,16,40,0.98)", border: "1px solid rgba(43,62,232,0.22)", maxHeight: "90vh" }}
                onClick={e => e.stopPropagation()}>

                <div className="flex items-center gap-3 px-5 py-4" style={{ borderBottom: "1px solid rgba(43,62,232,0.14)" }}>
                    <BarChart2 className="w-5 h-5" style={{ color: "#00CEC8" }} />
                    <p className="text-base font-black text-white flex-1">Yangi so&apos;rovnoma</p>
                    <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-xl" style={{ background: "rgba(43,62,232,0.10)" }}>
                        <X className="w-4 h-4 text-white" />
                    </button>
                </div>

                <div className="p-5 space-y-4 overflow-y-auto" style={{ maxHeight: "calc(90vh - 130px)", scrollbarWidth: "none" }}>
                    {/* Savol */}
                    <div>
                        <label className="text-[10px] font-black uppercase tracking-widest mb-1.5 block" style={{ color: "rgba(140,160,210,0.75)" }}>Savol</label>
                        <input value={question} onChange={e => setQuestion(e.target.value.slice(0, 300))}
                            placeholder="Nima haqida so'rayapsiz?"
                            className="w-full px-3.5 py-3 rounded-xl text-sm text-white outline-none"
                            style={{ background: "rgba(43,62,232,0.08)", border: "1px solid rgba(43,62,232,0.22)", caretColor: "#00CEC8" }} />
                        <p className="text-[10px] mt-1 text-right" style={{ color: "rgba(140,160,210,0.60)" }}>{question.length}/300</p>
                    </div>

                    {/* Variantlar */}
                    <div>
                        <label className="text-[10px] font-black uppercase tracking-widest mb-1.5 block" style={{ color: "rgba(140,160,210,0.75)" }}>
                            Variantlar (2-10)
                        </label>
                        <div className="space-y-2">
                            {options.map((o, i) => (
                                <div key={i} className="flex gap-2">
                                    <input value={o} onChange={e => updateOption(i, e.target.value)}
                                        placeholder={`Variant ${i + 1}`}
                                        className="flex-1 px-3 py-2.5 rounded-lg text-sm text-white outline-none"
                                        style={{ background: "rgba(43,62,232,0.08)", border: "1px solid rgba(43,62,232,0.20)", caretColor: "#00CEC8" }} />
                                    {options.length > 2 && (
                                        <button onClick={() => removeOption(i)} title="O'chirish"
                                            className="w-10 flex items-center justify-center rounded-lg flex-shrink-0"
                                            style={{ background: "rgba(239,68,68,0.10)" }}>
                                            <Trash2 className="w-3.5 h-3.5" style={{ color: "#EF4444" }} />
                                        </button>
                                    )}
                                </div>
                            ))}
                            {options.length < 10 && (
                                <button onClick={addOption}
                                    className="w-full flex items-center justify-center gap-2 px-3 py-2.5 rounded-lg text-xs font-bold transition"
                                    style={{ background: "rgba(43,62,232,0.06)", border: "1px dashed rgba(43,62,232,0.30)", color: "rgba(140,160,210,0.85)" }}>
                                    <Plus className="w-3.5 h-3.5" /> Variant qo&apos;shish
                                </button>
                            )}
                        </div>
                    </div>

                    {/* Multi toggle */}
                    <button onClick={() => setMulti(!multi)}
                        className="w-full flex items-center justify-between px-3.5 py-3 rounded-xl transition"
                        style={{ background: "rgba(43,62,232,0.08)", border: "1px solid rgba(43,62,232,0.22)" }}>
                        <div className="text-left">
                            <p className="text-xs font-bold text-white">Bir necha variant tanlash</p>
                            <p className="text-[10px] mt-0.5" style={{ color: "rgba(140,160,210,0.70)" }}>
                                Yoqilsa: foydalanuvchi bir necha variant tanlashi mumkin
                            </p>
                        </div>
                        <div className="w-10 h-5 rounded-full relative flex-shrink-0 transition-colors"
                            style={{ background: multi ? "#00CEC8" : "rgba(80,100,150,0.4)" }}>
                            <div className="absolute top-0.5 w-4 h-4 rounded-full bg-white transition-all"
                                style={{ left: multi ? "22px" : "2px" }} />
                        </div>
                    </button>

                    {/* Muddat */}
                    <div>
                        <label className="text-[10px] font-black uppercase tracking-widest mb-1.5 block" style={{ color: "rgba(140,160,210,0.75)" }}>Muddat</label>
                        <div className="grid grid-cols-3 gap-1.5">
                            {DURATIONS.map(d => (
                                <button key={d.key} onClick={() => setDuration(d.key)}
                                    className="px-2 py-2 rounded-lg text-[11px] font-bold transition active:scale-95"
                                    style={duration === d.key
                                        ? { background: "linear-gradient(135deg,#2B3EE8,#00CEC8)", color: "#fff" }
                                        : { background: "rgba(43,62,232,0.08)", border: "1px solid rgba(43,62,232,0.20)", color: "rgba(160,180,230,0.85)" }}>
                                    {d.label}
                                </button>
                            ))}
                        </div>
                    </div>

                    {err && (
                        <p className="text-xs px-3 py-2 rounded-lg" style={{ background: "rgba(239,68,68,0.10)", color: "#EF4444" }}>{err}</p>
                    )}
                </div>

                <div className="px-5 py-3 flex gap-2" style={{ borderTop: "1px solid rgba(43,62,232,0.14)" }}>
                    <button onClick={onClose} disabled={busy}
                        className="flex-1 px-4 py-3 rounded-xl text-xs font-bold text-white disabled:opacity-50"
                        style={{ background: "rgba(43,62,232,0.10)" }}>
                        Bekor
                    </button>
                    <button onClick={submit} disabled={!canSubmit}
                        className="flex-1 px-4 py-3 rounded-xl text-xs font-black text-white disabled:opacity-40 flex items-center justify-center gap-2"
                        style={{ background: "linear-gradient(135deg,#2B3EE8,#00CEC8)" }}>
                        {busy && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                        Jo&apos;natish
                    </button>
                </div>
            </div>
        </div>
    );
}
