"use client";

import { useEffect, useRef, useState } from "react";
import { Link, useRouter } from "@/i18n/routing";
import {
    Gamepad2, Trophy, Lock, ChevronDown, Check, ShieldCheck,
    ArrowLeft, Loader2, AlertTriangle, IdCard,
} from "lucide-react";

interface Game { id: string; slug: string; name: string; teamSize: number }
interface Athlete { id: string; game: { slug: string; name: string }; ign: string; gameUserId: string; gameServer: string | null; role: string | null }

const BG = "linear-gradient(160deg,#060A18 0%,#0B1226 55%,#0A0F22 100%)";
const ACCENT = "linear-gradient(135deg,#2B3EE8,#00CEC8)";
const cardStyle = { background: "rgba(10,16,34,0.72)", border: "1px solid rgba(43,62,232,0.20)" };

export default function AthleteOnboarding() {
    const router = useRouter();
    const [loading, setLoading] = useState(true);
    const [hasHumoId, setHasHumoId] = useState(true);
    const [athlete, setAthlete] = useState<Athlete | null>(null);
    const [games, setGames] = useState<Game[]>([]);
    const [roles, setRoles] = useState<string[]>([]);
    const [profileName, setProfileName] = useState({ firstName: "", lastName: "", hasName: false });

    // form
    const [gameId, setGameId] = useState("");
    const [firstName, setFirstName] = useState("");
    const [lastName, setLastName] = useState("");
    const [ign, setIgn] = useState("");
    const [gameUserId, setGameUserId] = useState("");
    const [gameServer, setGameServer] = useState("");
    const [role, setRole] = useState("");
    const [agree, setAgree] = useState(false);
    const [roleOpen, setRoleOpen] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [err, setErr] = useState("");
    const roleRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        fetch("/api/esport/athlete").then(r => r.json()).then(d => {
            if (d.error) { setLoading(false); return; }
            setHasHumoId(d.hasHumoId);
            setAthlete(d.athlete);
            setGames(d.games || []);
            setRoles(d.roles || []);
            setProfileName(d.profileName || { firstName: "", lastName: "", hasName: false });
            setFirstName(d.profileName?.firstName || "");
            setLastName(d.profileName?.lastName || "");
            if ((d.games || []).length === 1) setGameId(d.games[0].id);
            setLoading(false);
        }).catch(() => setLoading(false));
    }, []);

    useEffect(() => {
        const h = (e: MouseEvent) => { if (roleRef.current && !roleRef.current.contains(e.target as Node)) setRoleOpen(false); };
        document.addEventListener("mousedown", h);
        return () => document.removeEventListener("mousedown", h);
    }, []);

    async function submit() {
        setErr("");
        if (!gameId) return setErr("O'yinni tanlang");
        if (!profileName.hasName && (!firstName.trim() || !lastName.trim())) return setErr("Ism va familiya majburiy");
        if (!ign.trim()) return setErr("MLBB nickname majburiy");
        if (!gameUserId.trim()) return setErr("In-game ID majburiy");
        if (!agree) return setErr("O'yin tanlovi o'zgarmasligini tasdiqlang");
        setSubmitting(true);
        const res = await fetch("/api/esport/athlete", {
            method: "POST", headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ gameId, firstName, lastName, ign, gameUserId, gameServer, role }),
        }).then(r => r.json()).catch(() => ({ error: "Tarmoq xatosi" }));
        setSubmitting(false);
        if (res.error) return setErr(res.error);
        setAthlete(res.athlete);
    }

    if (loading) {
        return (
            <main className="fixed inset-0 z-[100] flex items-center justify-center" style={{ background: BG }}>
                <Loader2 className="h-7 w-7 animate-spin text-white/40" />
            </main>
        );
    }

    return (
        <main className="fixed inset-0 z-[100] overflow-y-auto" style={{ background: BG }}>
            <div className="mx-auto w-full max-w-lg px-5 py-8">
                {/* Header */}
                <div className="mb-6 flex items-center gap-3">
                    <Link href="/esport" className="flex h-9 w-9 items-center justify-center rounded-xl" style={{ background: "rgba(43,62,232,0.18)", border: "1px solid rgba(43,62,232,0.30)" }}>
                        <ArrowLeft className="h-4 w-4 text-white/80" />
                    </Link>
                    <div className="flex items-center gap-2">
                        <div className="flex h-9 w-9 items-center justify-center rounded-xl" style={{ background: ACCENT }}>
                            <Gamepad2 className="h-5 w-5 text-white" />
                        </div>
                        <h1 className="text-lg font-black text-white">Humo eSport</h1>
                    </div>
                </div>

                {/* Humo ID yo'q */}
                {!hasHumoId ? (
                    <div className="rounded-3xl p-6 text-center" style={cardStyle}>
                        <IdCard className="mx-auto h-10 w-10 text-white/40" />
                        <p className="mt-3 text-sm font-bold text-white">Sportchi bo'lish uchun Humo ID kerak</p>
                        <p className="mt-1 text-xs text-white/50">Har bir sportchi — to'liq Humo ID egasi.</p>
                        <Link href="/id" className="mt-4 inline-flex rounded-2xl px-5 py-2.5 text-sm font-bold text-white" style={{ background: ACCENT }}>Humo ID olish</Link>
                    </div>
                ) : athlete ? (
                    /* Allaqachon sportchi */
                    <div className="rounded-3xl p-6" style={cardStyle}>
                        <div className="flex items-center gap-3">
                            <div className="flex h-12 w-12 items-center justify-center rounded-2xl" style={{ background: ACCENT }}>
                                <ShieldCheck className="h-6 w-6 text-white" />
                            </div>
                            <div>
                                <p className="text-base font-black text-white">Siz sportchisiz</p>
                                <p className="text-xs font-semibold text-white/50">{athlete.game.name}</p>
                            </div>
                        </div>
                        <div className="mt-5 space-y-2.5">
                            <Row label="Nickname" value={athlete.ign} />
                            <Row label="In-game ID" value={athlete.gameServer ? `${athlete.gameUserId} (${athlete.gameServer})` : athlete.gameUserId} />
                            {athlete.role && <Row label="Pozitsiya" value={athlete.role} />}
                        </div>
                        <button onClick={() => router.push("/esport")} className="mt-6 w-full rounded-2xl py-3 text-sm font-bold text-white" style={{ background: ACCENT }}>
                            Davom etish
                        </button>
                    </div>
                ) : (
                    /* Onboarding forma */
                    <div className="space-y-5">
                        <div className="rounded-3xl p-5" style={cardStyle}>
                            <p className="text-base font-black text-white">Sportchi bo'lish</p>
                            <p className="mt-1 text-xs text-white/50">Turnir va divizionlarda raqobatlashish uchun profil yarating.</p>
                        </div>

                        {/* O'yin tanlash */}
                        <div className="rounded-3xl p-5" style={cardStyle}>
                            <p className="mb-3 text-xs font-black uppercase tracking-wide text-white/40">O'yin</p>
                            <div className="space-y-2">
                                {games.map(g => (
                                    <button key={g.id} onClick={() => setGameId(g.id)}
                                        className="flex w-full items-center justify-between rounded-2xl px-4 py-3 text-left transition-all"
                                        style={gameId === g.id ? { background: "rgba(43,62,232,0.22)", border: "1px solid rgba(0,206,200,0.55)" } : { background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)" }}>
                                        <span className="flex items-center gap-3">
                                            <Trophy className="h-4 w-4" style={{ color: gameId === g.id ? "#00CEC8" : "rgba(255,255,255,0.4)" }} />
                                            <span className="text-sm font-bold text-white">{g.name}</span>
                                            <span className="text-[11px] text-white/40">{g.teamSize}v{g.teamSize}</span>
                                        </span>
                                        {gameId === g.id && <Check className="h-4 w-4 text-[#00CEC8]" />}
                                    </button>
                                ))}
                            </div>
                            <div className="mt-3 flex items-start gap-2 rounded-2xl px-3 py-2.5" style={{ background: "rgba(255,176,32,0.08)", border: "1px solid rgba(255,176,32,0.25)" }}>
                                <Lock className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[#FFB020]" />
                                <p className="text-[11px] font-semibold leading-snug text-[#FFB020]">O'yin BIR MARTA tanlanadi va keyin o'zgartirib bo'lmaydi. Sportchi bitta o'yinga ixtisoslashadi.</p>
                            </div>
                        </div>

                        {/* Ism / familiya */}
                        <div className="rounded-3xl p-5" style={cardStyle}>
                            <p className="mb-3 text-xs font-black uppercase tracking-wide text-white/40">Shaxsiy</p>
                            {profileName.hasName ? (
                                <div className="flex items-center gap-2 rounded-2xl px-4 py-3" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)" }}>
                                    <IdCard className="h-4 w-4 text-white/40" />
                                    <span className="text-sm font-bold text-white">{profileName.firstName} {profileName.lastName}</span>
                                    <span className="ml-auto text-[11px] text-white/35">Humo ID'dan</span>
                                </div>
                            ) : (
                                <div className="grid grid-cols-2 gap-2">
                                    <Input value={firstName} onChange={setFirstName} placeholder="Ism" />
                                    <Input value={lastName} onChange={setLastName} placeholder="Familiya" />
                                </div>
                            )}
                        </div>

                        {/* O'yin ma'lumotlari */}
                        <div className="rounded-3xl p-5" style={cardStyle}>
                            <p className="mb-3 text-xs font-black uppercase tracking-wide text-white/40">MLBB ma'lumotlari</p>
                            <div className="space-y-2.5">
                                <Input value={ign} onChange={setIgn} placeholder="MLBB nickname (majburiy)" />
                                <div className="grid grid-cols-2 gap-2">
                                    <Input value={gameUserId} onChange={setGameUserId} placeholder="In-game ID" inputMode="numeric" />
                                    <Input value={gameServer} onChange={setGameServer} placeholder="Server/Zona" inputMode="numeric" />
                                </div>

                                {/* Pozitsiya — styled dropdown (native select EMAS) */}
                                <div ref={roleRef} className="relative">
                                    <button onClick={() => setRoleOpen(o => !o)}
                                        className="flex w-full items-center justify-between rounded-2xl px-4 py-3 text-left"
                                        style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)" }}>
                                        <span className={`text-sm font-semibold ${role ? "text-white" : "text-white/35"}`}>{role || "Pozitsiya (ixtiyoriy)"}</span>
                                        <ChevronDown className={`h-4 w-4 text-white/40 transition-transform ${roleOpen ? "rotate-180" : ""}`} />
                                    </button>
                                    {roleOpen && (
                                        <div className="absolute z-10 mt-2 w-full overflow-hidden rounded-2xl py-1" style={{ background: "#0D1430", border: "1px solid rgba(43,62,232,0.35)" }}>
                                            {roles.map(r => (
                                                <button key={r} onClick={() => { setRole(r); setRoleOpen(false); }}
                                                    className="flex w-full items-center justify-between px-4 py-2.5 text-left text-sm font-semibold text-white/85 hover:bg-white/5">
                                                    {r} {role === r && <Check className="h-4 w-4 text-[#00CEC8]" />}
                                                </button>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Tasdiq + submit */}
                        <label className="flex cursor-pointer items-start gap-3 rounded-2xl px-4 py-3" style={cardStyle}>
                            <button onClick={() => setAgree(a => !a)} className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-md"
                                style={agree ? { background: ACCENT } : { background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.2)" }}>
                                {agree && <Check className="h-3.5 w-3.5 text-white" />}
                            </button>
                            <span className="text-xs font-semibold leading-snug text-white/70">O'yin tanlovim doimiy ekanini va keyin o'zgartirib bo'lmasligini tushunaman.</span>
                        </label>

                        {err && (
                            <div className="flex items-center gap-2 rounded-2xl px-4 py-3" style={{ background: "rgba(255,60,60,0.10)", border: "1px solid rgba(255,60,60,0.3)" }}>
                                <AlertTriangle className="h-4 w-4 text-red-400" />
                                <span className="text-xs font-semibold text-red-300">{err}</span>
                            </div>
                        )}

                        <button onClick={submit} disabled={submitting}
                            className="flex w-full items-center justify-center gap-2 rounded-2xl py-3.5 text-sm font-black text-white disabled:opacity-60" style={{ background: ACCENT }}>
                            {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShieldCheck className="h-4 w-4" />}
                            Sportchi bo'lish
                        </button>
                    </div>
                )}
            </div>
        </main>
    );
}

function Row({ label, value }: { label: string; value: string }) {
    return (
        <div className="flex items-center justify-between rounded-2xl px-4 py-2.5" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}>
            <span className="text-xs font-semibold text-white/40">{label}</span>
            <span className="text-sm font-bold text-white">{value}</span>
        </div>
    );
}

function Input({ value, onChange, placeholder, inputMode }: { value: string; onChange: (v: string) => void; placeholder: string; inputMode?: "numeric" | "text" }) {
    return (
        <input value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} inputMode={inputMode}
            className="w-full rounded-2xl px-4 py-3 text-sm font-semibold text-white outline-none placeholder:text-white/30"
            style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)" }} />
    );
}
