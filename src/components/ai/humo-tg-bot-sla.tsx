"use client";

// SLA metrikalar paneli — javob vaqti, konversion, A/B natijalari.

import { useCallback, useEffect, useState } from "react";
import { Clock, Zap, Users, Trophy, Loader2, Percent } from "lucide-react";
import { formatMoney } from "@/lib/money";

interface SlaResp {
    days: number;
    latency: { p50: number; p95: number; avg: number; count: number };
    messages: { total: number; autoReplied: number; autoReplyRate: number };
    leads: { total: number; won: number; wonRate: number };
    aiHandledRate: number;
    escalationRate: number;
    ab: {
        enabled: boolean;
        A: { total: number; won: number; lost: number; open: number; contacted: number; conversionRate: number };
        B: { total: number; won: number; lost: number; open: number; contacted: number; conversionRate: number };
    };
}

export function HumoTgBotSla() {
    const [days, setDays] = useState(14);
    const [data, setData] = useState<SlaResp | null>(null);
    const [loading, setLoading] = useState(true);

    const load = useCallback(async () => {
        setLoading(true);
        try {
            const r = await fetch(`/api/telegram/humo-bot/sla?days=${days}`, { cache: "no-store" });
            if (r.ok) setData(await r.json());
        } finally { setLoading(false); }
    }, [days]);

    useEffect(() => { void load(); }, [load]);

    return (
        <div className="rounded-2xl border border-border/50 bg-card p-5 space-y-4">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-base font-semibold flex items-center gap-2">
                        <Zap className="w-4 h-4 text-amber-500" />
                        SLA va tahlil
                    </h2>
                    <p className="text-xs text-muted-foreground mt-1">
                        AI javob tezligi, konversion daraja va A/B testing natijalari.
                    </p>
                </div>
                <select
                    value={days}
                    onChange={e => setDays(parseInt(e.target.value))}
                    className="text-xs px-2 py-1 rounded border border-border bg-background"
                >
                    <option value={7}>7 kun</option>
                    <option value={14}>14 kun</option>
                    <option value={30}>30 kun</option>
                    <option value={60}>60 kun</option>
                </select>
            </div>

            {loading || !data ? (
                <div className="flex justify-center py-6">
                    <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
                </div>
            ) : (
                <>
                    {/* Latency */}
                    <div className="grid grid-cols-3 gap-2">
                        <SlaCell icon={<Clock className="w-3.5 h-3.5" />} label="O'rtacha javob" value={fmtMs(data.latency.avg)} />
                        <SlaCell icon={<Clock className="w-3.5 h-3.5" />} label="P50" value={fmtMs(data.latency.p50)} />
                        <SlaCell icon={<Clock className="w-3.5 h-3.5" />} label="P95" value={fmtMs(data.latency.p95)} />
                    </div>

                    {/* Ish nisbatlari */}
                    <div className="grid grid-cols-2 gap-2">
                        <SlaCell
                            icon={<Zap className="w-3.5 h-3.5 text-emerald-500" />}
                            label="AI hal qildi"
                            value={`${data.aiHandledRate}%`}
                            hint={`${data.messages.total - data.leads.total} / ${data.messages.total} xabar`}
                        />
                        <SlaCell
                            icon={<Users className="w-3.5 h-3.5 text-sky-500" />}
                            label="Egaga uzatildi"
                            value={`${data.escalationRate}%`}
                            hint={`${data.leads.total} buyurtma`}
                        />
                    </div>

                    {/* Leads → won */}
                    {data.leads.total > 0 && (
                        <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/5 p-3 flex items-center gap-3">
                            <Trophy className="w-5 h-5 text-emerald-600 shrink-0" />
                            <div className="flex-1 text-sm">
                                <div className="font-medium">
                                    Konversion: <span className="text-emerald-600">{data.leads.wonRate}%</span>
                                </div>
                                <div className="text-xs text-muted-foreground mt-0.5">
                                    {data.leads.won} yakunlandi / {data.leads.total} buyurtma
                                </div>
                            </div>
                        </div>
                    )}

                    {/* A/B natijalari */}
                    {data.ab.enabled && (
                        <div className="pt-3 border-t border-border space-y-2">
                            <h3 className="text-xs font-semibold uppercase text-muted-foreground flex items-center gap-1.5">
                                <Percent className="w-3.5 h-3.5" />
                                A/B testing natijalari
                            </h3>
                            <div className="grid grid-cols-2 gap-2">
                                <VariantCard variant="A" data={data.ab.A} />
                                <VariantCard variant="B" data={data.ab.B} />
                            </div>
                            {data.ab.A.total > 0 && data.ab.B.total > 0 && (
                                <ABInsight a={data.ab.A} b={data.ab.B} />
                            )}
                        </div>
                    )}
                </>
            )}
        </div>
    );
}

function SlaCell({ icon, label, value, hint }: {
    icon: React.ReactNode; label: string; value: string; hint?: string;
}) {
    return (
        <div className="rounded-lg border border-border p-2">
            <div className="text-[10px] text-muted-foreground flex items-center gap-1">{icon}{label}</div>
            <div className="text-sm font-semibold mt-0.5">{value}</div>
            {hint && <div className="text-[10px] text-muted-foreground mt-0.5">{hint}</div>}
        </div>
    );
}

function VariantCard({ variant, data }: {
    variant: "A" | "B";
    data: { total: number; won: number; conversionRate: number };
}) {
    return (
        <div className="rounded-lg border border-border p-2.5">
            <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-semibold">Persona {variant}</span>
                <span className={`text-xs font-mono ${data.conversionRate >= 20 ? "text-emerald-600" : data.conversionRate >= 10 ? "text-amber-600" : "text-muted-foreground"}`}>
                    {data.conversionRate}%
                </span>
            </div>
            <div className="text-[11px] text-muted-foreground">
                {data.won} / {data.total} yakun
            </div>
            <div className="mt-1.5 h-1.5 bg-muted rounded-full overflow-hidden">
                <div
                    className={`h-full ${variant === "A" ? "bg-sky-500" : "bg-violet-500"}`}
                    style={{ width: `${Math.min(100, data.conversionRate)}%` }}
                />
            </div>
        </div>
    );
}

function ABInsight({ a, b }: {
    a: { conversionRate: number }; b: { conversionRate: number };
}) {
    const winner = a.conversionRate > b.conversionRate ? "A" : b.conversionRate > a.conversionRate ? "B" : null;
    const diff = Math.abs(a.conversionRate - b.conversionRate);
    if (!winner || diff < 2) {
        return (
            <div className="text-xs text-muted-foreground bg-muted/40 p-2 rounded">
                Farq kichik — ko'proq ma'lumot to'planishi kutilmoqda.
            </div>
        );
    }
    return (
        <div className="text-xs bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 p-2 rounded">
            <b>Persona {winner}</b> {diff.toFixed(1)}% ustunlik bilan g'olib.
            {diff >= 10 && " Aynan shu persona'ni asosiy sifatida qoldiring."}
        </div>
    );
}

function fmtMs(ms: number): string {
    if (ms === 0) return "—";
    if (ms < 1000) return `${ms}ms`;
    return `${(ms / 1000).toFixed(1)}s`;
}
