"use client";

import { useCallback, useEffect, useState } from "react";
import { Link, useRouter } from "@/i18n/routing";
import { Users, Plus, ArrowLeft, Loader2, Shield, KeyRound, ChevronRight, AlertTriangle, X, TrendingUp, Gamepad2, Star } from "lucide-react";

interface TeamCard { id: string; name: string; tag: string; logo: string | null; rating: number; members: number; games: string[]; isMine: boolean }

export default function TeamsView() {
    const router = useRouter();
    const [loading, setLoading] = useState(true);
    const [teams, setTeams] = useState<TeamCard[]>([]);
    const [hasTeam, setHasTeam] = useState(false);
    const [mode, setMode] = useState<"" | "create" | "join">("");

    const [name, setName] = useState("");
    const [tag, setTag] = useState("");
    const [bio, setBio] = useState("");
    const [code, setCode] = useState("");
    const [busy, setBusy] = useState(false);
    const [err, setErr] = useState("");

    const load = useCallback(async () => {
        const d = await fetch("/api/esport/teams/all").then(r => r.json()).catch(() => ({}));
        setTeams(d.teams || []); setHasTeam(!!d.hasTeam); setLoading(false);
    }, []);
    useEffect(() => { load(); }, [load]);

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

    return (
        <div className="mx-auto w-full max-w-5xl px-4 py-6 sm:px-6 sm:py-8">
            <div className="mb-5 flex items-center gap-3">
                <Link href="/esport" className="flex h-9 w-9 items-center justify-center rounded-xl es-soft"><ArrowLeft className="h-4 w-4 es-fg" /></Link>
                <div className="flex items-center gap-2">
                    <div className="flex h-9 w-9 items-center justify-center rounded-xl es-accent-bg"><Users className="h-5 w-5 text-white" /></div>
                    <h1 className="text-lg font-black es-fg">Jamoalar</h1>
                </div>
            </div>

            {/* Jamoasizlar uchun: yaratish/qo'shilish */}
            {!hasTeam && (
                <div className="mb-5">
                    <div className="grid grid-cols-2 gap-3">
                        <button onClick={() => { setMode(mode === "create" ? "" : "create"); setErr(""); }} className="flex items-center justify-center gap-2 rounded-2xl py-3 text-sm font-bold text-white es-accent-bg"><Plus className="h-4 w-4" /> Jamoa yaratish</button>
                        <button onClick={() => { setMode(mode === "join" ? "" : "join"); setErr(""); }} className="flex items-center justify-center gap-2 rounded-2xl py-3 text-sm font-bold es-fg es-card"><KeyRound className="h-4 w-4" /> Kod bilan</button>
                    </div>

                    {mode === "create" && (
                        <div className="mt-3 rounded-3xl p-5 es-card">
                            <div className="mb-3 flex items-center justify-between"><p className="text-sm font-black es-fg">Yangi jamoa</p><button onClick={() => setMode("")}><X className="h-4 w-4 es-mut" /></button></div>
                            <div className="space-y-2.5">
                                <input value={name} onChange={e => setName(e.target.value)} placeholder="Jamoa nomi" className="w-full rounded-2xl px-4 py-3 text-sm font-semibold es-fg es-soft outline-none placeholder:opacity-50" />
                                <input value={tag} onChange={e => setTag(e.target.value.toUpperCase())} maxLength={5} placeholder="Teg (masalan RMC)" className="w-full rounded-2xl px-4 py-3 text-sm font-semibold uppercase es-fg es-soft outline-none placeholder:opacity-50" />
                                <input value={bio} onChange={e => setBio(e.target.value)} placeholder="Qisqa tavsif (ixtiyoriy)" className="w-full rounded-2xl px-4 py-3 text-sm font-semibold es-fg es-soft outline-none placeholder:opacity-50" />
                            </div>
                            {err && <ErrBox msg={err} />}
                            <button onClick={createTeam} disabled={busy} className="mt-3 flex w-full items-center justify-center gap-2 rounded-2xl py-3 text-sm font-black text-white es-accent-bg disabled:opacity-60">{busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Shield className="h-4 w-4" />} Yaratish</button>
                        </div>
                    )}
                    {mode === "join" && (
                        <div className="mt-3 rounded-3xl p-5 es-card">
                            <div className="mb-3 flex items-center justify-between"><p className="text-sm font-black es-fg">Taklif-kod bilan qo'shilish</p><button onClick={() => setMode("")}><X className="h-4 w-4 es-mut" /></button></div>
                            <input value={code} onChange={e => setCode(e.target.value.toUpperCase())} placeholder="KOD" className="w-full rounded-2xl px-4 py-3 text-center text-base font-black tracking-widest es-fg es-soft outline-none placeholder:opacity-50" />
                            {err && <ErrBox msg={err} />}
                            <button onClick={joinByCode} disabled={busy} className="mt-3 flex w-full items-center justify-center gap-2 rounded-2xl py-3 text-sm font-black text-white es-accent-bg disabled:opacity-60">{busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <KeyRound className="h-4 w-4" />} Qo'shilish</button>
                        </div>
                    )}
                </div>
            )}

            {/* Barcha jamoalar kartalari */}
            {loading ? (
                <div className="flex justify-center py-16"><Loader2 className="h-7 w-7 animate-spin es-faint" /></div>
            ) : teams.length === 0 ? (
                <div className="rounded-3xl p-10 text-center es-card"><Users className="mx-auto h-10 w-10 es-faint" /><p className="mt-3 text-sm font-bold es-mut">Hali jamoa yo'q</p></div>
            ) : (
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                    {teams.map((t, i) => (
                        <Link key={t.id} href={`/esport/teams/${t.id}`} className="group relative overflow-hidden rounded-3xl es-card transition-transform hover:scale-[1.02]">
                            {t.isMine && <span className="absolute right-3 top-3 z-10 flex items-center gap-1 rounded-full px-2 py-1 text-[10px] font-black text-white es-accent-bg"><Star className="h-3 w-3" /> Mening jamoam</span>}
                            <div className="relative h-24 es-accent-bg3">
                                <div className="absolute inset-0 opacity-25" style={{ background: "radial-gradient(circle at 75% 15%, rgba(255,255,255,.4), transparent 60%)" }} />
                                <div className="absolute -bottom-7 left-4 flex h-16 w-16 items-center justify-center overflow-hidden rounded-2xl text-lg font-black text-white ring-4 ring-[var(--es-card)] es-accent-bg">
                                    {t.logo ? <img src={t.logo} alt="" className="h-full w-full object-cover" /> : t.tag.slice(0, 3)}
                                </div>
                                {!t.isMine && <span className="absolute right-3 top-3 flex items-center gap-1 rounded-full bg-black/30 px-2 py-1 text-[11px] font-black text-white backdrop-blur-sm">#{i + 1}</span>}
                            </div>
                            <div className="px-4 pb-4 pt-9">
                                <p className="truncate text-base font-black es-fg">{t.name}</p>
                                <p className="text-[11px] font-bold es-mut">[{t.tag}] · {t.members} a'zo</p>
                                <div className="mt-2 flex items-center gap-1.5 text-[11px] font-semibold es-mut"><Gamepad2 className="h-3.5 w-3.5 es-accent-text" /> {t.games.length ? t.games.join(", ") : "Tarkib yo'q"}</div>
                                <div className="mt-3 flex items-center justify-between rounded-xl px-3 py-2 es-soft">
                                    <span className="flex items-center gap-1.5 text-xs font-black es-accent-text"><TrendingUp className="h-3.5 w-3.5" /> Elo {t.rating}</span>
                                    <ChevronRight className="h-4 w-4 es-faint transition-transform group-hover:translate-x-0.5" />
                                </div>
                            </div>
                        </Link>
                    ))}
                </div>
            )}
        </div>
    );
}

function ErrBox({ msg }: { msg: string }) {
    return <div className="mt-3 flex items-center gap-2 rounded-2xl px-4 py-2.5" style={{ background: "rgba(255,60,60,0.10)", border: "1px solid rgba(255,60,60,0.3)" }}><AlertTriangle className="h-4 w-4 text-red-400" /><span className="text-xs font-semibold text-red-300">{msg}</span></div>;
}
