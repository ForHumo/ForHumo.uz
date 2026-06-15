"use client";

import { useEffect, useState, useCallback } from "react";
import { Link, useRouter } from "@/i18n/routing";
import {
    ArrowLeft, Loader2, Shield, Crown, Copy, Check, UserPlus, Inbox,
    LogOut, Trash2, ChevronRight, BadgeCheck, X, AlertTriangle, Settings2,
} from "lucide-react";

interface Member { athleteId: string; role: string; ign: string; gameUserId: string; gameServer: string | null; position: string | null; name: string; username: string | null; image: string | null; humoId: string | null; verified: boolean }
interface Roster { id: string; game: { slug: string; name: string; teamSize: number }; rating: number; members: Member[] }
interface Team { id: string; name: string; tag: string; logo: string | null; bio: string | null; isOwner: boolean; amIMember: boolean; myAthleteId: string | null; pendingRequests: number; rosters: Roster[] }
interface JoinReq { id: string; athleteId: string; ign: string; position: string | null; game: string; name: string; username: string | null; image: string | null }

const BG = "linear-gradient(160deg,#060A18 0%,#0B1226 55%,#0A0F22 100%)";
const ACCENT = "linear-gradient(135deg,#2B3EE8,#00CEC8)";
const card = { background: "rgba(10,16,34,0.72)", border: "1px solid rgba(43,62,232,0.20)" };
const soft = { background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)" };
const ROLES = ["CAPTAIN", "STARTER", "SUB"];
const roleLabel: Record<string, string> = { CAPTAIN: "Kapitan", STARTER: "Asosiy", SUB: "Zaxira" };

