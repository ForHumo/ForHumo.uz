"use client";

import { useEffect, useState } from "react";
import { Link, useRouter } from "@/i18n/routing";
import { Users, Plus, ArrowLeft, Loader2, Shield, KeyRound, ChevronRight, AlertTriangle, X } from "lucide-react";

interface TeamLite { id: string; name: string; tag: string; logo: string | null; rosters?: number; isOwner: boolean }

const BG = "linear-gradient(160deg,#060A18 0%,#0B1226 55%,#0A0F22 100%)";
const ACCENT = "linear-gradient(135deg,#2B3EE8,#00CEC8)";
const card = { background: "rgba(10,16,34,0.72)", border: "1px solid rgba(43,62,232,0.20)" };
const soft = { background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)" };

export default function TeamsView() {
    const router = useRouter();
    const [loading, setLoading] = useState(true);
    const [owned, setOwned] = useState<TeamLite[]>([]);
    const [memberTeam, setMemberTeam] = useState<TeamLite | null>(null);
    const [hasAthlete, setHasAthlete] = useState(false);
    const [mode, setMode] = useState<"" | "create" | "join">("");

    // create form
    const [name, setName] = useState("");
    const [tag, setTag] = useState("");
    const [bio, setBio] = useState("");
    const [code, setCode] = useState("");
    const [busy, setBusy] = useState(false);
    const [err, setErr] = useState("");

    async function load() {
        const d = await fetch("/api/esport/teams").then(r => r.json()).catch(() => ({}));
        setOwned(d.owned || []);
        setMemberTeam(d.memberTeam || null);
        setHasAthlete(!!d.hasAthlete);
        setLoading(false);
    }
    useEffect(() => { load(); }, []);

    async function createTeam() {
        setErr("");
        if (name.trim().length < 2) return setErr("Jamoa nomi kamida 2 belgi");
        if (!/^[A-Za-z0-9]{2,5}$/.test(tag.trim())) return setErr("Teg 2-5 ta lotin harf/raqam");
        setBusy(true);
        const res = await fetch("/api/esport/teams", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name, tag, bio }) }).then(r => r.json()).catch(() => ({ error: "Tarmoq xatosi" }));
        setBusy(false);
        if (res.error) return setErr(res.error);
        router.push(`/esport/teams/${res.team.id}`);
    }

    async function joinByCode() {
        setErr("");
        if (!code.trim()) return setErr("Kod kiriting");
        setBusy(true);
        const res = await fetch("/api/esport/teams/join", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ code }) }).then(r => r.json()).catch(() => ({ error: "Tarmoq xatosi" }));
        setBusy(false);
        if (res.error) return setErr(res.error);
        router.push(`/esport/teams/${res.teamId}`);
    }

    if (loading) return <main className="flex items-center justify-center py-24" style={{ background: BG }}><Loader2 className="h-7 w-7 animate-spin text-white/40" /></main>;

    return (
        <main className="min-h-full" style={{ background: BG }}>
            <div className="mx-auto w-full max-w-3xl px-5 py-8">
                {/* Header */}
                <div className="mb-6 flex items-center gap-3">
                    <Link href="/esport" className="flex h-9 w-9 items-center justify-center rounded-xl" style={{ background: "rgba(43,62,232,0.18)", border: "1px solid rgba(43,62,232,0.30)" }}>
                        <ArrowLeft className="h-4 w-4 text-white/80" />
                    </Link>
                    <div className="flex items-center gap-2">
                        <div className="flex h-9 w-9 items-center justify-center rounded-xl" style={{ background: ACCENT }}><Users className="h-5 w-5 text-white" /></div>
                        <h1 className="text-lg font-black text-white">Jamoalar</h1>
                    </div>
                </div>

                {/* Amallar */}
                <div className="mb-5 grid grid-cols-2 gap-3">
                    <button onClick={() => { setMode(mode === "create" ? "" : "create"); setErr(""); }} className="flex items-center justify-center gap-2 rounded-2xl py-3 text-sm font-bold text-white" style={{ background: ACCENT }}>
                        <Plus className="h-4 w-4" /> Jamoa yaratish
                    </button>
                    <button onClick={() => { setMode(mode === "join" ? "" : "join"); setErr(""); }} className="flex items-center justify-center gap-2 rounded-2xl py-3 text-sm font-bold text-white/85" style={card}>
                        <KeyRound className="h-4 w-4" /> Kod bilan
                    </button>
                </div>

                {/* Create form */}
                {mode === "create" && (
                    <div className="mb-5 rounded-3xl p-5" style={card}>
                        <div className="mb-3 flex items-center justify-between">
                            <p className="text-sm font-black text-white">Yangi jamoa</p>
                            <button onClick={() => setMode("")}><X className="h-4 w-4 text-white/40" /></button>
                        </div>
                        <div className="space-y-2.5">
                            <input value={name} onChange={e => setName(e.target.value)} placeholder="Jamoa nomi" className="w-full rounded-2xl px-4 py-3 text-sm font-semibold text-white outline-none placeholder:text-white/30" style={soft} />
                            <input value={tag} onChange={e => setTag(e.target.value.toUpperCase())} maxLength={5} placeholder="Teg (masalan RMC)" className="w-full rounded-2xl px-4 py-3 text-sm font-semibold uppercase text-white outline-none placeholder:text-white/30" style={soft} />
                            <input value={bio} onChange={e => setBio(e.target.value)} placeholder="Qisqa tavsif (ixtiyoriy)" className="w-full rounded-2xl px-4 py-3 text-sm font-semibold text-white outline-none placeholder:text-white/30" style={soft} />
                        </div>
                        {err && <ErrBox msg={err} />}
                        <button onClick={createTeam} disabled={busy} className="mt-3 flex w-full items-center justify-center gap-2 rounded-2xl py-3 text-sm font-black text-white disabled:opacity-60" style={{ background: ACCENT }}>
                            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Shield className="h-4 w-4" />} Yaratish
                        </button>
                    </div>
                )}

                {/* Join form */}
                {mode === "join" && (
                    <div className="mb-5 rounded-3xl p-5" style={card}>
                        <div className="mb-3 flex items-center justify-between">
                            <p className="text-sm font-black text-white">Taklif-kod bilan qo'shilish</p>
                            <button onClick={() => setMode("")}><X className="h-4 w-4 text-white/40" /></button>
                        </div>
                        {!hasAthlete && <p className="mb-2 text-xs text-[#FFB020]">Avval sportchi profilini yarating.</p>}
                        <input value={code} onChange={e => setCode(e.target.value.toUpperCase())} placeholder="KOD" className="w-full rounded-2xl px-4 py-3 text-center text-base font-black tracking-widest text-white outline-none placeholder:text-white/30" style={soft} />
                        {err && <ErrBox msg={err} />}
                        <button onClick={joinByCode} disabled={busy} className="mt-3 flex w-full items-center justify-center gap-2 rounded-2xl py-3 text-sm font-black text-white disabled:opacity-60" style={{ background: ACCENT }}>
                            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <KeyRound className="h-4 w-4" />} Qo'shilish
                        </button>
                    </div>
                )}

                {/* Mening jamoalarim */}
                {owned.length === 0 && !memberTeam ? (
                    <div className="rounded-3xl p-8 text-center" style={card}>
                        <Users className="mx-auto h-10 w-10 text-white/25" />
                        <p className="mt-3 text-sm font-bold text-white/70">Hali jamoa yo'q</p>
                        <p className="mt-1 text-xs text-white/40">Jamoa yarating yoki taklif-kod bilan qo'shiling.</p>
                    </div>
                ) : (
                    <div className="grid gap-2.5 sm:grid-cols-2">
                        {owned.map(t => <TeamRow key={t.id} t={t} />)}
                        {memberTeam && <TeamRow t={memberTeam} />}
                    </div>
                )}
            </div>
        </main>
    );
}

