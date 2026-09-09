"use client";

// Humo AI Business Bot — qabul qilingan buyurtmalar (leads).
// Ega tab bo'yicha filtrlaydi (OPEN/CONTACTED/WON/LOST) va status o'zgartiradi.

import { useCallback, useEffect, useMemo, useState } from "react";
import {
    Users, Phone, MapPin, Package, Loader2, Check, X, Clock,
    MessageSquare, TrendingUp, Send, Trophy, XCircle,
} from "lucide-react";
import { formatMoney } from "@/lib/money";

interface Lead {
    id: string;
    customerName: string | null;
    customerPhone: string | null;
    customerAddress: string | null;
    customerTgUsername: string | null;
    customerTgId: string | null;
    productMention: string | null;
    notes: string | null;
    status: "OPEN" | "CONTACTED" | "WON" | "LOST";
    ownerNote: string | null;
    wonAmountUzs: number | null;
    contactedAt: string | null;
    createdAt: string;
}

interface Counts { OPEN?: number; CONTACTED?: number; WON?: number; LOST?: number }

const TABS: Array<{ id: Lead["status"]; label: string; icon: React.ReactNode; color: string }> = [
    { id: "OPEN",      label: "Yangi",      icon: <Clock className="w-3.5 h-3.5" />,       color: "text-sky-600" },
    { id: "CONTACTED", label: "Aloqada",    icon: <MessageSquare className="w-3.5 h-3.5" />, color: "text-amber-600" },
    { id: "WON",       label: "Yakunlandi", icon: <Trophy className="w-3.5 h-3.5" />,      color: "text-emerald-600" },
    { id: "LOST",      label: "Yo'q",       icon: <XCircle className="w-3.5 h-3.5" />,     color: "text-rose-500" },
];

export function HumoTgBotLeads() {
    const [status, setStatus] = useState<Lead["status"]>("OPEN");
    const [leads, setLeads] = useState<Lead[]>([]);
    const [counts, setCounts] = useState<Counts>({});
    const [loading, setLoading] = useState(false);

    const load = useCallback(async (s: Lead["status"]) => {
        setLoading(true);
        try {
            const r = await fetch(`/api/telegram/humo-bot/leads?status=${s}&limit=30`, { cache: "no-store" });
            if (r.ok) {
                const j = await r.json();
                setLeads(j.leads ?? []);
                setCounts(j.counts ?? {});
            }
        } catch { /* noop */ }
        finally { setLoading(false); }
    }, []);

    useEffect(() => { void load(status); }, [status, load]);

    const updateStatus = useCallback(async (id: string, next: Lead["status"], extra?: { wonAmountUzs?: number }) => {
        await fetch("/api/telegram/humo-bot/leads", {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ id, status: next, ...extra }),
        });
        void load(status);
    }, [status, load]);

    const totalOpen = counts.OPEN ?? 0;

    return (
        <div className="rounded-2xl border border-border/50 bg-card p-5 space-y-4">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-base font-semibold flex items-center gap-2">
                        <Users className="w-4 h-4 text-sky-500" />
                        Buyurtmalar (Leads)
                        {totalOpen > 0 && (
                            <span className="ml-1 px-1.5 py-0.5 rounded-full bg-sky-500 text-white text-[10px] font-semibold">
                                {totalOpen}
                            </span>
                        )}
                    </h2>
                    <p className="text-xs text-muted-foreground mt-1">
                        Mijoz Telegram Business chat'ida buyurtma bermoqchi bo'lsa — AI ism, telefon va manzilni yig'ib bu yerga saqlab qo'yadi.
                    </p>
                </div>
            </div>

            <div className="flex gap-1 border-b border-border">
                {TABS.map(t => {
                    const n = counts[t.id] ?? 0;
                    const active = status === t.id;
                    return (
                        <button
                            key={t.id}
                            onClick={() => setStatus(t.id)}
                            className={`px-3 py-2 text-sm flex items-center gap-1.5 border-b-2 -mb-px ${
                                active ? "border-primary text-foreground" : "border-transparent text-muted-foreground hover:text-foreground"
                            }`}
                        >
                            <span className={active ? t.color : ""}>{t.icon}</span>
                            {t.label}
                            {n > 0 && <span className="ml-0.5 text-[10px] px-1 rounded bg-muted">{n}</span>}
                        </button>
                    );
                })}
            </div>

            {loading ? (
                <div className="flex justify-center py-6">
                    <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
                </div>
            ) : leads.length === 0 ? (
                <div className="text-xs text-muted-foreground text-center py-6 border border-dashed border-border rounded-lg">
                    {status === "OPEN"
                        ? "Yangi buyurtmalar yo'q. AI mijoz buyurtma bermoqchi bo'lsa avto yig'adi."
                        : "Bu bo'limda buyurtma yo'q."}
                </div>
            ) : (
                <div className="space-y-3">
                    {leads.map(l => <LeadCard key={l.id} lead={l} onUpdate={updateStatus} />)}
                </div>
            )}
        </div>
    );
}

