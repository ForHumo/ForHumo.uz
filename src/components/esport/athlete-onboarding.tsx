"use client";

import { useEffect, useRef, useState } from "react";
import { Link, useRouter } from "@/i18n/routing";
import {
    Gamepad2, Trophy, Lock, ChevronDown, Check, ShieldCheck,
    ArrowLeft, Loader2, AlertTriangle, IdCard, Pencil, Camera, X, Trash2,
} from "lucide-react";
import { useEsT } from "@/lib/esport-i18n";

interface Game { id: string; slug: string; name: string; teamSize: number }
interface Athlete { id: string; game: { slug: string; name: string }; ign: string; gameUserId: string; gameServer: string | null; role: string | null; image?: string | null }

const BG = "linear-gradient(160deg,#060A18 0%,#0B1226 55%,#0A0F22 100%)";
const ACCENT = "linear-gradient(135deg,#2B3EE8,#00CEC8)";
const cardStyle = { background: "var(--es-card)", border: "1px solid var(--es-card-bd)" };

export default function AthleteOnboarding() {
    const t = useEsT();
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
        if (!gameId) return setErr(t("ob.errGame"));
        if (!profileName.hasName && (!firstName.trim() || !lastName.trim())) return setErr(t("ob.errName"));
        if (!ign.trim()) return setErr(t("ob.errNick"));
        if (!gameUserId.trim()) return setErr(t("ob.errId"));
        if (!agree) return setErr(t("ob.errConsent"));
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
            <main className="flex items-center justify-center py-24" >
                <Loader2 className="h-7 w-7 animate-spin text-white/40" />
            </main>
        );
    }

    return (
        <main className="min-h-full" >
            <div className="mx-auto w-full max-w-2xl px-5 py-8">
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
                        <p className="mt-3 text-sm font-bold text-white">{t("ob.needId")}</p>
                        <p className="mt-1 text-xs text-white/50">{t("ob.needIdSub")}</p>
                        <Link href="/id" className="mt-4 inline-flex rounded-2xl px-5 py-2.5 text-sm font-bold text-white" style={{ background: ACCENT }}>{t("ob.getId")}</Link>
                    </div>
                ) : athlete ? (
                    <AthleteCard athlete={athlete} roles={roles} onUpdated={setAthlete} onDeleted={() => setAthlete(null)} onContinue={() => router.push("/esport")} />
                ) : (
                    /* Onboarding forma */
                    <div className="space-y-5">
                        <div className="rounded-3xl p-5" style={cardStyle}>
                            <p className="text-base font-black text-white">{t("ob.becomeBtn")}</p>
                            <p className="mt-1 text-xs text-white/50">{t("ob.becomeSub")}</p>
                        </div>

                        {/* O'yin tanlash */}
                        <div className="rounded-3xl p-5" style={cardStyle}>
                            <p className="mb-3 text-xs font-black uppercase tracking-wide text-white/40">{t("ob.game")}</p>
                            <div className="space-y-2">
                                {games.map(g => (
                                    <button key={g.id} onClick={() => setGameId(g.id)}
                                        className="flex w-full items-center justify-between rounded-2xl px-4 py-3 text-left transition-all"
                                        style={gameId === g.id ? { background: "rgba(43,62,232,0.22)", border: "1px solid rgba(0,206,200,0.55)" } : { background: "var(--es-soft)", border: "1px solid var(--es-soft-bd)" }}>
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
                                <p className="text-[11px] font-semibold leading-snug text-[#FFB020]">{t("ob.lock")}</p>
                            </div>
                        </div>

                        {/* Ism / familiya */}
                        <div className="rounded-3xl p-5" style={cardStyle}>
                            <p className="mb-3 text-xs font-black uppercase tracking-wide text-white/40">{t("ob.personal")}</p>
                            {profileName.hasName ? (
                                <div className="flex items-center gap-2 rounded-2xl px-4 py-3" style={{ background: "var(--es-soft)", border: "1px solid var(--es-soft-bd)" }}>
                                    <IdCard className="h-4 w-4 text-white/40" />
                                    <span className="text-sm font-bold text-white">{profileName.firstName} {profileName.lastName}</span>
                                    <span className="ml-auto text-[11px] text-white/35">{t("ob.fromId")}</span>
                                </div>
                            ) : (
                                <div className="grid grid-cols-2 gap-2">
                                    <Input value={firstName} onChange={setFirstName} placeholder={t("ob.firstName")} />
                                    <Input value={lastName} onChange={setLastName} placeholder={t("ob.lastName")} />
                                </div>
                            )}
                        </div>

                        {/* O'yin ma'lumotlari */}
                        <div className="rounded-3xl p-5" style={cardStyle}>
                            <p className="mb-3 text-xs font-black uppercase tracking-wide text-white/40">{t("ob.mlbbInfo")}</p>
                            <div className="space-y-2.5">
                                <Input value={ign} onChange={setIgn} placeholder={t("ob.nickReq")} />
                                <div className="grid grid-cols-2 gap-2">
                                    <Input value={gameUserId} onChange={setGameUserId} placeholder="In-game ID" inputMode="numeric" />
                                    <Input value={gameServer} onChange={setGameServer} placeholder={t("ob.server")} inputMode="numeric" />
                                </div>

                                {/* Pozitsiya — styled dropdown (native select EMAS) */}
                                <div ref={roleRef} className="relative">
                                    <button onClick={() => setRoleOpen(o => !o)}
                                        className="flex w-full items-center justify-between rounded-2xl px-4 py-3 text-left"
                                        style={{ background: "var(--es-soft)", border: "1px solid var(--es-soft-bd)" }}>
                                        <span className={`text-sm font-semibold ${role ? "text-white" : "text-white/35"}`}>{role || t("ob.positionOpt")}</span>
                                        <ChevronDown className={`h-4 w-4 text-white/40 transition-transform ${roleOpen ? "rotate-180" : ""}`} />
                                    </button>
                                    {roleOpen && (
                                        <div className="absolute z-10 mt-2 w-full overflow-hidden rounded-2xl py-1" style={{ background: "var(--es-card)", border: "1px solid rgba(43,62,232,0.35)" }}>
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
                            <span className="text-xs font-semibold leading-snug text-white/70">{t("ob.consent")}</span>
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
                            {t("ob.becomeBtn")}
                        </button>
                    </div>
                )}
            </div>
        </main>
    );
}

function AthleteCard({ athlete, roles, onUpdated, onDeleted, onContinue }: {
    athlete: Athlete; roles: string[]; onUpdated: (a: Athlete) => void; onDeleted: () => void; onContinue: () => void;
}) {
    const t = useEsT();
    const [editing, setEditing] = useState(false);
    const [confirmDel, setConfirmDel] = useState(false);
    const [deleting, setDeleting] = useState(false);

    async function deleteProfile() {
        setDeleting(true); setErr("");
        const r = await fetch("/api/esport/athlete", { method: "DELETE" }).then(x => x.json()).catch(() => ({ error: "Tarmoq xatosi" }));
        setDeleting(false);
        if (r.error) { setConfirmDel(false); return setErr(r.error); }
        onDeleted();
    }
    const [ign, setIgn] = useState(athlete.ign);
    const [gameUserId, setGameUserId] = useState(athlete.gameUserId);
    const [gameServer, setGameServer] = useState(athlete.gameServer || "");
    const [role, setRole] = useState(athlete.role || "");
    const [image, setImage] = useState(athlete.image || "");
    const [roleOpen, setRoleOpen] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [err, setErr] = useState("");
    const fileRef = useRef<HTMLInputElement>(null);
    const roleRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const h = (e: MouseEvent) => { if (roleRef.current && !roleRef.current.contains(e.target as Node)) setRoleOpen(false); };
        document.addEventListener("mousedown", h);
        return () => document.removeEventListener("mousedown", h);
    }, []);

    async function uploadAvatar(file: File) {
        setUploading(true); setErr("");
        const fd = new FormData(); fd.append("file", file); fd.append("kind", "brand");
        const r = await fetch("/api/market/upload", { method: "POST", body: fd }).then(x => x.json()).catch(() => ({ error: "Yuklash xatosi" }));
        setUploading(false);
        if (r.url) setImage(r.url); else setErr(r.error || "Rasm yuklanmadi");
    }

    async function save() {
        setErr("");
        if (!ign.trim()) return setErr(t("ob.errNick"));
        if (!gameUserId.trim()) return setErr(t("ob.errId"));
        setSaving(true);
        const r = await fetch("/api/esport/athlete", {
            method: "PATCH", headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ ign, gameUserId, gameServer, role, image: image || null }),
        }).then(x => x.json()).catch(() => ({ error: "Tarmoq xatosi" }));
        setSaving(false);
        if (r.error) return setErr(r.error);
        onUpdated(r.athlete); setEditing(false);
    }

    return (
        <div className="rounded-3xl p-6" style={cardStyle}>
            {/* Avatar + sarlavha */}
            <div className="flex items-center gap-4">
                <div className="relative">
                    {image
                        ? <img src={image} alt="" className="h-16 w-16 rounded-2xl object-cover" />
                        : <div className="flex h-16 w-16 items-center justify-center rounded-2xl" style={{ background: ACCENT }}><ShieldCheck className="h-7 w-7 text-white" /></div>}
                    {editing && (
                        <button onClick={() => fileRef.current?.click()} className="absolute -bottom-1 -right-1 flex h-7 w-7 items-center justify-center rounded-full text-white" style={{ background: ACCENT, border: "2px solid #0B1226" }}>
                            {uploading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Camera className="h-3.5 w-3.5" />}
                        </button>
                    )}
                    <input ref={fileRef} type="file" accept="image/*" hidden onChange={e => { const f = e.target.files?.[0]; if (f) uploadAvatar(f); }} />
                </div>
                <div className="min-w-0 flex-1">
                    <p className="text-base font-black text-white">{athlete.ign}</p>
                    <p className="text-xs font-semibold text-white/50">{athlete.game.name}</p>
                </div>
                {!editing && (
                    <button onClick={() => setEditing(true)} className="flex items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-bold text-white/85" style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.12)" }}>
                        <Pencil className="h-3.5 w-3.5" /> {t("ob.edit")}
                    </button>
                )}
            </div>

            {err && <div className="mt-4 flex items-center gap-2 rounded-2xl px-4 py-2.5" style={{ background: "rgba(255,60,60,0.10)", border: "1px solid rgba(255,60,60,0.3)" }}><AlertTriangle className="h-4 w-4 text-red-400" /><span className="text-xs font-semibold text-red-300">{err}</span></div>}

            {!editing ? (
                <>
                    <div className="mt-5 space-y-2.5">
                        <Row label={t("ob.nick")} value={athlete.ign} />
                        <Row label={t("ap.ingameId")} value={athlete.gameServer ? `${athlete.gameUserId} (${athlete.gameServer})` : athlete.gameUserId} />
                        {athlete.role && <Row label={t("ob.position")} value={athlete.role} />}
                    </div>
                    <div className="mt-6 flex gap-2">
                        <Link href={`/esport/a/${athlete.id}`} className="flex-1 rounded-2xl py-3 text-center text-sm font-bold text-white/85" style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.12)" }}>{t("ob.publicCard")}</Link>
                        <button onClick={onContinue} className="flex-1 rounded-2xl py-3 text-sm font-bold text-white" style={{ background: ACCENT }}>{t("ob.continue")}</button>
                    </div>
                    {/* Kibersport profilini o'chirish (Humo ID emas) */}
                    {!confirmDel ? (
                        <button onClick={() => setConfirmDel(true)} className="mt-3 flex w-full items-center justify-center gap-1.5 rounded-2xl py-2.5 text-xs font-bold text-red-300/70" style={{ background: "rgba(255,60,60,0.06)" }}><Trash2 className="h-3.5 w-3.5" /> {t("ob.delProfile")}</button>
                    ) : (
                        <div className="mt-3 rounded-2xl p-3" style={{ background: "rgba(255,60,60,0.08)", border: "1px solid rgba(255,60,60,0.25)" }}>
                            <p className="text-xs font-semibold text-red-200">{t("ob.delConfirm")}</p>
                            <div className="mt-2 flex gap-2">
                                <button onClick={() => setConfirmDel(false)} className="flex-1 rounded-xl py-2 text-xs font-bold text-white/70" style={{ background: "rgba(255,255,255,0.06)" }}>{t("ob.cancel")}</button>
                                <button onClick={deleteProfile} disabled={deleting} className="flex flex-1 items-center justify-center gap-1.5 rounded-xl py-2 text-xs font-black text-white disabled:opacity-60" style={{ background: "#E11D48" }}>{deleting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />} {t("ob.delBtn")}</button>
                            </div>
                        </div>
                    )}
                </>
            ) : (
                <div className="mt-5 space-y-2.5">
                    <p className="text-[11px] font-bold uppercase text-white/35">{t("ob.imgNote")}</p>
                    <Input value={ign} onChange={setIgn} placeholder={t("ob.nick")} />
                    <div className="grid grid-cols-2 gap-2">
                        <Input value={gameUserId} onChange={setGameUserId} placeholder={t("ap.ingameId")} inputMode="numeric" />
                        <Input value={gameServer} onChange={setGameServer} placeholder={t("ob.server")} inputMode="numeric" />
                    </div>
                    <div ref={roleRef} className="relative">
                        <button onClick={() => setRoleOpen(o => !o)} className="flex w-full items-center justify-between rounded-2xl px-4 py-3 text-left" style={{ background: "var(--es-soft)", border: "1px solid var(--es-soft-bd)" }}>
                            <span className={`text-sm font-semibold ${role ? "text-white" : "text-white/35"}`}>{role || t("ob.positionOpt")}</span>
                            <ChevronDown className={`h-4 w-4 text-white/40 transition-transform ${roleOpen ? "rotate-180" : ""}`} />
                        </button>
                        {roleOpen && (
                            <div className="absolute z-10 mt-2 w-full overflow-hidden rounded-2xl py-1" style={{ background: "var(--es-card)", border: "1px solid rgba(43,62,232,0.35)" }}>
                                <button onClick={() => { setRole(""); setRoleOpen(false); }} className="flex w-full px-4 py-2.5 text-left text-sm font-semibold text-white/60 hover:bg-white/5">{t("ob.none")}</button>
                                {roles.map(r => (
                                    <button key={r} onClick={() => { setRole(r); setRoleOpen(false); }} className="flex w-full items-center justify-between px-4 py-2.5 text-left text-sm font-semibold text-white/85 hover:bg-white/5">{r} {role === r && <Check className="h-4 w-4 text-[#00CEC8]" />}</button>
                                ))}
                            </div>
                        )}
                    </div>
                    <div className="flex gap-2 pt-1">
                        <button onClick={() => { setEditing(false); setIgn(athlete.ign); setGameUserId(athlete.gameUserId); setGameServer(athlete.gameServer || ""); setRole(athlete.role || ""); setImage(athlete.image || ""); setErr(""); }} className="flex flex-1 items-center justify-center gap-1.5 rounded-2xl py-3 text-sm font-bold text-white/70" style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.12)" }}><X className="h-4 w-4" /> {t("ob.cancel")}</button>
                        <button onClick={save} disabled={saving || uploading} className="flex flex-1 items-center justify-center gap-1.5 rounded-2xl py-3 text-sm font-black text-white disabled:opacity-60" style={{ background: ACCENT }}>{saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />} {t("ob.save")}</button>
                    </div>
                </div>
            )}
        </div>
    );
}

function Row({ label, value }: { label: string; value: string }) {
    return (
        <div className="flex items-center justify-between rounded-2xl px-4 py-2.5" style={{ background: "var(--es-soft)", border: "1px solid var(--es-soft-bd)" }}>
            <span className="text-xs font-semibold text-white/40">{label}</span>
            <span className="text-sm font-bold text-white">{value}</span>
        </div>
    );
}

function Input({ value, onChange, placeholder, inputMode }: { value: string; onChange: (v: string) => void; placeholder: string; inputMode?: "numeric" | "text" }) {
    return (
        <input value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} inputMode={inputMode}
            className="w-full rounded-2xl px-4 py-3 text-sm font-semibold text-white outline-none placeholder:text-white/30"
            style={{ background: "var(--es-soft)", border: "1px solid var(--es-soft-bd)" }} />
    );
}
