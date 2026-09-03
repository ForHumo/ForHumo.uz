"use client";

// Sotuvchi bulk mahsulot yuklash — TSV (Excel copy/paste) yoki fayl orqali.
// 3 qadam: 1) Format tanish + template, 2) Yopishtirish/yuklash + parse, 3) Preview + commit
//
// Format (TSV, birinchi qator = header):
//   nomi<TAB>narx<TAB>kategoriya<TAB>zaxira<TAB>eski_narx<TAB>rasmlar<TAB>tavsif
//
// Rasmlar: bir necha URL space yoki | bilan ajratilgan.

import { useState, useMemo, useRef, useEffect } from "react";
import { createPortal } from "react-dom";
import {
    X, Upload, Copy, FileSpreadsheet, CheckCircle2, AlertTriangle, Loader2, ChevronRight, Download,
} from "lucide-react";
import { useTranslations } from "next-intl";
import { BN } from "@/lib/bn-theme";

type Step = "intro" | "paste" | "preview" | "done";

interface ParsedRow {
    title: string;
    price: string;
    categorySlug: string;
    stock: string;
    oldPrice: string;
    images: string;
    description: string;
}

interface RowResult {
    index: number;
    title: string;
    ok: boolean;
    errors: string[];
    warnings: string[];
    slug?: string;
}

interface CategoryOpt {
    slug: string;
    name: string;
}

const HEADERS = ["nomi", "narx", "kategoriya", "zaxira", "eski_narx", "rasmlar", "tavsif"];

const TEMPLATE_ROWS = [
    "Olma 1kg\t18000\tolma\t50\t22000\thttps://picsum.photos/seed/olma/600\tShirin, mahalliy",
    "Nok 1kg\t22000\tnok\t30\t\t\t",
    "Pomidor 1kg\t9000\tpomidor\t100\t12000\thttps://picsum.photos/seed/pomidor/600 https://picsum.photos/seed/pom2/600\tSalati uchun",
];

function parseTSV(raw: string): ParsedRow[] {
    const lines = raw.replace(/\r/g, "").split("\n").map(l => l.trim()).filter(Boolean);
    if (lines.length === 0) return [];
    // Birinchi qator header'mi? (ehtimol)
    const first = lines[0].toLowerCase();
    const hasHeader = HEADERS.some(h => first.includes(h));
    const data = hasHeader ? lines.slice(1) : lines;
    return data.map(line => {
        const cols = line.split("\t");
        return {
            title:        (cols[0] ?? "").trim(),
            price:        (cols[1] ?? "").trim(),
            categorySlug: (cols[2] ?? "").trim(),
            stock:        (cols[3] ?? "").trim(),
            oldPrice:     (cols[4] ?? "").trim(),
            images:       (cols[5] ?? "").trim(),
            description:  (cols[6] ?? "").trim(),
        };
    });
}

