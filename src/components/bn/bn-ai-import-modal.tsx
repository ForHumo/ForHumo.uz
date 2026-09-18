"use client";

// AI import — sotuvchi ixtiyoriy Excel/CSV faylini yuklaydi, AI uni tushunib
// mahsulotlarga aylantiradi (bizning shablonga majburlamaydi). Valyuta aniqlanadi
// (yuan tannarx), sotuvchi kurs+ustama qo'yadi, tahrirlaydi va joylaydi.

import { useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { Upload, X, Loader2, Sparkles, Check, AlertTriangle, Car, Hash } from "lucide-react";
import { BN } from "@/lib/bn-theme";
import { bnToast } from "./bn-toast";
import { BnCategoryPicker, type CatItem } from "./bn-category-picker";

interface PreviewProduct {
    title: string;
    partNumber: string | null;
    oemNumbers: string[];
    priceOriginal: number;
    stock: number;
    categorySlug: string;
    categoryName: string;
    note: string;
    fits: { modelId: string; label: string }[];
    matchedModels: string[];
    universalFit: boolean;
}

interface Row extends PreviewProduct {
    include: boolean;
    som: number;          // yakuniy so'm narxi (kurs bilan hisoblangan yoki qo'lda)
    overridden: boolean;  // sotuvchi narxni qo'lda o'zgartirganmi
}

// Valyuta uchun boshlang'ich kurs (1 birlik = X so'm, ustama bilan taxminiy)
const DEFAULT_RATE: Record<string, number> = { CNY: 2000, USD: 12900, UZS: 1 };
const CUR_LABEL: Record<string, string> = { CNY: "yuan (￥)", USD: "dollar ($)", UZS: "so'm" };

export function BnAiImportModal({
    categories, onClose, onDone,
}: {
    categories: CatItem[];
    onClose: () => void;
    onDone: () => void;
}) {
    const [phase, setPhase] = useState<"upload" | "loading" | "preview" | "committing" | "done">("upload");
    const [currency, setCurrency] = useState("CNY");
    const [rate, setRate] = useState(DEFAULT_RATE.CNY);
    const [rows, setRows] = useState<Row[]>([]);
    const [defaultCat, setDefaultCat] = useState("");
    const [truncated, setTruncated] = useState(false);
    const [err, setErr] = useState<string | null>(null);
    const [result, setResult] = useState<{ ok: number; err: number } | null>(null);

    const includedRows = useMemo(() => rows.filter(r => r.include), [rows]);

    async function onFile(file: File) {
        setErr(null); setPhase("loading");
        try {
            const fd = new FormData();
            fd.append("file", file);
            const r = await fetch("/api/bn/seller/products/import", { method: "POST", body: fd });
            const d = await r.json();
            if (!r.ok || !d?.ok) {
                const map: Record<string, string> = {
                    ai_unavailable: "AI hozircha mavjud emas",
                    rate_limited: "Juda ko'p so'rov — biroz kutib qayta urining",
                    file_too_big: "Fayl juda katta (maks 5MB)",
                    no_file: "Fayl topilmadi",
                    parse_failed: "Faylni o'qib bo'lmadi (xlsx yoki csv yuklang)",
                    no_rows: "Faylda ma'lumot yo'q",
                    ai_no_result: "AI mahsulot ajrata olmadi — fayl formatini tekshiring",
                };
                setErr(map[d?.error] ?? "Xatolik yuz berdi");
                setPhase("upload");
                return;
            }
            const cur = String(d.currency || "CNY").toUpperCase();
            const rt = DEFAULT_RATE[cur] ?? 1;
            setCurrency(cur);
            setRate(rt);
            setTruncated(!!d.truncated);
            setRows((d.products as PreviewProduct[]).map(p => ({
                ...p,
                include: true,
                som: Math.round(p.priceOriginal * rt),
                overridden: false,
            })));
            setPhase("preview");
        } catch {
            setErr("Ulanish xatoligi");
            setPhase("upload");
        }
    }

    // Kurs o'zgarsa — qo'lda tahrirlanmagan narxlarni qayta hisoblash
    function applyRate(newRate: number) {
        setRate(newRate);
        setRows(prev => prev.map(r => r.overridden ? r : { ...r, som: Math.round(r.priceOriginal * newRate) }));
    }

    function patchRow(i: number, patch: Partial<Row>) {
        setRows(prev => prev.map((r, idx) => idx === i ? { ...r, ...patch } : r));
    }

    async function commit() {
        const toSend = includedRows.filter(r => r.som >= 1000 && r.title.trim().length >= 3);
        if (toSend.length === 0) {
            bnToast("Joylanadigan mahsulot yo'q (narx ≥ 1000 va nom kerak)", "error");
            return;
        }
        setPhase("committing"); setErr(null);
        try {
            const r = await fetch("/api/bn/seller/products/bulk", {
                method: "POST",
                headers: { "content-type": "application/json" },
                body: JSON.stringify({
                    mode: "commit",
                    defaultCategorySlug: defaultCat || undefined,
                    rows: toSend.map(row => ({
                        title: row.title.trim(),
                        price: row.som,
                        stock: row.stock,
                        categorySlug: row.categorySlug || defaultCat || "",
                        partNumber: row.partNumber,
                        oemNumbers: row.oemNumbers,
                        universalFit: row.universalFit,
                        fits: row.fits.map(f => f.modelId),
                    })),
                }),
            });
            const d = await r.json();
            if (!r.ok) {
                setErr(d?.error === "not_approved" ? "Do'koningiz hali tasdiqlanmagan" : "Joylashda xatolik");
                setPhase("preview");
                return;
            }
            setResult({ ok: d.okCount ?? 0, err: d.errCount ?? 0 });
            setPhase("done");
        } catch {
            setErr("Ulanish xatoligi");
            setPhase("preview");
        }
    }

    if (typeof document === "undefined") return null;
    return createPortal(
        <div
            className="bn-overlay-in fixed inset-0 z-[300] flex items-end sm:items-center justify-center p-0 sm:p-4"
            style={{ background: "rgba(0,0,0,0.7)", backdropFilter: "blur(6px)" }}
            onClick={onClose}
        >
            <div
                className="bn-sheet-in w-full sm:max-w-[640px] max-h-[90vh] flex flex-col rounded-t-3xl sm:rounded-3xl overflow-hidden"
                style={{ background: BN.surface, border: `1px solid ${BN.border}` }}
                onClick={e => e.stopPropagation()}
            >
                {/* Header */}
                <div className="flex items-center justify-between p-4 pb-3" style={{ borderBottom: `1px solid ${BN.border}` }}>
                    <div className="flex items-center gap-2">
                        <Sparkles className="w-5 h-5" style={{ color: BN.gold }} />
                        <h2 className="text-[17px] font-black">AI bilan import</h2>
                    </div>
                    <button onClick={onClose} className="w-8 h-8 grid place-items-center rounded-full hover:bg-white/10" style={{ color: BN.text3 }}>
                        <X className="w-4 h-4" />
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto p-4">
                    {/* UPLOAD */}
                    {phase === "upload" && (
                        <div>
                            <p className="text-[13px] mb-4" style={{ color: BN.text2 }}>
                                Excel yoki CSV faylingizni yuklang — AI o'zi tushunadi, tarjima qiladi va joylaydi.
                                Bizning shablonga moslash shart emas.
                            </p>
                            <label
                                className="flex flex-col items-center justify-center gap-3 h-44 rounded-2xl cursor-pointer transition-colors"
                                style={{ background: BN.surfaceUp, border: `2px dashed ${BN.border}` }}
                            >
                                <Upload className="w-8 h-8" style={{ color: BN.gold }} />
                                <span className="text-[14px] font-bold">Fayl tanlang</span>
                                <span className="text-[12px]" style={{ color: BN.text3 }}>.xlsx, .csv, .tsv (maks 5MB)</span>
                                <input
                                    type="file"
                                    accept=".xlsx,.csv,.tsv,.txt"
                                    className="hidden"
                                    onChange={e => { const f = e.target.files?.[0]; if (f) void onFile(f); }}
                                />
                            </label>
                            {err && <p className="mt-3 text-[13px] flex items-center gap-1.5" style={{ color: BN.err }}><AlertTriangle className="w-4 h-4" /> {err}</p>}
                        </div>
                    )}

                    {/* LOADING */}
                    {phase === "loading" && (
                        <div className="flex flex-col items-center justify-center py-16 gap-3">
                            <Loader2 className="w-8 h-8 animate-spin" style={{ color: BN.gold }} />
                            <p className="text-[14px] font-bold">AI faylni o'qiyapti...</p>
                            <p className="text-[12px] text-center" style={{ color: BN.text3 }}>Ustunlarni aniqlash, tarjima va moslik — bir necha soniya</p>
                        </div>
                    )}

                    {/* PREVIEW */}
                    {phase === "preview" && (
                        <div>
                            {/* Valyuta + kurs */}
                            <div className="rounded-2xl p-3.5 mb-3" style={{ background: BN.surfaceUp, border: `1px solid ${BN.borderGold}` }}>
                                <p className="text-[11px] font-black uppercase tracking-wider mb-2" style={{ color: BN.text3 }}>
                                    Narx valyutasi: {CUR_LABEL[currency] ?? currency}
                                </p>
                                {currency !== "UZS" && (
                                    <div className="flex items-center gap-2 flex-wrap">
                                        <span className="text-[13px]" style={{ color: BN.text2 }}>1 {currency} =</span>
                                        <input
                                            value={rate}
                                            onChange={e => applyRate(Math.max(1, Number(e.target.value.replace(/\D/g, "")) || 1))}
                                            inputMode="numeric"
                                            className="w-24 h-9 rounded-lg px-2.5 text-[14px] tabular-nums text-center"
                                            style={{ background: BN.surface, border: `1px solid ${BN.border}`, color: "#fff" }}
                                        />
                                        <span className="text-[13px]" style={{ color: BN.text2 }}>so'm</span>
                                        <span className="text-[11px]" style={{ color: BN.text3 }}>— ustamangizni ham shu kursga qo'shing</span>
                                    </div>
                                )}
                            </div>

                            {/* Default kategoriya (bo'sh qatorlarga) */}
                            <div className="mb-3">
                                <p className="text-[12px] mb-1.5" style={{ color: BN.text3 }}>Kategoriyasi aniqlanmagan qatorlar uchun (ixtiyoriy):</p>
                                <BnCategoryPicker categories={categories} value={defaultCat} onChange={setDefaultCat} placeholder="Standart kategoriya" />
                            </div>

                            <div className="flex items-center justify-between mb-2">
                                <p className="text-[13px] font-bold">{includedRows.length} / {rows.length} tanlangan</p>
                                {truncated && <span className="text-[11px]" style={{ color: BN.warn }}>Faqat birinchi 160 qator</span>}
                            </div>

                            <div className="space-y-2">
                                {rows.map((r, i) => (
                                    <ImportRow key={i} r={r} currency={currency}
                                        onToggle={() => patchRow(i, { include: !r.include })}
                                        onTitle={v => patchRow(i, { title: v })}
                                        onSom={v => patchRow(i, { som: v, overridden: true })}
                                        onStock={v => patchRow(i, { stock: v })}
                                        needsCat={!r.categorySlug && !defaultCat}
                                    />
                                ))}
                            </div>
                            {err && <p className="mt-3 text-[13px]" style={{ color: BN.err }}>{err}</p>}
                        </div>
                    )}

                    {/* COMMITTING */}
                    {phase === "committing" && (
                        <div className="flex flex-col items-center justify-center py-16 gap-3">
                            <Loader2 className="w-8 h-8 animate-spin" style={{ color: BN.gold }} />
                            <p className="text-[14px] font-bold">Mahsulotlar joylanmoqda...</p>
                        </div>
                    )}

                    {/* DONE */}
                    {phase === "done" && result && (
                        <div className="flex flex-col items-center justify-center py-12 gap-3">
                            <div className="w-14 h-14 grid place-items-center rounded-full" style={{ background: BN.okSoft, color: BN.ok }}>
                                <Check className="w-7 h-7" />
                            </div>
                            <p className="text-[16px] font-black">{result.ok} mahsulot joylandi</p>
                            {result.err > 0 && <p className="text-[13px]" style={{ color: BN.warn }}>{result.err} qator o'tkazib yuborildi</p>}
                            <p className="text-[12px] text-center" style={{ color: BN.text3 }}>Tarjima (3 til) va moslik fon rejimida yakunlanadi.</p>
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="p-3" style={{ borderTop: `1px solid ${BN.border}` }}>
                    {phase === "preview" && (
                        <button
                            onClick={commit}
                            disabled={includedRows.length === 0}
                            className="w-full h-12 rounded-xl text-[15px] font-black disabled:opacity-50"
                            style={{ background: BN.gold, color: BN.onGold }}
                        >
                            {includedRows.length} mahsulotni joylash
                        </button>
                    )}
                    {phase === "done" && (
                        <button
                            onClick={() => { onDone(); onClose(); }}
                            className="w-full h-12 rounded-xl text-[15px] font-black"
                            style={{ background: BN.gold, color: BN.onGold }}
                        >
                            Yakunlash
                        </button>
                    )}
                    {(phase === "upload" || phase === "loading") && (
                        <button
                            onClick={onClose}
                            className="w-full h-11 rounded-xl text-[14px] font-bold"
                            style={{ background: BN.surfaceUp, color: BN.text2 }}
                        >
                            Bekor qilish
                        </button>
                    )}
                </div>
            </div>
        </div>,
        document.body,
    );
}

function ImportRow({
    r, currency, onToggle, onTitle, onSom, onStock, needsCat,
}: {
    r: Row; currency: string;
    onToggle: () => void;
    onTitle: (v: string) => void;
    onSom: (v: number) => void;
    onStock: (v: number) => void;
    needsCat: boolean;
}) {
    return (
        <div
            className="rounded-2xl p-3"
            style={{
                background: r.include ? BN.surfaceUp : BN.surface,
                border: `1px solid ${r.include ? BN.border : BN.border}`,
                opacity: r.include ? 1 : 0.55,
            }}
        >
            <div className="flex items-start gap-2.5">
                <button
                    onClick={onToggle}
                    className="w-6 h-6 mt-0.5 grid place-items-center rounded-md flex-shrink-0"
                    style={{ background: r.include ? BN.gold : "transparent", border: `1.5px solid ${r.include ? BN.gold : BN.border}`, color: BN.onGold }}
                    aria-label="Tanlash"
                >
                    {r.include && <Check className="w-4 h-4" />}
                </button>
                <div className="flex-1 min-w-0">
                    <input
                        value={r.title}
                        onChange={e => onTitle(e.target.value)}
                        className="w-full bg-transparent text-[14px] font-bold outline-none mb-1.5"
                        style={{ color: "#fff" }}
                    />
                    {/* Meta chiplar */}
                    <div className="flex flex-wrap items-center gap-1.5 mb-2">
                        {r.categoryName ? (
                            <span className="text-[11px] px-2 py-0.5 rounded-full" style={{ background: BN.surface, color: BN.text3, border: `1px solid ${BN.border}` }}>{r.categoryName}</span>
                        ) : needsCat ? (
                            <span className="text-[11px] px-2 py-0.5 rounded-full flex items-center gap-1" style={{ background: BN.warnSoft, color: BN.warn }}><AlertTriangle className="w-3 h-3" /> kategoriya kerak</span>
                        ) : null}
                        {r.partNumber && (
                            <span className="text-[11px] px-2 py-0.5 rounded-full flex items-center gap-1 tabular-nums" style={{ background: BN.surface, color: BN.text3, border: `1px solid ${BN.border}` }}>
                                <Hash className="w-3 h-3" />{r.partNumber}
                            </span>
                        )}
                        {r.fits.map(f => (
                            <span key={f.modelId} className="text-[11px] px-2 py-0.5 rounded-full flex items-center gap-1" style={{ background: BN.goldSoft, color: BN.gold }}>
                                <Car className="w-3 h-3" />{f.label}
                            </span>
                        ))}
                        {r.matchedModels.map((m, k) => (
                            <span key={k} className="text-[11px] px-2 py-0.5 rounded-full" style={{ background: BN.surface, color: BN.text3, border: `1px dashed ${BN.border}` }}>{m}?</span>
                        ))}
                    </div>
                    {/* Narx + soni */}
                    <div className="flex items-center gap-2 flex-wrap">
                        <div className="flex items-center gap-1">
                            <input
                                value={r.som}
                                onChange={e => onSom(Math.max(0, Number(e.target.value.replace(/\D/g, "")) || 0))}
                                inputMode="numeric"
                                className="w-28 h-9 rounded-lg px-2.5 text-[14px] tabular-nums"
                                style={{ background: BN.surface, border: `1px solid ${r.som < 1000 ? BN.err : BN.border}`, color: "#fff" }}
                            />
                            <span className="text-[12px]" style={{ color: BN.text3 }}>so'm</span>
                        </div>
                        {currency !== "UZS" && (
                            <span className="text-[11px]" style={{ color: BN.text3 }}>({r.priceOriginal} {currency})</span>
                        )}
                        <span className="text-[12px] mx-1" style={{ color: BN.text3 }}>·</span>
                        <div className="flex items-center gap-1">
                            <span className="text-[12px]" style={{ color: BN.text3 }}>soni</span>
                            <input
                                value={r.stock}
                                onChange={e => onStock(Math.max(1, Number(e.target.value.replace(/\D/g, "")) || 1))}
                                inputMode="numeric"
                                className="w-16 h-9 rounded-lg px-2.5 text-[14px] tabular-nums text-center"
                                style={{ background: BN.surface, border: `1px solid ${BN.border}`, color: "#fff" }}
                            />
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