export default function TeamDetail({ teamId }: { teamId: string }) {
    const router = useRouter();
    const [team, setTeam] = useState<Team | null>(null);
    const [loading, setLoading] = useState(true);
    const [code, setCode] = useState("");
    const [copied, setCopied] = useState(false);
    const [reqOpen, setReqOpen] = useState(false);
    const [reqs, setReqs] = useState<JoinReq[]>([]);
    const [sel, setSel] = useState<string | null>(null); // tanlangan a'zo (rol/kick)
    const [busy, setBusy] = useState(false);
    const [err, setErr] = useState("");

    const load = useCallback(async () => {
        const d = await fetch(`/api/esport/teams/${teamId}`).then(r => r.json()).catch(() => ({}));
        if (d.error) { setErr(d.error); setLoading(false); return; }
        setTeam(d.team); setLoading(false);
    }, [teamId]);
    useEffect(() => { load(); }, [load]);

    async function genCode() {
        setBusy(true);
        const res = await fetch(`/api/esport/teams/${teamId}/invite`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ maxUses: 10, expiresHours: 168 }) }).then(r => r.json()).catch(() => ({}));
        setBusy(false);
        if (res.code) setCode(res.code);
    }
    async function loadReqs() {
        const d = await fetch(`/api/esport/teams/${teamId}/join-request`).then(r => r.json()).catch(() => ({}));
        setReqs(d.requests || []);
    }
    async function actReq(id: string, action: "accept" | "reject") {
        await fetch(`/api/esport/join-requests/${id}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action }) });
        await loadReqs(); await load();
    }
    async function setRole(athleteId: string, role: string) {
        await fetch(`/api/esport/teams/${teamId}/members`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ athleteId, role }) });
        setSel(null); await load();
    }
    async function kick(athleteId: string) {
        await fetch(`/api/esport/teams/${teamId}/members`, { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ athleteId }) });
        setSel(null); await load();
    }
    async function joinRequest() {
        setBusy(true);
        const res = await fetch(`/api/esport/teams/${teamId}/join-request`, { method: "POST" }).then(r => r.json()).catch(() => ({ error: "Xato" }));
        setBusy(false);
        if (res.error) setErr(res.error); else setErr("Ariza yuborildi");
    }
    async function leave() {
        if (!team?.myAthleteId) return;
        await fetch(`/api/esport/teams/${teamId}/members`, { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ athleteId: team.myAthleteId }) });
        router.push("/esport/teams");
    }
    async function del() {
        await fetch(`/api/esport/teams/${teamId}`, { method: "DELETE" });
        router.push("/esport/teams");
    }

    if (loading) return <main className="flex items-center justify-center py-24" style={{ background: BG }}><Loader2 className="h-7 w-7 animate-spin text-white/40" /></main>;
    if (!team) return <main className="flex flex-col items-center justify-center py-24 gap-3" style={{ background: BG }}><p className="text-sm text-white/60">{err || "Jamoa topilmadi"}</p><Link href="/esport/teams" className="text-sm font-bold text-[#00CEC8]">Orqaga</Link></main>;

    return (
        <main className="min-h-full" style={{ background: BG }}>
            <div className="mx-auto w-full max-w-3xl px-5 py-8">
                {/* Header */}
                <div className="mb-5 flex items-center gap-3">
                    <Link href="/esport/teams" className="flex h-9 w-9 items-center justify-center rounded-xl" style={{ background: "rgba(43,62,232,0.18)", border: "1px solid rgba(43,62,232,0.30)" }}><ArrowLeft className="h-4 w-4 text-white/80" /></Link>
                    <span className="text-sm font-bold text-white/50">Jamoa</span>
                </div>

                {/* Team card */}
                <div className="mb-5 rounded-3xl p-5" style={card}>
                    <div className="flex items-center gap-4">
                        <div className="flex h-16 w-16 items-center justify-center rounded-2xl text-lg font-black text-white" style={{ background: ACCENT }}>
                            {team.logo ? <img src={team.logo} alt="" className="h-full w-full rounded-2xl object-cover" /> : team.tag.slice(0, 3)}
                        </div>
                        <div className="min-w-0 flex-1">
                            <p className="truncate text-xl font-black text-white">{team.name}</p>
                            <p className="text-sm font-bold text-white/45">[{team.tag}]</p>
                            {team.isOwner && <span className="mt-1 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-bold text-[#00CEC8]" style={{ background: "rgba(0,206,200,0.12)" }}><Crown className="h-3 w-3" /> Egasi</span>}
                        </div>
                    </div>
                    {team.bio && <p className="mt-3 text-xs text-white/55">{team.bio}</p>}
                </div>

                {/* Owner actions */}
                {team.isOwner && (
                    <div className="mb-5 space-y-3">
                        <div className="grid grid-cols-2 gap-3">
                            <button onClick={genCode} disabled={busy} className="flex items-center justify-center gap-2 rounded-2xl py-3 text-sm font-bold text-white" style={{ background: ACCENT }}><UserPlus className="h-4 w-4" /> Taklif-kod</button>
                            <button onClick={() => { setReqOpen(o => !o); if (!reqOpen) loadReqs(); }} className="relative flex items-center justify-center gap-2 rounded-2xl py-3 text-sm font-bold text-white/85" style={card}>
                                <Inbox className="h-4 w-4" /> Arizalar
                                {team.pendingRequests > 0 && <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full px-1 text-[11px] font-black text-white" style={{ background: "#FF3C5F" }}>{team.pendingRequests}</span>}
                            </button>
                        </div>
                        {code && (
                            <div className="flex items-center justify-between rounded-2xl px-4 py-3" style={{ background: "rgba(0,206,200,0.08)", border: "1px solid rgba(0,206,200,0.3)" }}>
                                <span className="text-lg font-black tracking-widest text-white">{code}</span>
                                <button onClick={() => { navigator.clipboard?.writeText(code); setCopied(true); setTimeout(() => setCopied(false), 1500); }} className="flex items-center gap-1.5 text-xs font-bold text-[#00CEC8]">{copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}{copied ? "Nusxalandi" : "Nusxa"}</button>
                            </div>
                        )}
                        {reqOpen && (
                            <div className="rounded-2xl p-2" style={card}>
                                {reqs.length === 0 ? <p className="py-4 text-center text-xs text-white/40">Yangi ariza yo'q</p> : reqs.map(r => (
                                    <div key={r.id} className="flex items-center gap-2 rounded-xl p-2">
                                        <Avatar image={r.image} fallback={r.ign} />
                                        <div className="min-w-0 flex-1"><p className="truncate text-sm font-bold text-white">{r.ign}</p><p className="truncate text-[11px] text-white/40">{r.name} · {r.position || r.game}</p></div>
                                        <button onClick={() => actReq(r.id, "accept")} className="flex h-8 w-8 items-center justify-center rounded-lg text-white" style={{ background: ACCENT }}><Check className="h-4 w-4" /></button>
                                        <button onClick={() => actReq(r.id, "reject")} className="flex h-8 w-8 items-center justify-center rounded-lg" style={soft}><X className="h-4 w-4 text-white/60" /></button>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}

                {/* Rosters */}
                {team.rosters.length === 0 ? (
                    <div className="rounded-3xl p-8 text-center" style={card}><Shield className="mx-auto h-10 w-10 text-white/25" /><p className="mt-3 text-sm font-bold text-white/65">Tarkib bo'sh</p><p className="mt-1 text-xs text-white/40">{team.isOwner ? "Taklif-kod bilan sportchilarni qo'shing." : "Hali a'zo yo'q."}</p></div>
                ) : team.rosters.map(r => (
                    <div key={r.id} className="mb-4 rounded-3xl p-4" style={card}>
                        <div className="mb-3 flex items-center justify-between px-1">
                            <p className="text-sm font-black text-white">{r.game.name}</p>
                            <span className="flex items-center gap-2 text-[11px] font-bold text-white/40">
                                <span className="text-[#00CEC8]">Elo {r.rating}</span>
                                <span>{r.members.length}/{r.game.teamSize}+</span>
                            </span>
                        </div>
                        <div className="space-y-1.5">
                            {r.members.map(m => (
                                <div key={m.athleteId}>
                                    <div className="flex items-center gap-3 rounded-2xl p-2.5" style={soft}>
                                        <Link href={`/esport/a/${m.athleteId}`} className="flex min-w-0 flex-1 items-center gap-3">
                                            <Avatar image={m.image} fallback={m.ign} />
                                            <div className="min-w-0 flex-1">
                                                <p className="flex items-center gap-1 truncate text-sm font-bold text-white">{m.ign}{m.verified && <BadgeCheck className="h-3.5 w-3.5 text-[#00CEC8]" />}</p>
                                                <p className="truncate text-[11px] text-white/40">{m.name}{m.position ? ` · ${m.position}` : ""}</p>
                                            </div>
                                        </Link>
                                        <span className="flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-bold" style={m.role === "CAPTAIN" ? { background: "rgba(0,206,200,0.14)", color: "#00CEC8" } : { background: "rgba(255,255,255,0.05)", color: "rgba(255,255,255,0.5)" }}>
                                            {m.role === "CAPTAIN" && <Crown className="h-3 w-3" />}{roleLabel[m.role]}
                                        </span>
                                        {team.isOwner && m.role !== "CAPTAIN" && <button onClick={() => setSel(sel === m.athleteId ? null : m.athleteId)} className="flex h-7 w-7 items-center justify-center rounded-lg" style={{ background: "rgba(255,255,255,0.05)" }}><Settings2 className="h-3.5 w-3.5 text-white/50" /></button>}
                                    </div>
                                    {sel === m.athleteId && team.isOwner && (
                                        <div className="mt-1.5 flex flex-wrap gap-1.5 rounded-2xl p-2" style={soft}>
                                            {ROLES.filter(x => x !== "CAPTAIN").map(rl => (
                                                <button key={rl} onClick={() => setRole(m.athleteId, rl)} className="rounded-lg px-3 py-1.5 text-xs font-bold" style={m.role === rl ? { background: ACCENT, color: "#fff" } : { background: "rgba(255,255,255,0.05)", color: "rgba(255,255,255,0.7)" }}>{roleLabel[rl]}</button>
                                            ))}
                                            <button onClick={() => kick(m.athleteId)} className="ml-auto flex items-center gap-1 rounded-lg px-3 py-1.5 text-xs font-bold text-red-300" style={{ background: "rgba(255,60,60,0.10)" }}><Trash2 className="h-3.5 w-3.5" /> Chiqarish</button>
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>
                ))}

                {/* Sportchi amallari */}
                {!team.isOwner && team.myAthleteId && (
                    team.amIMember ? (
                        <button onClick={leave} className="mt-2 flex w-full items-center justify-center gap-2 rounded-2xl py-3 text-sm font-bold text-red-300" style={{ background: "rgba(255,60,60,0.10)", border: "1px solid rgba(255,60,60,0.25)" }}><LogOut className="h-4 w-4" /> Jamoadan chiqish</button>
                    ) : (
                        <button onClick={joinRequest} disabled={busy} className="mt-2 flex w-full items-center justify-center gap-2 rounded-2xl py-3 text-sm font-bold text-white" style={{ background: ACCENT }}>{busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <UserPlus className="h-4 w-4" />} Ariza berish</button>
                    )
                )}
                {err && <div className="mt-3 flex items-center gap-2 rounded-2xl px-4 py-2.5" style={{ background: "rgba(43,62,232,0.10)", border: "1px solid rgba(43,62,232,0.3)" }}><AlertTriangle className="h-4 w-4 text-white/50" /><span className="text-xs font-semibold text-white/70">{err}</span></div>}

                {/* Egasi: o'chirish */}
                {team.isOwner && (
                    <button onClick={del} className="mt-6 flex w-full items-center justify-center gap-2 rounded-2xl py-3 text-xs font-bold text-red-300/70" style={{ background: "rgba(255,60,60,0.06)" }}><Trash2 className="h-3.5 w-3.5" /> Jamoani o'chirish</button>
                )}
            </div>
        </main>
    );
}

function Avatar({ image, fallback }: { image: string | null; fallback: string }) {
    return image
        ? <img src={image} alt="" className="h-9 w-9 rounded-xl object-cover" />
        : <div className="flex h-9 w-9 items-center justify-center rounded-xl text-xs font-black text-white" style={{ background: ACCENT }}>{fallback.slice(0, 2).toUpperCase()}</div>;
}
