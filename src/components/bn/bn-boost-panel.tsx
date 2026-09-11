"use client";

// BN Reklama (Boost) paneli — sotuvchi mahsulotini yuqorida chiqarish uchun.
// Kabinet Products tab'idagi mahsulot ustida ko'rinadi (sotuvchi ega bo'lsa).

import { useCallback, useEffect, useState } from "react";
import { Rocket, X, Loader2, Check, AlertCircle } from "lucide-react";
import { formatMoney } from "@/lib/money";
import { bnConfirm } from "./bn-dialog";

interface Boost {
    id: string;
    status: string;
    productId: string;
    productTitle: string;
    productSlug: string;
    productImage: string | null;
    totalBudget: number;
    dailyCost: number;
    spentEst: number;
    impressions: number;
    clicks: number;
    ctr: number;
    startedAt: string;
    expiresAt: string;
}

const PACKS = [
    { days: 3, dailyCost: 5_000, label: "3 kun · Standart" },
    { days: 7, dailyCost: 10_000, label: "1 hafta · Kuchli" },
    { days: 14, dailyCost: 15_000, label: "2 hafta · Premium" },
];

export function BnBoostPanel({ productId, productTitle, onClose }: {
    productId: string;
    productTitle: string;
    onClose: () => void;
}) {
    const [boosts, setBoosts] = useState<Boost[]>([]);
    const [loading, setLoading] = useState(true);
    const [creating, setCreating] = useState<number | null>(null);
    const [err, setErr] = useState<string | null>(null);

    const load = useCallback(async () => {
        setLoading(true);
        try {
            const r = await fetch("/api/bn/seller/boost", { cache: "no-store" });
            if (r.ok) {
                const j = await r.json();
                setBoosts(j.boosts ?? []);
            }
        } finally { setLoading(false); }
    }, []);

    useEffect(() => { void load(); }, [load]);

    const activeForThis = boosts.find(b => b.productId === productId && b.status === "ACTIVE");

    const create = useCallback(async (pack: typeof PACKS[number], idx: number) => {
        setCreating(idx);
        setErr(null);
        try {
            const total = pack.days * pack.dailyCost;
            const ok = await bnConfirm({
                title: "Boost yoqasizmi?",
                message: `${pack.label}\nJami: ${formatMoney(total, "UZS")} so'm hamyondan olinadi.`,
                confirmLabel: "Yoqish",
            });
            if (!ok) { setCreating(null); return; }
            const r = await fetch("/api/bn/seller/boost", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ productId, days: pack.days, dailyCost: pack.dailyCost }),
            });
            const j = await r.json();
            if (r.ok) {
                await load();
            } else if (j.error === "insufficient_balance") {
                setErr(`Hamyonda pul yetmayapti (${formatMoney(j.balance ?? 0, "UZS")} / ${formatMoney(j.required ?? total, "UZS")})`);
            } else if (j.error === "already_boosted") {
                setErr("Bu mahsulotda aktiv boost bor");
            } else {
                setErr(j.error ?? "Xato");
            }
        } finally { setCreating(null); }
    }, [productId, load]);

    const stop = useCallback(async (id: string) => {
        const ok = await bnConfirm({
            title: "Boost'ni to'xtatasizmi?",
            message: "Foydalanilmagan pul qaytarilmaydi.",
            danger: true,
        });
        if (!ok) return;
        await fetch(`/api/bn/seller/boost?id=${id}`, { method: "DELETE" });
        void load();
    }, [load]);

    return (
        <div className="fixed inset-0 z-[130]">
            <div className="absolute inset-0 bg-black/60" onClick={onClose} />
            <div className="absolute inset-y-0 right-0 w-full sm:w-[480px] bg-white dark:bg-neutral-900 overflow-y-auto border-l border-neutral-200 dark:border-neutral-800">
                {/* Header */}
                <div className="sticky top-0 z-10 flex items-center justify-between px-4 py-3 border-b border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900">
                    <div className="flex items-center gap-2">
                        <Rocket className="w-5 h-5 text-amber-500" />
                        <div>
                            <div className="text-sm font-semibold">Reklama (Boost)</div>
                            <div className="text-xs text-neutral-500 truncate max-w-[280px]">{productTitle}</div>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-1.5 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded">
                        <X className="w-4 h-4" />
                    </button>
                </div>

                <div className="p-4 space-y-4">
                    <p className="text-xs text-neutral-600 dark:text-neutral-400">
                        Boost yoqilgan mahsulot qidiruv va katalogda <b>eng yuqorida</b> chiqadi.
                        To'lov <b>For Pay hamyoni</b> orqali oldindan yechiladi (Payme/Click yo'q — hamyonga oldindan pul quying).
                    </p>

                    {loading ? (
                        <div className="flex justify-center py-6">
                            <Loader2 className="w-5 h-5 animate-spin text-neutral-400" />
                        </div>
                    ) : activeForThis ? (
                        <ActiveBoost boost={activeForThis} onStop={() => stop(activeForThis.id)} />
                    ) : (
                        <>
                            <div className="space-y-2">
                                {PACKS.map((p, i) => {
                                    const total = p.days * p.dailyCost;
                                    return (
                                        <button
                                            key={i}
                                            onClick={() => create(p, i)}
                                            disabled={creating !== null}
                                            className="w-full flex items-center justify-between p-3 rounded-xl border border-amber-300 dark:border-amber-800/50 bg-amber-50 dark:bg-amber-950/20 hover:bg-amber-100 dark:hover:bg-amber-950/40 disabled:opacity-60"
                                        >
                                            <div className="text-left">
                                                <div className="text-sm font-bold text-amber-800 dark:text-amber-300">{p.label}</div>
                                                <div className="text-xs text-neutral-600 dark:text-neutral-400 mt-0.5">
                                                    {formatMoney(p.dailyCost, "UZS")}/kun × {p.days} = <b>{formatMoney(total, "UZS")}</b>
                                                </div>
                                            </div>
                                            {creating === i ? (
                                                <Loader2 className="w-5 h-5 animate-spin text-amber-500" />
                                            ) : (
                                                <div className="text-xs px-3 py-1.5 rounded-lg bg-amber-500 text-white font-bold">Yoqish</div>
                                            )}
                                        </button>
                                    );
                                })}
                            </div>
                            {err && (
                                <div className="text-xs text-rose-600 bg-rose-50 dark:bg-rose-950/30 p-2.5 rounded-lg flex items-start gap-2">
                                    <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                                    <span>{err}</span>
                                </div>
                            )}
                        </>
                    )}

                    {/* Meniki oldingi boostlar */}
                    {boosts.length > 0 && (
                        <div className="pt-4 border-t border-neutral-200 dark:border-neutral-800">
                            <div className="text-xs font-semibold text-neutral-600 dark:text-neutral-400 mb-2">
                                Oldingi boostlar
                            </div>
                            <div className="space-y-1.5">
                                {boosts.slice(0, 5).map(b => (
                                    <div key={b.id} className="flex items-center justify-between text-xs p-2 rounded-lg bg-neutral-50 dark:bg-neutral-800/50">
                                        <span className="truncate">{b.productTitle}</span>
                                        <span className={b.status === "ACTIVE" ? "text-emerald-600 font-semibold" : "text-neutral-500"}>
                                            {b.status === "ACTIVE" ? "Aktiv" : b.status === "PAUSED" ? "Pauza" : "Tugagan"} · CTR {b.ctr}%
                                        </span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

function ActiveBoost({ boost, onStop }: { boost: Boost; onStop: () => void }) {
    const daysLeft = Math.max(0, Math.round((new Date(boost.expiresAt).getTime() - Date.now()) / (24 * 3600 * 1000)));
    const progress = boost.totalBudget > 0 ? Math.min(100, (boost.spentEst / boost.totalBudget) * 100) : 0;

    return (
        <div className="rounded-xl border border-emerald-400 bg-emerald-50 dark:bg-emerald-950/30 p-3 space-y-3">
            <div className="flex items-center gap-2">
                <Check className="w-5 h-5 text-emerald-600" />
                <div className="text-sm font-bold text-emerald-800 dark:text-emerald-300">Aktiv Boost</div>
            </div>

            <div className="grid grid-cols-3 gap-2 text-center">
                <div className="rounded-lg p-2 bg-white dark:bg-neutral-900">
                    <div className="text-[10px] text-neutral-500">Ko&apos;rildi</div>
                    <div className="text-sm font-bold mt-0.5">{boost.impressions.toLocaleString("uz-UZ")}</div>
                </div>
                <div className="rounded-lg p-2 bg-white dark:bg-neutral-900">
                    <div className="text-[10px] text-neutral-500">Bosildi</div>
                    <div className="text-sm font-bold mt-0.5">{boost.clicks.toLocaleString("uz-UZ")}</div>
                </div>
                <div className="rounded-lg p-2 bg-white dark:bg-neutral-900">
                    <div className="text-[10px] text-neutral-500">CTR</div>
                    <div className="text-sm font-bold mt-0.5 text-emerald-600">{boost.ctr}%</div>
                </div>
            </div>

            <div>
                <div className="flex items-center justify-between text-xs mb-1">
                    <span className="text-neutral-600 dark:text-neutral-400">
                        {formatMoney(boost.spentEst, "UZS")} / {formatMoney(boost.totalBudget, "UZS")}
                    </span>
                    <span className="text-neutral-500 font-semibold">{daysLeft} kun qoldi</span>
                </div>
                <div className="h-1.5 bg-neutral-200 dark:bg-neutral-800 rounded-full overflow-hidden">
                    <div className="h-full bg-amber-500" style={{ width: `${progress}%` }} />
                </div>
            </div>

            <button
                onClick={onStop}
                className="w-full py-2 rounded-lg border border-neutral-300 dark:border-neutral-700 text-xs font-medium hover:bg-neutral-50 dark:hover:bg-neutral-800 text-rose-600"
            >
                Boost'ni to&apos;xtatish
            </button>
        </div>
    );
}
