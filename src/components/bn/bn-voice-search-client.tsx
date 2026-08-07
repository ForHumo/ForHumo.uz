"use client";

// BN AI voice/text qidiruv — mikrofon (Web Speech API) yoki matn kiritib
// tabiiy tilda so'rov beradi. Gemini filtrlash + kategoriya/bozor bo'yicha ajratish.

import { useState, useRef, useEffect } from "react";
import { Mic, MicOff, Search, Loader2, Sparkles, Send, X } from "lucide-react";
import { BN } from "@/lib/bn-theme";
import { BnProductCard } from "./bn-product-card";
import { BnEmpty } from "./bn-cards";
import type { BnProductDTO } from "@/lib/bn-data";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
declare const window: any;

interface AIResponse {
    ok?: boolean;
    filter: {
        categorySlug: string | null;
        marketSlug: string | null;
        minPrice: number | null;
        maxPrice: number | null;
        sort: "cheap" | "new" | "rating" | null;
        keywords: string;
        reply: string;
    } | null;
    products: BnProductDTO[];
    reply: string | null;
}

export function BnVoiceSearchClient({ initialQuery = "" }: { initialQuery?: string }) {
    const [q, setQ] = useState(initialQuery);
    const [listening, setListening] = useState(false);
    const [busy, setBusy] = useState(false);
    const [result, setResult] = useState<AIResponse | null>(null);
    const [err, setErr] = useState<string | null>(null);
    const recognitionRef = useRef<unknown>(null);

    useEffect(() => {
        // Auto-search agar initialQuery bo'lsa
        if (initialQuery.trim()) {
            void submit(initialQuery);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // Web Speech API — mavjud bo'lsa
    function toggleMic() {
        const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
        if (!SR) {
            setErr("Bu brauzer ovoz kiritishni qo'llab-quvvatlamaydi (Chrome/Edge tavsiya etiladi).");
            return;
        }
        if (listening) {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            (recognitionRef.current as any)?.stop?.();
            setListening(false);
            return;
        }
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const rec: any = new SR();
        rec.lang = "uz-UZ";
        rec.interimResults = true;
        rec.continuous = false;
        rec.maxAlternatives = 1;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        rec.onresult = (e: any) => {
            const text = e.results?.[0]?.[0]?.transcript ?? "";
            setQ(text);
            if (e.results?.[0]?.isFinal) {
                setListening(false);
                void submit(text);
            }
        };
        rec.onend = () => setListening(false);
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        rec.onerror = (e: any) => {
            setErr(`Mikrofon xatosi: ${e?.error ?? "noma'lum"}`);
            setListening(false);
        };
        recognitionRef.current = rec;
        try { rec.start(); setListening(true); setErr(null); }
        catch { setErr("Mikrofonni ishga tushirib bo'lmadi."); }
    }

    async function submit(text: string) {
        const query = text.trim();
        if (!query) return;
        setBusy(true); setErr(null); setResult(null);
        try {
            const r = await fetch("/api/bn/ai/search", {
                method: "POST",
                headers: { "content-type": "application/json" },
                body: JSON.stringify({ q: query }),
            });
            const d = await r.json();
            if (r.status === 503) {
                setErr("AI hozircha ishlamayapti — oddiy qidiruv sahifasidan foydalaning.");
            } else if (!r.ok) {
                setErr(d?.error ?? "Xatolik");
            } else {
                setResult(d);
            }
        } catch { setErr("Ulanish xatoligi"); }
        finally { setBusy(false); }
    }

    return (
        <div className="mx-auto max-w-[1280px] px-4 py-6 pb-16">
            <div className="flex items-center gap-3 mb-2">
                <span
                    className="w-11 h-11 rounded-2xl grid place-items-center flex-shrink-0"
                    style={{ background: BN.goldSoft, color: BN.gold }}
                >
                    <Sparkles className="w-5 h-5" />
                </span>
                <div>
                    <h1 className="text-[22px] sm:text-[26px] font-black tracking-tight leading-none">Humo AI qidiruv</h1>
                    <p className="text-[12.5px] mt-1" style={{ color: BN.text3 }}>
                        Tabiiy tilda so&apos;rang — masalan &quot;Sergeli bozoridan Nexia 3 ga arzon amortizator&quot;
                    </p>
                </div>
            </div>

            {/* Kiritish paneli */}
            <div
                className="flex items-center gap-2 p-2 rounded-2xl mt-6 mb-3"
                style={{ background: BN.surface, border: `1px solid ${BN.border}` }}
            >
                <button
                    onClick={toggleMic}
                    disabled={busy}
                    aria-label={listening ? "To'xtatish" : "Ovoz bilan"}
                    className="w-11 h-11 rounded-xl grid place-items-center flex-shrink-0 transition-colors"
                    style={{
                        background: listening ? BN.err : BN.goldSoft,
                        color: listening ? "#fff" : BN.gold,
                    }}
                >
                    {listening ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
                </button>
                <input
                    value={q}
                    onChange={e => setQ(e.target.value)}
                    onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); void submit(q); } }}
                    placeholder={listening ? "Gapiring..." : "Yozing yoki mikrofon bosib gapiring..."}
                    className="flex-1 h-11 bg-transparent outline-none text-[14px] font-medium min-w-0"
                    style={{ color: BN.text }}
                />
                {q && (
                    <button
                        onClick={() => { setQ(""); setResult(null); setErr(null); }}
                        aria-label="Tozalash"
                        className="w-9 h-9 grid place-items-center rounded-lg"
                        style={{ color: BN.text3 }}
                    >
                        <X className="w-4 h-4" />
                    </button>
                )}
                <button
                    onClick={() => submit(q)}
                    disabled={busy || !q.trim()}
                    aria-label="Yuborish"
                    className="w-11 h-11 rounded-xl grid place-items-center flex-shrink-0 disabled:opacity-40"
                    style={{ background: BN.gold, color: BN.onGold }}
                >
                    {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                </button>
            </div>

            {listening && (
                <div className="flex items-center gap-2 mb-3 px-4 py-2 rounded-xl text-[12.5px]" style={{ background: BN.errSoft, color: BN.err }}>
                    <span className="w-2 h-2 rounded-full animate-pulse" style={{ background: BN.err }} />
                    Ovoz kiritilmoqda...
                </div>
            )}

            {err && (
                <div className="p-3 rounded-xl text-[12.5px] mb-3" style={{ background: BN.errSoft, color: BN.err }}>
                    {err}
                </div>
            )}

            {/* Namunaviy so'rovlar */}
            {!result && !busy && (
                <div className="mt-8">
                    <p className="text-[12.5px] font-bold mb-3" style={{ color: BN.text3 }}>NAMUNAVIY SO&apos;ROVLAR</p>
                    <div className="flex flex-wrap gap-2">
                        {[
                            "iPhone 13 arzonini toping",
                            "Sergeli bozoridan Nexia 3 uchun kolodka",
                            "1 milliondan arzon telefon",
                            "Chorsu bozoridan kurtka",
                            "Yetkazish bilan mebel",
                        ].map(s => (
                            <button
                                key={s}
                                onClick={() => { setQ(s); void submit(s); }}
                                className="px-3.5 py-2 rounded-xl text-[13px] font-bold transition-colors"
                                style={{ background: BN.surface, border: `1px solid ${BN.border}`, color: BN.text2 }}
                            >
                                {s}
                            </button>
                        ))}
                    </div>
                </div>
            )}

            {/* AI javobi */}
            {result?.reply && (
                <div
                    className="flex items-start gap-3 p-4 rounded-2xl mt-6 mb-4"
                    style={{ background: BN.goldSoft, border: `1px solid ${BN.goldEdge}` }}
                >
                    <Sparkles className="w-5 h-5 flex-shrink-0 mt-0.5" style={{ color: BN.gold }} />
                    <p className="text-[13.5px] leading-relaxed" style={{ color: BN.text }}>{result.reply}</p>
                </div>
            )}

            {/* Filtr yorliqlari */}
            {result?.filter && (
                <div className="flex flex-wrap gap-2 mb-4">
                    {result.filter.categorySlug && <FilterChip label={`Kategoriya: ${result.filter.categorySlug}`} />}
                    {result.filter.marketSlug && <FilterChip label={`Bozor: ${result.filter.marketSlug}`} />}
                    {result.filter.minPrice != null && <FilterChip label={`≥ ${result.filter.minPrice.toLocaleString("uz-UZ")} so'm`} />}
                    {result.filter.maxPrice != null && <FilterChip label={`≤ ${result.filter.maxPrice.toLocaleString("uz-UZ")} so'm`} />}
                    {result.filter.sort && <FilterChip label={`Saralash: ${result.filter.sort}`} />}
                </div>
            )}

            {/* Natijalar */}
            {result && result.products.length === 0 && !busy && (
                <BnEmpty
                    icon={<Search className="w-6 h-6" />}
                    title="Hech narsa topilmadi"
                    text="Boshqa so'z bilan qidirib ko'ring."
                />
            )}

            {result && result.products.length > 0 && (
                <>
                    <p className="text-[12.5px] mb-3" style={{ color: BN.text3 }}>
                        {result.products.length} ta mahsulot topildi
                    </p>
                    <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-3">
                        {result.products.map(p => <BnProductCard key={p.id} p={p} compact />)}
                    </div>
                </>
            )}

        </div>
    );
}

function FilterChip({ label }: { label: string }) {
    return (
        <span
            className="px-3 py-1.5 rounded-lg text-[11.5px] font-bold"
            style={{ background: BN.surface, border: `1px solid ${BN.border}`, color: BN.text2 }}
        >
            {label}
        </span>
    );
}
