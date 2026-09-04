"use client";

// Belis katalog — mavjud komplektlar ro'yxati.

import { useEffect, useState } from "react";
import { Sparkles, Package, ChevronRight, Loader2, LayoutGrid, Box } from "lucide-react";
import { BELIS, BELIS_GOLD_GRADIENT } from "@/lib/belis-theme";
import { BelisLink } from "./belis-nav";
import { BelisItemsTab } from "./belis-items-tab";
import { AiQuickHelper } from "@/components/ai/ai-quick-helper";

interface Komplekt {
    id: string;
    slug: string;
    kind: "FOTIHA" | "BESHIK_TOY" | "CUSTOM";
    nameUz: string;
    nameRu?: string | null;
    nameEn?: string | null;
    images: string[];
    dailyRentUzs: number;
    deposit: number;
    itemsCount: number;
    copyCount: number;
}

const KIND_LABEL: Record<Komplekt["kind"], string> = {
    FOTIHA: "Fotiha",
    BESHIK_TOY: "Beshik to'y",
    CUSTOM: "Maxsus",
};

function fmtSom(n: number): string {
    return `${n.toLocaleString("uz-UZ")} so'm`;
}

export function BelisKatalogPage() {
    const [tab, setTab] = useState<"komplekt" | "items">("komplekt");
    const [rows, setRows] = useState<Komplekt[] | null>(null);
    const [kind, setKind] = useState<"" | Komplekt["kind"]>("");

    useEffect(() => {
        if (tab !== "komplekt") return;
        const q = kind ? `?kind=${kind}` : "";
        setRows(null);
        fetch(`/api/belis/komplektlar${q}`, { cache: "no-store" })
            .then(r => r.json())
            .then(d => setRows(Array.isArray(d?.komplektlar) ? d.komplektlar : []))
            .catch(() => setRows([]));
    }, [kind, tab]);

    return (
        <div className="max-w-6xl mx-auto px-4 py-6">
            <div className="flex items-start gap-3 mb-5">
                <span className="w-11 h-11 rounded-2xl grid place-items-center flex-shrink-0"
                    style={{ background: BELIS_GOLD_GRADIENT, color: BELIS.onGold }}>
                    <Package className="w-5 h-5" />
                </span>
                <div>
                    <h1 className="text-[24px] font-black tracking-tight leading-tight" style={{ color: BELIS.text }}>
                        Sarpo qutilari
                    </h1>
                    <p className="text-[13px] mt-1" style={{ color: BELIS.text2 }}>
                        Marosim uchun ijaraga oling — komplekt yoki alohida qutilar.
                    </p>
                </div>
            </div>

            {/* Katalog turi tab */}
            <div className="flex items-center gap-2 mb-4 p-1 rounded-2xl w-fit"
                style={{ background: BELIS.surface, border: `1px solid ${BELIS.border}` }}>
                {[
                    { key: "komplekt" as const, label: "Komplektlar", icon: LayoutGrid },
                    { key: "items"    as const, label: "Alohida qutilar", icon: Box },
                ].map(t => {
                    const active = tab === t.key;
                    const Icon = t.icon;
                    return (
                        <button key={t.key} onClick={() => setTab(t.key)}
                            className="flex items-center gap-1.5 h-9 px-4 rounded-xl text-[12.5px] font-black transition-colors"
                            style={{
                                background: active ? BELIS_GOLD_GRADIENT : "transparent",
                                color: active ? BELIS.onGold : BELIS.text2,
                            }}>
                            <Icon className="w-3.5 h-3.5" /> {t.label}
                        </button>
                    );
                })}
            </div>

            <AiQuickHelper module="belis" initialPrompt="Menga mos komplekt tavsiya qiling" />

            {tab === "items" ? <BelisItemsTab /> : (
                <>

            {/* Filter chip'lar */}
            <div className="flex items-center gap-1.5 mb-5 overflow-x-auto pb-1">
                {[
                    { key: "" as const, label: "Barchasi" },
                    { key: "FOTIHA" as const, label: "Fotiha" },
                    { key: "BESHIK_TOY" as const, label: "Beshik to'y" },
                    { key: "CUSTOM" as const, label: "Maxsus" },
                ].map(t => {
                    const active = kind === t.key;
                    return (
                        <button key={t.key || "all"} onClick={() => setKind(t.key)}
                            className="h-9 px-4 rounded-xl text-[13px] font-black flex-shrink-0"
                            style={{
                                background: active ? BELIS_GOLD_GRADIENT : BELIS.surface,
                                color: active ? BELIS.onGold : BELIS.text2,
                                border: `1px solid ${active ? "transparent" : BELIS.border}`,
                            }}>
                            {t.label}
                        </button>
                    );
                })}
            </div>

            {rows === null && (
                <div className="flex items-center justify-center py-16">
                    <Loader2 className="w-6 h-6 animate-spin" style={{ color: BELIS.gold }} />
                </div>
            )}

            {rows && rows.length === 0 && (
                <div className="text-center py-16 rounded-2xl"
                    style={{ background: BELIS.surface, border: `1px solid ${BELIS.border}` }}>
                    <Sparkles className="w-10 h-10 mx-auto mb-3 opacity-60" style={{ color: BELIS.gold }} />
                    <p className="text-[14px]" style={{ color: BELIS.text2 }}>Hozircha katalog to&apos;ldirilmagan.</p>
                    <p className="text-[12px] mt-1" style={{ color: BELIS.text3 }}>Tez orada komplektlar qo&apos;shiladi.</p>
                </div>
            )}

            {rows && rows.length > 0 && (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {rows.map(k => (
                        <BelisLink key={k.id} href={`/k/${k.slug}` as never}
                            className="group rounded-2xl overflow-hidden transition-transform active:scale-[0.98]"
                            style={{ background: BELIS.surface, border: `1px solid ${BELIS.border}` }}>
                            <div className="relative aspect-[4/3] overflow-hidden" style={{ background: BELIS.surfaceUp }}>
                                {k.images[0] && (
                                    // eslint-disable-next-line @next/next/no-img-element
                                    <img src={k.images[0]} alt={k.nameUz}
                                        className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
                                )}
                                <span className="absolute top-3 left-3 px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-widest"
                                    style={{ background: BELIS.goldSoft, color: BELIS.onGold }}>
                                    {KIND_LABEL[k.kind]}
                                </span>
                            </div>
                            <div className="p-4">
                                <p className="text-[15px] font-black line-clamp-1" style={{ color: BELIS.text }}>{k.nameUz}</p>
                                <p className="text-[11.5px] mt-0.5" style={{ color: BELIS.text3 }}>
                                    {k.itemsCount} ta quti · {k.copyCount} nusxa mavjud
                                </p>
                                <div className="mt-3 pt-3 flex items-center justify-between" style={{ borderTop: `1px dashed ${BELIS.border}` }}>
                                    <div>
                                        <p className="text-[10.5px] uppercase tracking-widest" style={{ color: BELIS.text3 }}>Kunlik</p>
                                        <p className="text-[15px] font-black" style={{ color: BELIS.goldDeep }}>{fmtSom(k.dailyRentUzs)}</p>
                                    </div>
                                    <ChevronRight className="w-4 h-4" style={{ color: BELIS.gold }} />
                                </div>
                            </div>
                        </BelisLink>
                    ))}
                </div>
            )}
                </>
            )}
        </div>
    );
}