function TeamRow({ t }: { t: TeamLite }) {
    return (
        <Link href={`/esport/teams/${t.id}`} className="flex items-center gap-3 rounded-2xl p-3.5" style={{ background: "rgba(10,16,34,0.72)", border: "1px solid rgba(43,62,232,0.20)" }}>
            <div className="flex h-11 w-11 items-center justify-center rounded-xl text-sm font-black text-white" style={{ background: ACCENT }}>
                {t.logo ? <img src={t.logo} alt="" className="h-full w-full rounded-xl object-cover" /> : t.tag.slice(0, 3)}
            </div>
            <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-bold text-white">{t.name}</p>
                <p className="text-xs font-semibold text-white/45">[{t.tag}] {t.isOwner ? "• Egasi" : "• A'zo"}</p>
            </div>
            <ChevronRight className="h-4 w-4 text-white/30" />
        </Link>
    );
}

function ErrBox({ msg }: { msg: string }) {
    return (
        <div className="mt-3 flex items-center gap-2 rounded-2xl px-4 py-2.5" style={{ background: "rgba(255,60,60,0.10)", border: "1px solid rgba(255,60,60,0.3)" }}>
            <AlertTriangle className="h-4 w-4 text-red-400" />
            <span className="text-xs font-semibold text-red-300">{msg}</span>
        </div>
    );
}
