"use client";

import { useCallback, useEffect, useState } from "react";
import { Link } from "@/i18n/routing";
import {
    ArrowLeft, Loader2, ArrowLeftRight, Search, Coins, Check, X,
    UserPlus, AlertTriangle, Send,
} from "lucide-react";

interface Offer { id: string; fee: number; feeLabel: string; athleteId: string; ign: string; athleteName: string; toTeam: { name: string; tag: string } | null; fromTeam: { name: string; tag: string } | null; iAmAthlete: boolean; iAmBuyer: boolean }
interface Team { id: string; name: string; tag: string }
interface Found { id: string; ign: string; role: string | null; name: string; image: string | null; game: { name: string } | null; team: { name: string; tag: string } | null }

const BG = "linear-gradient(160deg,#060A18 0%,#0B1226 55%,#0A0F22 100%)";
const ACCENT = "linear-gradient(135deg,#2B3EE8,#00CEC8)";
const card = { background: "rgba(10,16,34,0.72)", border: "1px solid rgba(43,62,232,0.20)" };
const soft = { background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)" };

export default function TransfersView() {
    const [loading, setLoading] = useState(true);
    const [incoming, setIncoming] = useState<Offer[]>([]);
    const [outgoing, setOutgoing] = useState<Offer[]>([]);
    const [teams, setTeams] = useState<Team[]>([]);
    const [busy, setBusy] = useState(false);
    const [err, setErr] = useState("");

    // make offer
    const [buyerTeam, setBuyerTeam] = useState("");
    const [q, setQ] = useState("");
    const [found, setFound] = useState<Found[]>([]);
    const [target, setTarget] = useState<Found | null>(null);
    const [fee, setFee] = useState("");

    const load = useCallback(async () => {
        const [tr, tm] = await Promise.all([
            fetch("/api/esport/transfers").then(r => r.json()).catch(() => ({})),
            fetch("/api/esport/teams").then(r => r.json()).catch(() => ({})),
        ]);
        setIncoming(tr.incoming || []); setOutgoing(tr.outgoing || []);
        setTeams((tm.owned || []).map((t: Team) => ({ id: t.id, name: t.name, tag: t.tag })));
        setLoading(false);
    }, []);
    useEffect(() => { load(); }, [load]);

    useEffect(() => {
        if (q.trim().length < 2) { setFound([]); return; }
        const id = setTimeout(() => {
            fetch(`/api/esport/athletes/search?q=${encodeURIComponent(q)}`).then(r => r.json()).then(d => setFound(d.athletes || [])).catch(() => { });
        }, 300);
        return () => clearTimeout(id);
    }, [q]);

    async function act(id: string, action: string) {
        setBusy(true); setErr("");
        const r = await fetch(`/api/esport/transfers/${id}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action }) }).then(x => x.json()).catch(() => ({ error: "Xato" }));
        setBusy(false);
        if (r.error) setErr(r.error); else load();
    }

    async function sendOffer() {
        if (!buyerTeam || !target) return setErr("Jamoa va sportchini tanlang");
        setBusy(true); setErr("");
        const r = await fetch("/api/esport/transfers", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ athleteId: target.id, toTeamId: buyerTeam, fee: fee ? Number(fee) : 0 }) }).then(x => x.json()).catch(() => ({ error: "Xato" }));
        setBusy(false);
        if (r.error) return setErr(r.error);
        setTarget(null); setQ(""); setFee(""); setFound([]); load();
    }

    if (loading) return <main className="flex items-center justify-center py-24" style={{ background: BG }}><Loader2 className="h-7 w-7 animate-spin text-white/40" /></main>;

    return (
        <main className="min-h-full" style={{ background: BG }}>
            <div className="mx-auto w-full max-w-3xl px-5 py-8">
                <div className="mb-6 flex items-center gap-3">
                    <Link href="/esport" className="flex h-9 w-9 items-center justify-center rounded-xl" style={{ background: "rgba(43,62,232,0.18)", border: "1px solid rgba(43,62,232,0.30)" }}><ArrowLeft className="h-4 w-4 text-white/80" /></Link>
                    <div className="flex items-center gap-2">
                        <div className="flex h-9 w-9 items-center justify-center rounded-xl" style={{ background: ACCENT }}><ArrowLeftRight className="h-5 w-5 text-white" /></div>
                        <h1 className="text-lg font-black text-white">Transfer bozori</h1>
                    </div>
                </div>

                {err && <div className="mb-4 flex items-center gap-2 rounded-2xl px-4 py-2.5" style={{ background: "rgba(255,60,60,0.10)", border: "1px solid rgba(255,60,60,0.3)" }}><AlertTriangle className="h-4 w-4 text-red-400" /><span className="text-xs font-semibold text-red-300">{err}</span></div>}

                {/* Incoming (sportchi tasdig'i) */}
                {incoming.length > 0 && (
                    <div className="mb-5">
                        <p className="mb-2 px-1 text-xs font-black uppercase tracking-wide text-[#00CEC8]">Sizga takliflar</p>
                        <div className="space-y-2">
                            {incoming.map(o => (
                                <div key={o.id} className="rounded-2xl p-4" style={card}>
                                    <p className="text-sm font-bold text-white">{o.toTeam?.name} jamoasiga taklif</p>
                                    <p className="mt-0.5 text-xs text-white/45">{o.fromTeam ? `${o.fromTeam.name}dan` : "Erkin sportchi"} · Haq: <span className="font-bold text-[#FFB020]">{o.feeLabel}</span></p>
                                    <div className="mt-3 flex gap-2">
                                        <button onClick={() => act(o.id, "approve")} disabled={busy} className="flex flex-1 items-center justify-center gap-1.5 rounded-xl py-2.5 text-sm font-bold text-white" style={{ background: ACCENT }}><Check className="h-4 w-4" /> Qabul</button>
                                        <button onClick={() => act(o.id, "reject")} disabled={busy} className="flex flex-1 items-center justify-center gap-1.5 rounded-xl py-2.5 text-sm font-bold text-white/70" style={soft}><X className="h-4 w-4" /> Rad</button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Make offer */}
                <div className="mb-5 rounded-3xl p-5" style={card}>
                    <p className="mb-3 text-sm font-black text-white">Sportchiga taklif yuborish</p>
                    {teams.length === 0 ? (
                        <p className="text-xs text-white/45">Avval jamoa tuzing.</p>
                    ) : (
                        <div className="space-y-3">
                            <div>
                                <p className="mb-1 text-[10px] font-bold uppercase text-white/35">Qaysi jamoaga</p>
                                <div className="flex flex-wrap gap-1.5">
                                    {teams.map(t => <button key={t.id} onClick={() => setBuyerTeam(t.id)} className="rounded-lg px-3 py-1.5 text-xs font-bold" style={buyerTeam === t.id ? { background: ACCENT, color: "#fff" } : soft}>{t.tag}</button>)}
                                </div>
                            </div>
                            {target ? (
                                <div className="flex items-center gap-3 rounded-2xl p-3" style={soft}>
                                    <span className="flex h-8 w-8 items-center justify-center rounded-lg text-[10px] font-black text-white" style={{ background: ACCENT }}>{target.ign.slice(0, 2).toUpperCase()}</span>
                                    <div className="min-w-0 flex-1"><p className="truncate text-sm font-bold text-white">{target.ign}</p><p className="truncate text-[11px] text-white/40">{target.team ? target.team.name : "Erkin"} · {target.game?.name}</p></div>
                                    <button onClick={() => setTarget(null)}><X className="h-4 w-4 text-white/40" /></button>
                                </div>
                            ) : (
                                <div>
                                    <div className="flex items-center gap-2 rounded-2xl px-3 py-2.5" style={soft}>
                                        <Search className="h-4 w-4 text-white/35" />
                                        <input value={q} onChange={e => setQ(e.target.value)} placeholder="Sportchi nickname'i" className="w-full bg-transparent text-sm font-semibold text-white outline-none placeholder:text-white/30" />
                                    </div>
                                    {found.length > 0 && (
                                        <div className="mt-2 space-y-1">
                                            {found.map(f => (
                                                <button key={f.id} onClick={() => { setTarget(f); setFound([]); setQ(""); }} className="flex w-full items-center gap-3 rounded-xl p-2.5 text-left" style={soft}>
                                                    <span className="flex h-7 w-7 items-center justify-center rounded-lg text-[10px] font-black text-white" style={{ background: ACCENT }}>{f.ign.slice(0, 2).toUpperCase()}</span>
                                                    <div className="min-w-0 flex-1"><p className="truncate text-sm font-bold text-white">{f.ign}</p><p className="truncate text-[11px] text-white/40">{f.team ? f.team.tag : "Erkin"} · {f.name}</p></div>
                                                    <UserPlus className="h-4 w-4 text-white/30" />
                                                </button>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            )}
                            <div className="flex items-center gap-2 rounded-2xl px-3 py-2.5" style={soft}>
                                <Coins className="h-4 w-4 text-[#FFB020]" />
                                <input value={fee} onChange={e => setFee(e.target.value)} placeholder="Transfer haqi (so'm, 0=bepul)" inputMode="numeric" className="w-full bg-transparent text-sm font-semibold text-white outline-none placeholder:text-white/30" />
                            </div>
                            <button onClick={sendOffer} disabled={busy || !target || !buyerTeam} className="flex w-full items-center justify-center gap-2 rounded-2xl py-3 text-sm font-black text-white disabled:opacity-50" style={{ background: ACCENT }}>
                                {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />} Taklif yuborish
                            </button>
                        </div>
                    )}
                </div>

                {/* Outgoing / active */}
                {outgoing.length > 0 && (
                    <div>
                        <p className="mb-2 px-1 text-xs font-black uppercase tracking-wide text-white/40">Faol takliflar</p>
                        <div className="space-y-2">
                            {outgoing.map(o => (
                                <div key={o.id} className="flex items-center gap-2 rounded-2xl p-3.5" style={card}>
                                    <div className="min-w-0 flex-1">
                                        <p className="truncate text-sm font-bold text-white">{o.ign} → {o.toTeam?.tag}</p>
                                        <p className="text-[11px] text-white/40">{o.fromTeam ? `${o.fromTeam.tag}dan` : "Erkin"} · {o.feeLabel} · sportchi javobini kutyapti</p>
                                    </div>
                                    {o.iAmBuyer && <button onClick={() => act(o.id, "cancel")} disabled={busy} className="rounded-lg px-3 py-1.5 text-xs font-bold text-red-300" style={{ background: "rgba(255,60,60,0.1)" }}>Bekor</button>}
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        </main>
    );
}