function LeadCard({ lead, onUpdate }: { lead: Lead; onUpdate: (id: string, next: Lead["status"], extra?: { wonAmountUzs?: number }) => void }) {
    const [amount, setAmount] = useState<string>("");
    const [note, setNote] = useState<string>(lead.ownerNote ?? "");
    const [showAmount, setShowAmount] = useState(false);

    const waLink = lead.customerPhone
        ? `https://wa.me/${lead.customerPhone.replace(/\D/g, "")}?text=${encodeURIComponent(`Assalomu alaykum ${lead.customerName ?? ""}, Humo AI botim orqali buyurtma qoldirgan edingiz.`)}`
        : null;
    const tgLink = lead.customerTgUsername ? `https://t.me/${lead.customerTgUsername}` : null;

    const created = new Date(lead.createdAt);
    const timeAgo = useMemo(() => formatTimeAgo(created), [created]);

    return (
        <div className="border border-border rounded-lg p-3 space-y-2 bg-background/40">
            <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                    <div className="font-medium text-sm truncate">{lead.customerName ?? "Ismsiz"}</div>
                    {lead.productMention && (
                        <div className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                            <Package className="w-3 h-3" />
                            {lead.productMention}
                        </div>
                    )}
                </div>
                <div className="text-[11px] text-muted-foreground whitespace-nowrap">{timeAgo}</div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 text-xs">
                {lead.customerPhone && (
                    <div className="flex items-center gap-1">
                        <Phone className="w-3 h-3 text-muted-foreground" />
                        <a href={`tel:${lead.customerPhone}`} className="text-foreground hover:underline">
                            {lead.customerPhone}
                        </a>
                    </div>
                )}
                {lead.customerAddress && (
                    <div className="flex items-start gap-1">
                        <MapPin className="w-3 h-3 mt-0.5 text-muted-foreground" />
                        <span className="text-foreground">{lead.customerAddress}</span>
                    </div>
                )}
            </div>

            {lead.wonAmountUzs != null && lead.wonAmountUzs > 0 && (
                <div className="text-xs text-emerald-600 font-semibold flex items-center gap-1">
                    <TrendingUp className="w-3 h-3" />
                    Sotuv: {formatMoney(lead.wonAmountUzs, "UZS")}
                </div>
            )}

            {lead.ownerNote && (
                <div className="text-xs text-muted-foreground italic">Izoh: {lead.ownerNote}</div>
            )}

            {/* Actions */}
            <div className="flex flex-wrap items-center gap-1.5 pt-1">
                {waLink && (
                    <a
                        href={waLink} target="_blank" rel="noopener"
                        className="text-xs px-2 py-1 rounded bg-emerald-500 text-white hover:bg-emerald-600 flex items-center gap-1"
                    >
                        <MessageSquare className="w-3 h-3" />
                        WhatsApp
                    </a>
                )}
                {tgLink && (
                    <a
                        href={tgLink} target="_blank" rel="noopener"
                        className="text-xs px-2 py-1 rounded bg-sky-500 text-white hover:bg-sky-600 flex items-center gap-1"
                    >
                        <Send className="w-3 h-3" />
                        Telegram
                    </a>
                )}

                {lead.status === "OPEN" && (
                    <button
                        onClick={() => onUpdate(lead.id, "CONTACTED")}
                        className="text-xs px-2 py-1 rounded border border-border hover:bg-muted flex items-center gap-1"
                    >
                        <Check className="w-3 h-3" />
                        Aloqaga chiqdim
                    </button>
                )}
                {lead.status !== "WON" && lead.status !== "LOST" && (
                    <>
                        {!showAmount ? (
                            <button
                                onClick={() => setShowAmount(true)}
                                className="text-xs px-2 py-1 rounded border border-emerald-500 text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950 flex items-center gap-1"
                            >
                                <Trophy className="w-3 h-3" />
                                Yakunlandi
                            </button>
                        ) : (
                            <div className="flex items-center gap-1">
                                <input
                                    type="number"
                                    placeholder="so'm"
                                    value={amount}
                                    onChange={e => setAmount(e.target.value)}
                                    className="w-20 px-2 py-1 text-xs rounded border border-border bg-background"
                                />
                                <button
                                    onClick={() => {
                                        const val = parseInt(amount) || 0;
                                        onUpdate(lead.id, "WON", { wonAmountUzs: val });
                                        setShowAmount(false);
                                        setAmount("");
                                    }}
                                    className="text-xs px-2 py-1 rounded bg-emerald-500 text-white"
                                >
                                    OK
                                </button>
                                <button onClick={() => setShowAmount(false)} className="text-xs px-1 text-muted-foreground">✕</button>
                            </div>
                        )}
                        <button
                            onClick={() => onUpdate(lead.id, "LOST")}
                            className="text-xs px-2 py-1 rounded border border-rose-300 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950 flex items-center gap-1"
                        >
                            <X className="w-3 h-3" />
                            Bekor
                        </button>
                    </>
                )}
            </div>
        </div>
    );
}

function formatTimeAgo(d: Date): string {
    const s = Math.floor((Date.now() - d.getTime()) / 1000);
    if (s < 60) return `${s}s`;
    if (s < 3600) return `${Math.floor(s / 60)}daq`;
    if (s < 86400) return `${Math.floor(s / 3600)}s`;
    if (s < 30 * 86400) return `${Math.floor(s / 86400)}kun`;
    return d.toLocaleDateString("uz-UZ");
}
