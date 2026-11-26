"use client";

// Humo eSport PREMIUM — Sportchi (athlete onboarding + o'z profil). Asl athlete-onboarding
// bilan bir xil funksional/i18n; theme-aware (es-* tokenlar), /esport-test havolalari.

import { useEffect, useRef, useState } from "react";
import { Link, useRouter } from "@/i18n/routing";
import {
    Gamepad2, Trophy, Lock, ChevronDown, Check, ShieldCheck,
    Loader2, AlertTriangle, IdCard, Pencil, Camera, X, Trash2, Link2,
    RefreshCw, Copy,
} from "lucide-react";
import { useEsT, ES_BASE } from "@/lib/esport-i18n";

interface Game { id: string; slug: string; name: string; teamSize: number; requiresSteam?: boolean }
interface Athlete { id: string; game: { slug: string; name: string }; ign: string; gameUserId: string; gameServer: string | null; role: string | null; image?: string | null; coverImage?: string | null }
interface SteamState { linked: boolean; steamId64: string | null; persona: string | null; avatar: string | null }

const ACCENT = "linear-gradient(120deg,var(--es-c1),var(--es-c2) 60%,var(--es-c3))";
const soft: React.CSSProperties = { background: "var(--es-soft)", border: "1px solid var(--es-soft-bd)" };