export function BnBulkImportModal({
    onClose, onDone, categories,
}: {
    onClose: () => void;
    onDone: () => void;
    categories: CategoryOpt[];
}) {
    const t = useTranslations("bn.cabinet");
    const [step, setStep] = useState<Step>("intro");
    const [text, setText] = useState("");
    const [rows, setRows] = useState<ParsedRow[]>([]);
    const [defaultCat, setDefaultCat] = useState("");
    const [results, setResults] = useState<RowResult[]>([]);
    const [busy, setBusy] = useState(false);
    const [mounted, setMounted] = useState(false);
    const fileRef = useRef<HTMLInputElement>(null);

    useEffect(() => { setMounted(true); }, []);
    if (!mounted) return null;

    async function validate() {
        setBusy(true);
        try {
            const payload = rows.map(r => ({
                title: r.title,
                price: r.price,
                categorySlug: r.categorySlug,
                stock: r.stock,
                oldPrice: r.oldPrice,
                images: r.images,
                description: r.description,
            }));
            const r = await fetch("/api/bn/seller/products/bulk", {
                method: "POST",
                headers: { "content-type": "application/json" },
                body: JSON.stringify({ mode: "validate", rows: payload, defaultCategorySlug: defaultCat || undefined }),
            });
            const d = await r.json();
            if (r.ok && Array.isArray(d?.results)) {
                setResults(d.results);
                setStep("preview");
            } else {
                alert(d?.error ?? "Xatolik");
            }
        } finally {
            setBusy(false);
        }
    }

    async function commit() {
        setBusy(true);
        try {
            const payload = rows.map(r => ({
                title: r.title,
                price: r.price,
                categorySlug: r.categorySlug,
                stock: r.stock,
                oldPrice: r.oldPrice,
                images: r.images,
                description: r.description,
            }));
            const r = await fetch("/api/bn/seller/products/bulk", {
                method: "POST",
                headers: { "content-type": "application/json" },
                body: JSON.stringify({ mode: "commit", rows: payload, defaultCategorySlug: defaultCat || undefined }),
            });
            const d = await r.json();
            if (r.ok && Array.isArray(d?.results)) {
                setResults(d.results);
                setStep("done");
            } else {
                alert(d?.error ?? "Xatolik");
            }
        } finally {
            setBusy(false);
        }
    }

    function loadTemplate() {
        setText(HEADERS.join("\t") + "\n" + TEMPLATE_ROWS.join("\n"));
    }

    function parseText() {
        const parsed = parseTSV(text);
        setRows(parsed);
        if (parsed.length > 0) validate();
    }

    async function onFileChange(e: React.ChangeEvent<HTMLInputElement>) {
        const file = e.target.files?.[0];
        if (!file) return;
        const raw = await file.text();
        setText(raw);
        setStep("paste");
    }

    function downloadTemplate() {
        const csv = HEADERS.join("\t") + "\n" + TEMPLATE_ROWS.join("\n");
        const blob = new Blob([csv], { type: "text/tab-separated-values;charset=utf-8" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = "bn-mahsulot-shabloni.tsv";
        a.click();
        URL.revokeObjectURL(url);
    }

    const okRows = useMemo(() => results.filter(r => r.ok), [results]);
    const errRows = useMemo(() => results.filter(r => !r.ok), [results]);

    const content = (
        <div
            className="fixed inset-0 z-[9999] flex items-end sm:items-center justify-center p-2 sm:p-4"
            style={{ background: "rgba(0,0,0,0.7)" }}
            onClick={onClose}
        >
            <div
                className="w-full max-w-3xl max-h-[92vh] flex flex-col rounded-3xl overflow-hidden"
                style={{ background: BN.surface, border: `1px solid ${BN.border}` }}
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header */}
                <div className="flex items-center gap-3 p-4 flex-shrink-0" style={{ borderBottom: `1px solid ${BN.border}` }}>
                    <span
                        className="w-10 h-10 rounded-xl grid place-items-center flex-shrink-0"
                        style={{ background: BN.goldSoft, color: BN.gold }}
                    >
                        <FileSpreadsheet className="w-5 h-5" />
                    </span>
                    <div className="flex-1 min-w-0">
                        <p className="text-[15px] font-black">{t("bulkTitle")}</p>
                        <p className="text-[11.5px]" style={{ color: BN.text3 }}>
                            {step === "intro" && t("bulkStepIntro")}
                            {step === "paste" && t("bulkStepPaste")}
                            {step === "preview" && t("bulkStepPreview", { n: results.length })}
                            {step === "done" && t("bulkStepDone")}
                        </p>
                    </div>
                    <button onClick={onClose} className="p-1" style={{ color: BN.text3 }}>
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Body */}
                <div className="flex-1 overflow-y-auto p-4">
                    {step === "intro" && (
                        <div className="space-y-4">
                            <p className="text-[13px]" style={{ color: BN.text2 }}>{t("bulkIntroText")}</p>
                            <div className="p-3 rounded-xl text-[12px]" style={{ background: BN.surfaceUp }}>
                                <p className="font-black mb-2">{t("bulkColumnsTitle")}</p>
                                <ol className="space-y-1 pl-4 list-decimal" style={{ color: BN.text2 }}>
                                    <li>{t("bulkCol1")}</li>
                                    <li>{t("bulkCol2")}</li>
                                    <li>{t("bulkCol3")}</li>
                                    <li>{t("bulkCol4")}</li>
                                    <li>{t("bulkCol5")}</li>
                                    <li>{t("bulkCol6")}</li>
                                    <li>{t("bulkCol7")}</li>
                                </ol>
                            </div>
                            <div className="flex flex-col sm:flex-row gap-2">
                                <button
                                    onClick={downloadTemplate}
                                    className="flex-1 h-11 rounded-xl text-[13px] font-black flex items-center justify-center gap-2"
                                    style={{ background: BN.surfaceUp, color: BN.text }}
                                >
                                    <Download className="w-4 h-4" /> {t("bulkDownloadTemplate")}
                                </button>
                                <input
                                    ref={fileRef}
                                    type="file"
                                    accept=".csv,.tsv,.txt"
                                    className="hidden"
                                    onChange={onFileChange}
                                />
                                <button
                                    onClick={() => fileRef.current?.click()}
                                    className="flex-1 h-11 rounded-xl text-[13px] font-black flex items-center justify-center gap-2"
                                    style={{ background: BN.surfaceUp, color: BN.text }}
                                >
                                    <Upload className="w-4 h-4" /> {t("bulkUploadFile")}
                                </button>
                                <button
                                    onClick={() => setStep("paste")}
                                    className="flex-1 h-11 rounded-xl text-[13px] font-black flex items-center justify-center gap-2"
                                    style={{ background: BN.gold, color: BN.onGold }}
                                >
                                    <Copy className="w-4 h-4" /> {t("bulkPaste")}
                                </button>
                            </div>
                        </div>
                    )}

                    {step === "paste" && (
                        <div className="space-y-3">
                            <div className="flex items-center justify-between">
                                <label className="text-[12px] font-black" style={{ color: BN.text2 }}>
                                    {t("bulkPasteLabel")}
                                </label>
                                <button
                                    onClick={loadTemplate}
                                    className="text-[11.5px] font-black"
                                    style={{ color: BN.gold }}
                                >
                                    {t("bulkFillExample")}
                                </button>
                            </div>
                            <textarea
                                value={text}
                                onChange={(e) => setText(e.target.value)}
                                rows={10}
                                placeholder={`${HEADERS.join("\t")}\n${TEMPLATE_ROWS[0]}`}
                                className="w-full p-3 rounded-xl text-[12px] font-mono resize-none focus:outline-none"
                                style={{
                                    background: BN.surfaceUp,
                                    color: BN.text,
                                    border: `1px solid ${BN.border}`,
                                }}
                            />

                            <div>
                                <label className="text-[12px] font-black block mb-1.5" style={{ color: BN.text2 }}>
                                    {t("bulkDefaultCat")}
                                </label>
                                <select
                                    value={defaultCat}
                                    onChange={(e) => setDefaultCat(e.target.value)}
                                    className="w-full h-11 px-3 rounded-xl text-[13px] focus:outline-none"
                                    style={{ background: BN.surfaceUp, color: BN.text, border: `1px solid ${BN.border}` }}
                                >
                                    <option value="">{t("bulkDefaultCatNone")}</option>
                                    {categories.map(c => (
                                        <option key={c.slug} value={c.slug}>{c.name} ({c.slug})</option>
                                    ))}
                                </select>
                            </div>
                        </div>
                    )}

                    {step === "preview" && (
                        <div className="space-y-3">
                            <div className="grid grid-cols-2 gap-2">
                                <div
                                    className="p-3 rounded-xl flex items-center gap-2"
                                    style={{ background: `${BN.ok}1A`, color: BN.ok }}
                                >
                                    <CheckCircle2 className="w-5 h-5" />
                                    <span className="font-black tabular-nums text-[15px]">{okRows.length}</span>
                                    <span className="text-[12px]">{t("bulkOkLabel")}</span>
                                </div>
                                <div
                                    className="p-3 rounded-xl flex items-center gap-2"
                                    style={{ background: BN.errSoft, color: BN.err }}
                                >
                                    <AlertTriangle className="w-5 h-5" />
                                    <span className="font-black tabular-nums text-[15px]">{errRows.length}</span>
                                    <span className="text-[12px]">{t("bulkErrLabel")}</span>
                                </div>
                            </div>

                            <div className="space-y-1.5 max-h-[40vh] overflow-y-auto">
                                {results.map(r => (
                                    <div
                                        key={r.index}
                                        className="p-2.5 rounded-lg flex items-start gap-2"
                                        style={{
                                            background: BN.surfaceUp,
                                            border: `1px solid ${r.ok ? BN.border : `${BN.err}44`}`,
                                        }}
                                    >
                                        <span
                                            className="w-5 h-5 rounded-full grid place-items-center flex-shrink-0 mt-0.5"
                                            style={{ background: r.ok ? BN.ok : BN.err, color: "#fff" }}
                                        >
                                            {r.ok
                                                ? <CheckCircle2 className="w-3 h-3" />
                                                : <AlertTriangle className="w-3 h-3" />}
                                        </span>
                                        <div className="flex-1 min-w-0">
                                            <p className="text-[12.5px] font-bold line-clamp-1">{r.title}</p>
                                            {r.errors.length > 0 && (
                                                <p className="text-[11px] mt-0.5" style={{ color: BN.err }}>
                                                    {r.errors.join(" · ")}
                                                </p>
                                            )}
                                            {r.warnings.length > 0 && (
                                                <p className="text-[11px] mt-0.5" style={{ color: BN.text3 }}>
                                                    {r.warnings.join(" · ")}
                                                </p>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {step === "done" && (
                        <div className="text-center py-8">
                            <span
                                className="w-16 h-16 rounded-full grid place-items-center mx-auto mb-4"
                                style={{ background: `${BN.ok}22`, color: BN.ok }}
                            >
                                <CheckCircle2 className="w-8 h-8" />
                            </span>
                            <p className="text-[18px] font-black mb-1">
                                {t("bulkDoneTitle", { n: okRows.length })}
                            </p>
                            {errRows.length > 0 && (
                                <p className="text-[12.5px]" style={{ color: BN.text3 }}>
                                    {t("bulkDoneErr", { n: errRows.length })}
                                </p>
                            )}
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="flex items-center gap-2 p-4 flex-shrink-0" style={{ borderTop: `1px solid ${BN.border}` }}>
                    {step === "paste" && (
                        <>
                            <button onClick={() => setStep("intro")} className="h-11 px-4 rounded-xl text-[13px] font-black" style={{ background: BN.surfaceUp, color: BN.text }}>
                                {t("cancelBack")}
                            </button>
                            <button
                                onClick={parseText}
                                disabled={busy || !text.trim()}
                                className="ml-auto h-11 px-5 rounded-xl text-[13px] font-black flex items-center gap-2 disabled:opacity-60"
                                style={{ background: BN.gold, color: BN.onGold }}
                            >
                                {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <>{t("bulkContinue")} <ChevronRight className="w-4 h-4" /></>}
                            </button>
                        </>
                    )}
                    {step === "preview" && (
                        <>
                            <button onClick={() => setStep("paste")} className="h-11 px-4 rounded-xl text-[13px] font-black" style={{ background: BN.surfaceUp, color: BN.text }}>
                                {t("cancelBack")}
                            </button>
                            <button
                                onClick={commit}
                                disabled={busy || okRows.length === 0}
                                className="ml-auto h-11 px-5 rounded-xl text-[13px] font-black flex items-center gap-2 disabled:opacity-60"
                                style={{ background: BN.ok, color: "#fff" }}
                            >
                                {busy
                                    ? <Loader2 className="w-4 h-4 animate-spin" />
                                    : <><CheckCircle2 className="w-4 h-4" /> {t("bulkCommit", { n: okRows.length })}</>}
                            </button>
                        </>
                    )}
                    {step === "done" && (
                        <button
                            onClick={() => { onDone(); onClose(); }}
                            className="w-full h-11 rounded-xl text-[13px] font-black"
                            style={{ background: BN.gold, color: BN.onGold }}
                        >
                            {t("bulkClose")}
                        </button>
                    )}
                </div>
            </div>
        </div>
    );

    return createPortal(content, document.body);
}