export default function EtAthlete() {
    const t = useEsT();
    const router = useRouter();
    const [loading, setLoading] = useState(true);
    const [hasHumoId, setHasHumoId] = useState(true);
    const [athlete, setAthlete] = useState<Athlete | null>(null);
    const [games, setGames] = useState<Game[]>([]);
    const [roles, setRoles] = useState<string[]>([]);
    const [profileName, setProfileName] = useState({ firstName: "", lastName: "", hasName: false });
    const [steam, setSteam] = useState<SteamState>({ linked: false, steamId64: null, persona: null, avatar: null });
    const [steamMsg, setSteamMsg] = useState<string>("");

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
            if (d.steam) setSteam(d.steam);
            if ((d.games || []).length === 1) setGameId(d.games[0].id);
            setLoading(false);
        }).catch(() => setLoading(false));

        const url = new URL(window.location.href);
        const s = url.searchParams.get("steam");
        if (s) { setSteamMsg(s); url.searchParams.delete("steam"); window.history.replaceState({}, "", url.toString()); }
    }, []);

    useEffect(() => {
        const h = (e: MouseEvent) => { if (roleRef.current && !roleRef.current.contains(e.target as Node)) setRoleOpen(false); };
        document.addEventListener("mousedown", h);
        return () => document.removeEventListener("mousedown", h);
    }, []);

    const selectedGame = games.find(g => g.id === gameId);
    const needsSteam = !!selectedGame?.requiresSteam;

    async function submit() {
        setErr("");
        if (!gameId) return setErr(t("ob.errGame"));
        if (!profileName.hasName && (!firstName.trim() || !lastName.trim())) return setErr(t("ob.errName"));
        if (!ign.trim()) return setErr(t("ob.errNick"));
        if (!needsSteam && !gameUserId.trim()) return setErr(t("ob.errId"));
        if (needsSteam && !steam.linked) return setErr(t("st.required"));
        if (!agree) return setErr(t("ob.errConsent"));
        setSubmitting(true);
        const res = await fetch("/api/esport/athlete", {
            method: "POST", headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ gameId, firstName, lastName, ign, gameUserId: needsSteam ? "" : gameUserId, gameServer, role }),
        }).then(r => r.json()).catch(() => ({ error: "Tarmoq xatosi" }));
        setSubmitting(false);
        if (res.error) return setErr(res.error);
        setAthlete(res.athlete);
    }

    if (loading) return <div style={{ display: "flex", justifyContent: "center", padding: "96px 0" }}><Loader2 className="animate-spin" size={28} style={{ color: "var(--es-faint)" }} /></div>;

    return (
        <div style={{ maxWidth: 680, margin: "14px auto 0" }}>
            <div className="et-sh et-rise"><span className="num"><Gamepad2 size={15} /></span><div><h2>Sportchi</h2><p>Humo eSport sportchi profili.</p></div></div>

            {!hasHumoId ? (
                <div className="et-glass et-rise"><div className="et-empty"><span className="ic"><IdCard size={24} /></span><b>{t("ob.needId")}</b>{t("ob.needIdSub")}<div style={{ marginTop: 14 }}><Link href="/id" className="et-btn" style={{ textDecoration: "none" }}>{t("ob.getId")}</Link></div></div></div>
            ) : athlete ? (
                <AthleteCard athlete={athlete} roles={roles} onUpdated={setAthlete} onDeleted={() => setAthlete(null)} onContinue={() => router.push(ES_BASE)} />
            ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                    <div className="et-glass et-rise" style={{ padding: 18 }}>
                        <p className="et-fh" style={{ fontWeight: 700, fontSize: "1rem" }}>{t("ob.becomeBtn")}</p>
                        <p style={{ marginTop: 4, fontSize: ".8rem", color: "var(--es-mut)" }}>{t("ob.becomeSub")}</p>
                    </div>

                    {/* O'yin tanlash */}
                    <div className="et-glass et-rise et-d1" style={{ padding: 18 }}>
                        <span className="et-lbl">{t("ob.game")}</span>
                        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                            {games.map(g => (
                                <button key={g.id} onClick={() => setGameId(g.id)} className="et-row" style={{ cursor: "pointer", justifyContent: "space-between", ...(gameId === g.id ? { borderColor: "var(--es-c2)", boxShadow: "0 0 0 1px var(--es-c2)" } : {}) }}>
                                    <span style={{ display: "flex", alignItems: "center", gap: 12 }}>
                                        <Trophy size={16} style={{ color: gameId === g.id ? "var(--es-c2)" : "var(--es-faint)" }} />
                                        <span style={{ fontSize: ".9rem", fontWeight: 700 }}>{g.name}</span>
                                        <span style={{ fontSize: ".7rem", color: "var(--es-faint)" }}>{g.teamSize}v{g.teamSize}</span>
                                    </span>
                                    {gameId === g.id && <Check size={16} style={{ color: "var(--es-c2)" }} />}
                                </button>
                            ))}
                        </div>
                        <div style={{ marginTop: 12, display: "flex", alignItems: "flex-start", gap: 8, borderRadius: 12, padding: "10px 12px", background: "rgba(255,176,32,0.08)", border: "1px solid rgba(255,176,32,0.25)" }}>
                            <Lock size={14} style={{ marginTop: 2, flex: "0 0 auto", color: "#FFB020" }} />
                            <p style={{ fontSize: ".72rem", fontWeight: 600, lineHeight: 1.4, color: "#FFB020" }}>{t("ob.lock")}</p>
                        </div>
                    </div>

                    {/* Ism / familiya */}
                    <div className="et-glass et-rise et-d2" style={{ padding: 18 }}>
                        <span className="et-lbl">{t("ob.personal")}</span>
                        {profileName.hasName ? (
                            <div className="et-row" style={{ cursor: "default" }}>
                                <IdCard size={16} style={{ color: "var(--es-faint)" }} />
                                <span style={{ fontSize: ".9rem", fontWeight: 700 }}>{profileName.firstName} {profileName.lastName}</span>
                                <span style={{ marginLeft: "auto", fontSize: ".7rem", color: "var(--es-faint)" }}>{t("ob.fromId")}</span>
                            </div>
                        ) : (
                            <div className="et-grid et-g2">
                                <Input value={firstName} onChange={setFirstName} placeholder={t("ob.firstName")} />
                                <Input value={lastName} onChange={setLastName} placeholder={t("ob.lastName")} />
                            </div>
                        )}
                    </div>

                    {/* Steam (CS2) */}
                    {needsSteam && (
                        <div className="et-glass et-rise" style={{ padding: 18 }}>
                            <div style={{ marginBottom: 12, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                                <span className="et-lbl" style={{ margin: 0 }}>{t("st.title")}</span>
                                {steam.linked
                                    ? <span className="et-chip" style={{ display: "inline-flex", alignItems: "center", gap: 4, color: "#19e68c", background: "rgba(16,185,129,0.10)", border: "1px solid rgba(16,185,129,0.35)" }}><Check size={12} /> {t("st.linked")}</span>
                                    : <span className="et-chip" style={{ display: "inline-flex", alignItems: "center", gap: 4, color: "#FFB020", background: "rgba(255,176,32,0.08)", border: "1px solid rgba(255,176,32,0.30)" }}><AlertTriangle size={12} /> {t("st.notLinked")}</span>}
                            </div>
                            {steam.linked ? (
                                <div className="et-row" style={{ cursor: "default" }}>
                                    {steam.avatar ? <img src={steam.avatar} alt="" style={{ height: 40, width: 40, borderRadius: 11, objectFit: "cover" }} /> : <span className="et-logo" style={{ width: 40, height: 40 }}><ShieldCheck size={20} color="#fff" /></span>}
                                    <div style={{ minWidth: 0, flex: 1 }}>
                                        <p style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", fontSize: ".88rem", fontWeight: 700 }}>{steam.persona || "Steam"}</p>
                                        <p style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", fontSize: ".72rem", fontWeight: 600, color: "var(--es-faint)" }}>SteamID64: {steam.steamId64}</p>
                                    </div>
                                </div>
                            ) : (
                                <>
                                    <p style={{ fontSize: ".78rem", fontWeight: 600, lineHeight: 1.4, color: "var(--es-mut)" }}>{t("st.whyCs2")}</p>
                                    <a href={`/api/user/steam-link/start?from=${ES_BASE}/athlete`} className="et-btn" style={{ marginTop: 12, width: "100%", textDecoration: "none" }}><Link2 size={16} /> {t("st.linkBtn")}</a>
                                </>
                            )}
                            {steamMsg && steamMsg !== "ok" && (
                                <div className="et-errmsg" style={{ marginTop: 12 }}><AlertTriangle size={14} /> {t(`st.err.${steamMsg}`)}</div>
                            )}
                        </div>
                    )}

                    {/* O'yin ma'lumotlari */}
                    <div className="et-glass et-rise" style={{ padding: 18 }}>
                        <span className="et-lbl">{t("ob.mlbbInfo")}</span>
                        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                            <Input value={ign} onChange={setIgn} placeholder={t("ob.nickReq")} />
                            {needsSteam ? (
                                <div className="et-row" style={{ cursor: "default", fontSize: ".72rem", fontWeight: 600, color: "var(--es-mut)" }}>{t("st.idAutoFromSteam")}</div>
                            ) : (
                                <div className="et-grid et-g2">
                                    <Input value={gameUserId} onChange={setGameUserId} placeholder="In-game ID" inputMode="numeric" />
                                    <Input value={gameServer} onChange={setGameServer} placeholder={t("ob.server")} inputMode="numeric" />
                                </div>
                            )}
                            {selectedGame?.slug === "mlbb" && (
                                <div ref={roleRef} style={{ position: "relative" }}>
                                    <button onClick={() => setRoleOpen(o => !o)} className="et-row" style={{ cursor: "pointer", width: "100%", justifyContent: "space-between" }}>
                                        <span style={{ fontSize: ".9rem", fontWeight: 600, color: role ? "var(--es-fg)" : "var(--es-faint)" }}>{role || t("ob.positionOpt")}</span>
                                        <ChevronDown size={16} style={{ color: "var(--es-faint)", transform: roleOpen ? "rotate(180deg)" : undefined, transition: "transform .2s" }} />
                                    </button>
                                    {roleOpen && (
                                        <div className="et-glass" style={{ position: "absolute", zIndex: 10, marginTop: 8, width: "100%", overflow: "hidden", padding: "4px 0" }}>
                                            {roles.map(r => (
                                                <button key={r} onClick={() => { setRole(r); setRoleOpen(false); }} style={{ display: "flex", width: "100%", alignItems: "center", justifyContent: "space-between", padding: "10px 16px", textAlign: "left", fontSize: ".9rem", fontWeight: 600, background: "none", border: 0, cursor: "pointer", color: "var(--es-fg)" }}>
                                                    {r} {role === r && <Check size={16} style={{ color: "var(--es-c2)" }} />}
                                                </button>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Tasdiq */}
                    <label className="et-glass" style={{ display: "flex", cursor: "pointer", alignItems: "flex-start", gap: 12, padding: "14px 16px" }}>
                        <button onClick={() => setAgree(a => !a)} style={{ marginTop: 2, display: "flex", height: 20, width: 20, flex: "0 0 auto", alignItems: "center", justifyContent: "center", borderRadius: 6, cursor: "pointer", ...(agree ? { background: ACCENT, border: 0 } : { background: "var(--es-soft)", border: "1px solid var(--es-card-bd)" }) }}>
                            {agree && <Check size={14} color="#fff" />}
                        </button>
                        <span style={{ fontSize: ".78rem", fontWeight: 600, lineHeight: 1.4, color: "var(--es-mut)" }}>{t("ob.consent")}</span>
                    </label>

                    {err && <div className="et-errmsg"><AlertTriangle size={14} /> {err}</div>}

                    <button onClick={submit} disabled={submitting} className="et-btn" style={{ width: "100%", padding: "14px 18px" }}>
                        {submitting ? <Loader2 size={16} className="animate-spin" /> : <ShieldCheck size={16} />} {t("ob.becomeBtn")}
                    </button>
                </div>
            )}
        </div>
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
    const [cover, setCover] = useState(athlete.coverImage || "");
    const [roleOpen, setRoleOpen] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [coverUploading, setCoverUploading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [err, setErr] = useState("");
    const fileRef = useRef<HTMLInputElement>(null);
    const coverRef = useRef<HTMLInputElement>(null);
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
    async function uploadCover(file: File) {
        setCoverUploading(true); setErr("");
        const fd = new FormData(); fd.append("file", file); fd.append("kind", "brand");
        const r = await fetch("/api/market/upload", { method: "POST", body: fd }).then(x => x.json()).catch(() => ({ error: "Yuklash xatosi" }));
        setCoverUploading(false);
        if (r.url) setCover(r.url); else setErr(r.error || "Rasm yuklanmadi");
    }
    async function save() {
        setErr("");
        if (!ign.trim()) return setErr(t("ob.errNick"));
        if (!gameUserId.trim()) return setErr(t("ob.errId"));
        setSaving(true);
        const r = await fetch("/api/esport/athlete", {
            method: "PATCH", headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ ign, gameUserId, gameServer, role, image: image || null, coverImage: cover || null }),
        }).then(x => x.json()).catch(() => ({ error: "Tarmoq xatosi" }));
        setSaving(false);
        if (r.error) return setErr(r.error);
        onUpdated(r.athlete); setEditing(false);
    }

    return (
        <div className="et-glass et-rise" style={{ padding: 22 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
                <div style={{ position: "relative" }}>
                    {image ? <img src={image} alt="" style={{ height: 64, width: 64, borderRadius: 16, objectFit: "cover" }} /> : <span className="et-logo" style={{ width: 64, height: 64 }}><ShieldCheck size={28} color="#fff" /></span>}
                    {editing && (
                        <button onClick={() => fileRef.current?.click()} style={{ position: "absolute", bottom: -4, right: -4, display: "flex", height: 28, width: 28, alignItems: "center", justifyContent: "center", borderRadius: 999, color: "#fff", background: ACCENT, border: "2px solid var(--et-surface)", cursor: "pointer" }}>
                            {uploading ? <Loader2 size={14} className="animate-spin" /> : <Camera size={14} />}
                        </button>
                    )}
                    <input ref={fileRef} type="file" accept="image/*" hidden onChange={e => { const f = e.target.files?.[0]; if (f) uploadAvatar(f); }} />
                </div>
                <div style={{ minWidth: 0, flex: 1 }}>
                    <p className="et-fh" style={{ fontWeight: 700, fontSize: "1.05rem" }}>{athlete.ign}</p>
                    <p style={{ fontSize: ".78rem", fontWeight: 600, color: "var(--es-mut)" }}>{athlete.game.name}</p>
                </div>
                {!editing && <button className="et-pbtn" onClick={() => setEditing(true)}><Pencil size={14} /> {t("ob.edit")}</button>}
            </div>

            {err && <div className="et-errmsg" style={{ marginTop: 16 }}><AlertTriangle size={14} /> {err}</div>}

            {editing && (
                <>
                    <button onClick={() => coverRef.current?.click()} style={{ position: "relative", marginTop: 16, display: "flex", height: 96, width: "100%", alignItems: "center", justifyContent: "center", overflow: "hidden", borderRadius: 16, cursor: "pointer", ...soft }}>
                        {cover ? <img src={cover} alt="" style={{ height: "100%", width: "100%", objectFit: "cover" }} /> : <span style={{ display: "flex", alignItems: "center", gap: 8, fontSize: ".78rem", fontWeight: 700, color: "var(--es-faint)" }}>{coverUploading ? <Loader2 size={16} className="animate-spin" /> : <Camera size={16} />} {t("td.editCover")}</span>}
                    </button>
                    <input ref={coverRef} type="file" accept="image/*" hidden onChange={e => { const f = e.target.files?.[0]; if (f) uploadCover(f); }} />
                </>
            )}

            {!editing ? (
                <>
                    <div style={{ marginTop: 20, display: "flex", flexDirection: "column", gap: 10 }}>
                        <Row label={t("ob.nick")} value={athlete.ign} />
                        <Row label={t("ap.ingameId")} value={athlete.gameServer ? `${athlete.gameUserId} (${athlete.gameServer})` : athlete.gameUserId} />
                        {athlete.role && <Row label={t("ob.position")} value={athlete.role} />}
                    </div>

                    <VerifyPanel gameSlug={athlete.game.slug} />

                    <div style={{ marginTop: 24, display: "flex", gap: 8 }}>
                        <Link href={`${ES_BASE}/a/${athlete.id}`} className="et-btn ghost" style={{ flex: 1, textDecoration: "none" }}>{t("ob.publicCard")}</Link>
                        <button onClick={onContinue} className="et-btn" style={{ flex: 1 }}>{t("ob.continue")}</button>
                    </div>
                    {!confirmDel ? (
                        <button onClick={() => setConfirmDel(true)} className="et-mini danger" style={{ marginTop: 12, width: "100%", padding: 12 }}><Trash2 size={14} /> {t("ob.delProfile")}</button>
                    ) : (
                        <div style={{ marginTop: 12, borderRadius: 14, padding: 12, background: "rgba(255,60,60,0.08)", border: "1px solid rgba(255,60,60,0.25)" }}>
                            <p style={{ fontSize: ".78rem", fontWeight: 600, color: "#ff9aa2" }}>{t("ob.delConfirm")}</p>
                            <div style={{ marginTop: 8, display: "flex", gap: 8 }}>
                                <button onClick={() => setConfirmDel(false)} className="et-mini ghost" style={{ flex: 1 }}>{t("ob.cancel")}</button>
                                <button onClick={deleteProfile} disabled={deleting} className="et-mini danger" style={{ flex: 1 }}>{deleting ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />} {t("ob.delBtn")}</button>
                            </div>
                        </div>
                    )}
                </>
            ) : (
                <div style={{ marginTop: 20, display: "flex", flexDirection: "column", gap: 10 }}>
                    <p className="et-lbl">{t("ob.imgNote")}</p>
                    <Input value={ign} onChange={setIgn} placeholder={t("ob.nick")} />
                    <div className="et-grid et-g2">
                        <Input value={gameUserId} onChange={setGameUserId} placeholder={t("ap.ingameId")} inputMode="numeric" />
                        <Input value={gameServer} onChange={setGameServer} placeholder={t("ob.server")} inputMode="numeric" />
                    </div>
                    <div ref={roleRef} style={{ position: "relative" }}>
                        <button onClick={() => setRoleOpen(o => !o)} className="et-row" style={{ cursor: "pointer", width: "100%", justifyContent: "space-between" }}>
                            <span style={{ fontSize: ".9rem", fontWeight: 600, color: role ? "var(--es-fg)" : "var(--es-faint)" }}>{role || t("ob.positionOpt")}</span>
                            <ChevronDown size={16} style={{ color: "var(--es-faint)", transform: roleOpen ? "rotate(180deg)" : undefined, transition: "transform .2s" }} />
                        </button>
                        {roleOpen && (
                            <div className="et-glass" style={{ position: "absolute", zIndex: 10, marginTop: 8, width: "100%", overflow: "hidden", padding: "4px 0" }}>
                                <button onClick={() => { setRole(""); setRoleOpen(false); }} style={{ display: "flex", width: "100%", padding: "10px 16px", textAlign: "left", fontSize: ".9rem", fontWeight: 600, background: "none", border: 0, cursor: "pointer", color: "var(--es-mut)" }}>{t("ob.none")}</button>
                                {roles.map(r => (
                                    <button key={r} onClick={() => { setRole(r); setRoleOpen(false); }} style={{ display: "flex", width: "100%", alignItems: "center", justifyContent: "space-between", padding: "10px 16px", textAlign: "left", fontSize: ".9rem", fontWeight: 600, background: "none", border: 0, cursor: "pointer", color: "var(--es-fg)" }}>{r} {role === r && <Check size={16} style={{ color: "var(--es-c2)" }} />}</button>
                                ))}
                            </div>
                        )}
                    </div>
                    <div style={{ display: "flex", gap: 8, paddingTop: 4 }}>
                        <button onClick={() => { setEditing(false); setIgn(athlete.ign); setGameUserId(athlete.gameUserId); setGameServer(athlete.gameServer || ""); setRole(athlete.role || ""); setImage(athlete.image || ""); setCover(athlete.coverImage || ""); setErr(""); }} className="et-btn ghost" style={{ flex: 1 }}><X size={16} /> {t("ob.cancel")}</button>
                        <button onClick={save} disabled={saving || uploading} className="et-btn" style={{ flex: 1 }}>{saving ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />} {t("ob.save")}</button>
                    </div>
                </div>
            )}
        </div>
    );
}

// ── Akkaunt tasdiqlash paneli (Steam / Faceit / MLBB) ──
interface Acct {
    platform: string; externalId: string; handle: string | null; verified: boolean;
    verdict: string; proofCode: string | null; proofExpires: string | null;
    snapshot: { stub?: boolean; reasons?: string[]; elo?: number | null; skillLevel?: number | null } | null;
    lastCheckedAt: string | null;
}

const PLAT_ICON: Record<string, React.ReactNode> = {
    STEAM: <ShieldCheck size={16} />, FACEIT: <Trophy size={16} />, MOONTON: <Gamepad2 size={16} />,
};
function platLabel(p: string, t: (k: string) => string) {
    return p === "MOONTON" ? t("vf.platMLBB") : p === "FACEIT" ? "Faceit" : "Steam";
}
function VerdictChip({ verdict, t }: { verdict: string; t: (k: string) => string }) {
    const map: Record<string, { c: string; bg: string; bd: string }> = {
        TOZA: { c: "#19e68c", bg: "rgba(16,185,129,0.10)", bd: "rgba(16,185,129,0.35)" },
        TEKSHIRISH: { c: "#FFB020", bg: "rgba(255,176,32,0.08)", bd: "rgba(255,176,32,0.30)" },
        BLOK: { c: "#ff6b6b", bg: "rgba(255,60,60,0.08)", bd: "rgba(255,60,60,0.28)" },
    };
    const s = map[verdict] || map.TEKSHIRISH;
    return <span className="et-chip" style={{ color: s.c, background: s.bg, border: `1px solid ${s.bd}` }}>{t(`vf.${verdict}`)}</span>;
}
function ReasonList({ reasons }: { reasons?: string[] }) {
    if (!reasons || reasons.length === 0) return null;
    return (
        <ul style={{ margin: "8px 0 0", padding: 0, listStyle: "none", display: "flex", flexDirection: "column", gap: 3 }}>
            {reasons.slice(0, 4).map((r, i) => (
                <li key={i} style={{ fontSize: ".7rem", color: "var(--es-faint)", display: "flex", gap: 6 }}><span style={{ color: "var(--es-c2)" }}>·</span>{r}</li>
            ))}
        </ul>
    );
}

function VerifyPanel({ gameSlug }: { gameSlug: string }) {
    const t = useEsT();
    const [loading, setLoading] = useState(true);
    const [platforms, setPlatforms] = useState<string[]>([]);
    const [steamLinked, setSteamLinked] = useState(false);
    const [accounts, setAccounts] = useState<Acct[]>([]);
    const [busy, setBusy] = useState("");
    const [faceitNick, setFaceitNick] = useState("");
    const [copied, setCopied] = useState(false);
    const [err, setErr] = useState("");

    useEffect(() => {
        fetch("/api/esport/athlete/verify").then(r => r.json()).then(d => {
            if (d && !d.error) { setPlatforms(d.platforms || []); setSteamLinked(!!d.steamLinked); setAccounts(d.accounts || []); }
            setLoading(false);
        }).catch(() => setLoading(false));
    }, []);

    async function act(platform: string, extra?: Record<string, unknown>) {
        setBusy(platform); setErr("");
        const d = await fetch("/api/esport/athlete/verify", {
            method: "POST", headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ platform, ...extra }),
        }).then(r => r.json()).catch(() => ({ error: t("vf.netErr") }));
        setBusy("");
        if (d.error) { setErr(d.error); return; }
        setAccounts(d.accounts || []);
    }
    const acctFor = (p: string) => accounts.find(a => a.platform === p);

    if (loading) return <div style={{ marginTop: 20, display: "flex", justifyContent: "center", padding: "20px 0" }}><Loader2 size={18} className="animate-spin" style={{ color: "var(--es-faint)" }} /></div>;

    return (
        <div style={{ marginTop: 20 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                <ShieldCheck size={15} style={{ color: "var(--es-c2)" }} />
                <span className="et-fh" style={{ fontWeight: 700, fontSize: ".95rem" }}>{t("vf.title")}</span>
            </div>
            <p style={{ fontSize: ".72rem", color: "var(--es-faint)", marginBottom: 12 }}>{t("vf.sub")}</p>

            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {platforms.map(p => {
                    const a = acctFor(p);
                    return (
                        <div key={p} style={{ borderRadius: 14, padding: 14, ...soft }}>
                            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                                <span style={{ color: "var(--es-faint)" }}>{PLAT_ICON[p]}</span>
                                <span style={{ fontWeight: 700, fontSize: ".9rem" }}>{platLabel(p, t)}</span>
                                <span style={{ marginLeft: "auto" }}>
                                    {a ? <VerdictChip verdict={a.verdict} t={t} /> : <span className="et-chip" style={{ color: "var(--es-faint)" }}>{t("vf.notChecked")}</span>}
                                </span>
                            </div>

                            {p === "STEAM" && (
                                <div style={{ marginTop: 10 }}>
                                    {a ? (
                                        <>
                                            <div style={{ fontSize: ".76rem", color: "var(--es-mut)" }}>{a.handle || "Steam"} · <span style={{ color: "var(--es-faint)" }}>{a.externalId}</span></div>
                                            {a.snapshot?.stub && <div style={{ fontSize: ".7rem", color: "#FFB020", marginTop: 4 }}>{t("vf.stub")}</div>}
                                            <ReasonList reasons={a.snapshot?.reasons} />
                                            <button className="et-mini" style={{ marginTop: 10 }} disabled={busy === "STEAM"} onClick={() => act("STEAM")}>{busy === "STEAM" ? <Loader2 size={13} className="animate-spin" /> : <RefreshCw size={13} />} {t("vf.recheck")}</button>
                                        </>
                                    ) : steamLinked ? (
                                        <button className="et-mini" style={{ marginTop: 4 }} disabled={busy === "STEAM"} onClick={() => act("STEAM")}>{busy === "STEAM" ? <Loader2 size={13} className="animate-spin" /> : <ShieldCheck size={13} />} {t("vf.check")}</button>
                                    ) : (
                                        <a href={`/api/user/steam-link/start?from=${ES_BASE}/athlete`} className="et-mini" style={{ marginTop: 4, textDecoration: "none", display: "inline-flex" }}><Link2 size={13} /> {t("vf.steamLink")}</a>
                                    )}
                                </div>
                            )}

                            {p === "FACEIT" && (
                                <div style={{ marginTop: 10 }}>
                                    {a && (
                                        <>
                                            <div style={{ fontSize: ".76rem", color: "var(--es-mut)" }}>{a.handle}{a.snapshot?.elo != null ? ` · ${t("vf.elo")} ${a.snapshot.elo}` : ""}</div>
                                            {a.snapshot?.stub && <div style={{ fontSize: ".7rem", color: "#FFB020", marginTop: 4 }}>{t("vf.stub")}</div>}
                                            <ReasonList reasons={a.snapshot?.reasons} />
                                        </>
                                    )}
                                    <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
                                        <input className="et-inp" style={{ flex: 1 }} value={faceitNick} onChange={e => setFaceitNick(e.target.value)} placeholder={a?.handle || t("vf.faceitNick")} />
                                        <button className="et-mini" disabled={busy === "FACEIT"} onClick={() => act("FACEIT", { nickname: faceitNick || a?.handle })}>{busy === "FACEIT" ? <Loader2 size={13} className="animate-spin" /> : a ? <RefreshCw size={13} /> : <Check size={13} />} {a ? t("vf.recheck") : t("vf.check")}</button>
                                    </div>
                                    {!a && <p style={{ fontSize: ".7rem", color: "var(--es-faint)", marginTop: 6 }}>{t("vf.faceitHint")}</p>}
                                </div>
                            )}

                            {p === "MOONTON" && (
                                <div style={{ marginTop: 10 }}>
                                    {a?.verified ? (
                                        <div style={{ fontSize: ".78rem", color: "#19e68c" }}><Check size={13} style={{ verticalAlign: -2 }} /> {t("vf.verified")}</div>
                                    ) : a?.proofCode ? (
                                        <>
                                            <span className="et-lbl" style={{ marginBottom: 6 }}>{t("vf.moontonCode")}</span>
                                            <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                                                <code style={{ fontFamily: "monospace", fontSize: "1.05rem", fontWeight: 700, letterSpacing: "0.08em", padding: "6px 12px", borderRadius: 10, background: "var(--es-soft)", border: "1px solid var(--es-soft-bd)", color: "var(--es-c2)" }}>{a.proofCode}</code>
                                                <button className="et-mini ghost" onClick={() => { navigator.clipboard?.writeText(a.proofCode!); setCopied(true); setTimeout(() => setCopied(false), 1500); }}>{copied ? <Check size={13} /> : <Copy size={13} />} {copied ? t("vf.copied") : t("vf.copy")}</button>
                                            </div>
                                            <p style={{ fontSize: ".72rem", color: "var(--es-mut)", marginTop: 8, lineHeight: 1.4 }}>{t("vf.moontonHow")}</p>
                                            <div style={{ fontSize: ".72rem", color: "#FFB020", marginTop: 6 }}>{t("vf.moontonPending")}</div>
                                            <button className="et-mini" style={{ marginTop: 10 }} disabled={busy === "MOONTON"} onClick={() => act("MOONTON")}>{busy === "MOONTON" ? <Loader2 size={13} className="animate-spin" /> : <RefreshCw size={13} />} {t("vf.moontonNew")}</button>
                                        </>
                                    ) : (
                                        <button className="et-mini" style={{ marginTop: 4 }} disabled={busy === "MOONTON"} onClick={() => act("MOONTON")}>{busy === "MOONTON" ? <Loader2 size={13} className="animate-spin" /> : <IdCard size={13} />} {t("vf.moontonGet")}</button>
                                    )}
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>
            {err && <div className="et-errmsg" style={{ marginTop: 12 }}><AlertTriangle size={14} /> {err}</div>}
        </div>
    );
}

function Row({ label, value }: { label: string; value: string }) {
    return (
        <div className="et-row" style={{ cursor: "default", justifyContent: "space-between" }}>
            <span style={{ fontSize: ".72rem", fontWeight: 600, color: "var(--es-faint)" }}>{label}</span>
            <span style={{ fontSize: ".88rem", fontWeight: 700 }}>{value}</span>
        </div>
    );
}

function Input({ value, onChange, placeholder, inputMode }: { value: string; onChange: (v: string) => void; placeholder: string; inputMode?: "numeric" | "text" }) {
    return <input className="et-inp" value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} inputMode={inputMode} />;
}
