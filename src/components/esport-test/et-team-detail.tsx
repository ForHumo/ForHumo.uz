"use client";

// Humo eSport PREMIUM — jamoa tafsiloti (teams/[id]). Asl team-detail bilan bir xil
// funksional/i18n; theme-aware (es-* tokenlar), /esport-test havolalari.

import { useEffect, useState, useCallback, useRef } from "react";
import { Link, useRouter } from "@/i18n/routing";
import {
    Loader2, Shield, Crown, Copy, Check, UserPlus, Inbox,
    LogOut, Trash2, BadgeCheck, X, AlertTriangle, Settings2, Pencil, ImagePlus,
} from "lucide-react";
import { useEsT } from "@/lib/esport-i18n";
import { TeamCardBody, useCardTilt, type TeamData } from "./et-card";

interface Member { athleteId: string; humoProfileId: string; role: string; ign: string; gameUserId: string; gameServer: string | null; position: string | null; name: string; username: string | null; image: string | null; humoId: string | null; verified: boolean }
interface Roster { id: string; game: { slug: string; name: string; teamSize: number }; rating: number; members: Member[] }
interface Team { id: string; name: string; tag: string; logo: string | null; coverImage: string | null; bio: string | null; card: TeamData; isOwner: boolean; isRealOwner: boolean; amIMember: boolean; myAthleteId: string | null; pendingRequests: number; locked: boolean; rosters: Roster[] }
interface JoinReq { id: string; athleteId: string; ign: string; position: string | null; game: string; name: string; username: string | null; image: string | null }
interface ReqItem { id: string; type: string; athleteId: string | null; ign: string | null; approvals: string[]; createdAt: string }
interface StaffItem { id: string; profileId: string; role: string; title: string | null; name: string; username: string | null; image: string | null; humoId: string | null }

const STAFF_ROLES = ["VICE_OWNER", "COACH", "CAPTAIN", "STAFF"];
const ACCENT = "linear-gradient(120deg,var(--es-c1),var(--es-c2) 60%,var(--es-c3))";
const card: React.CSSProperties = { background: "var(--es-card)", border: "1px solid var(--es-card-bd)" };
const soft: React.CSSProperties = { background: "var(--es-soft)", border: "1px solid var(--es-soft-bd)" };
const ROLES = ["CAPTAIN", "STARTER", "SUB"];

export default function EtTeamDetail({ teamId }: { teamId: string }) {
    const t = useEsT();
    const router = useRouter();
    const [team, setTeam] = useState<Team | null>(null);
    const [loading, setLoading] = useState(true);
    const [code, setCode] = useState("");
    const [copied, setCopied] = useState(false);
    const [reqOpen, setReqOpen] = useState(false);
    const [reqs, setReqs] = useState<JoinReq[]>([]);
    const [sel, setSel] = useState<string | null>(null);
    const [busy, setBusy] = useState(false);
    const [err, setErr] = useState("");
    const [editOpen, setEditOpen] = useState(false);
    const [eName, setEName] = useState("");
    const [eTag, setETag] = useState("");
    const [eBio, setEBio] = useState("");
    const [eLogo, setELogo] = useState("");
    const [eCover, setECover] = useState("");
    const [uploading, setUploading] = useState(false);
    const fileRef = useRef<HTMLInputElement>(null);
    const coverRef = useRef<HTMLInputElement>(null);

    function openEdit() {
        if (!team) return;
        setEName(team.name); setETag(team.tag); setEBio(team.bio || ""); setELogo(team.logo || ""); setECover(team.coverImage || ""); setErr(""); setEditOpen(true);
    }
    async function uploadImg(file: File, set: (u: string) => void) {
        setUploading(true); setErr("");
        const fd = new FormData(); fd.append("file", file); fd.append("kind", "brand");
        const r = await fetch("/api/market/upload", { method: "POST", body: fd }).then(x => x.json()).catch(() => ({ error: "Yuklash xatosi" }));
        setUploading(false);
        if (r.url) set(r.url); else setErr(r.error || "Rasm yuklanmadi");
    }
    const uploadLogo = (file: File) => uploadImg(file, setELogo);
    async function saveEdit() {
        setBusy(true); setErr("");
        const r = await fetch(`/api/esport/teams/${teamId}`, {
            method: "PATCH", headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ name: eName, tag: eTag, bio: eBio, logo: eLogo || null, coverImage: eCover || null }),
        }).then(x => x.json()).catch(() => ({ error: "Tarmoq xatosi" }));
        setBusy(false);
        if (r.error) return setErr(r.error);
        setEditOpen(false); await load();
    }

    const [requests, setRequests] = useState<ReqItem[]>([]);
    const load = useCallback(async () => {
        const d = await fetch(`/api/esport/teams/${teamId}`).then(r => r.json()).catch(() => ({}));
        if (d.error) { setErr(d.error); setLoading(false); return; }
        setTeam(d.team); setLoading(false);
    }, [teamId]);
    const loadRequests = useCallback(async () => {
        const d = await fetch(`/api/esport/teams/${teamId}/requests`).then(r => r.json()).catch(() => ({}));
        setRequests(d.requests || []);
    }, [teamId]);
    const [staff, setStaff] = useState<StaffItem[]>([]);
    const [stIdent, setStIdent] = useState(""); const [stRole, setStRole] = useState("STAFF"); const [stTitle, setStTitle] = useState(""); const [stMsg, setStMsg] = useState("");
    const loadStaff = useCallback(async () => {
        const d = await fetch(`/api/esport/teams/${teamId}/staff`).then(r => r.json()).catch(() => ({}));
        setStaff(d.staff || []);
    }, [teamId]);
    useEffect(() => { load(); loadRequests(); loadStaff(); }, [load, loadRequests, loadStaff]);
    const [isAdmin, setIsAdmin] = useState(false);
    useEffect(() => { fetch("/api/esport/admin/check").then(r => r.json()).then(d => setIsAdmin(!!d.isAdmin)).catch(() => { }); }, []);
    async function forceDelete() {
        if (!confirm(t("bl.teamRemoveConfirm"))) return;
        const r = await fetch(`/api/esport/admin/teams/${teamId}`, { method: "DELETE" }).then(x => x.json()).catch(() => ({ error: "Xato" }));
        if (r.ok) { router.push("/esport-test/teams"); return; }
        setErr(r.error || "");
    }
    async function addStaff() {
        if (!stIdent.trim()) return; setStMsg("");
        const r = await fetch(`/api/esport/teams/${teamId}/staff`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ identifier: stIdent, role: stRole, title: stTitle || null }) }).then(x => x.json()).catch(() => ({ error: "Xato" }));
        if (r.error) { setStMsg(r.error); return; }
        setStIdent(""); setStTitle(""); await loadStaff();
    }
    async function removeStaff(profileId: string) {
        await fetch(`/api/esport/teams/${teamId}/staff`, { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ profileId }) }).catch(() => { });
        await loadStaff();
    }
    async function transferOwner(profileId: string) {
        setStMsg("");
        const r = await fetch(`/api/esport/teams/${teamId}/transfer-owner`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ profileId }) }).then(x => x.json()).catch(() => ({ error: "Xato" }));
        if (r.error) { setStMsg(r.error); return; }
        await load(); await loadStaff();
    }
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
        const r = await fetch(`/api/esport/teams/${teamId}/requests`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ type: "KICK", athleteId }) }).then(x => x.json()).catch(() => ({ error: "Xato" }));
        setSel(null); setErr(r.message || r.error || ""); await loadRequests();
    }
    async function joinRequest() {
        setBusy(true);
        const res = await fetch(`/api/esport/teams/${teamId}/join-request`, { method: "POST" }).then(r => r.json()).catch(() => ({ error: "Xato" }));
        setBusy(false);
        if (res.error) setErr(res.error); else setErr(t("td.applied"));
    }
    async function leave() {
        const r = await fetch(`/api/esport/teams/${teamId}/requests`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ type: "LEAVE" }) }).then(x => x.json()).catch(() => ({ error: "Xato" }));
        setErr(r.message || r.error || ""); await loadRequests();
    }
    async function del() {
        const r = await fetch(`/api/esport/teams/${teamId}/requests`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ type: "TEAM_DELETE" }) }).then(x => x.json()).catch(() => ({ error: "Xato" }));
        if (r.deleted) { router.push("/esport-test/teams"); return; }
        setErr(r.message || r.error || ""); await loadRequests();
    }
    async function respondReq(reqId: string, action: "approve" | "reject") {
        const r = await fetch(`/api/esport/requests/${reqId}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action }) }).then(x => x.json()).catch(() => ({ error: "Xato" }));
        if (r.deleted) { router.push("/esport-test/teams"); return; }
        setErr(r.message || r.error || ""); await loadRequests(); await load();
    }
    async function cancelReq(reqId: string) {
        await fetch(`/api/esport/requests/${reqId}`, { method: "DELETE" });
        await loadRequests();
    }

    useCardTilt(team?.id);

    if (loading) return <div style={{ display: "flex", justifyContent: "center", padding: "96px 0" }}><Loader2 className="animate-spin" size={28} style={{ color: "var(--es-faint)" }} /></div>;
    if (!team) return <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 12, padding: "96px 0" }}><p style={{ color: "var(--es-mut)" }}>{err || t("td.notFound")}</p><Link href="/esport-test/teams" className="et-grad" style={{ fontWeight: 700 }}>{t("td.back")}</Link></div>;

    return (
        <div style={{ maxWidth: 760, margin: "14px auto 0" }}>
            <div className="et-sh et-rise"><span className="num"><Shield size={15} /></span><div><h2>{team.name}</h2><p>[{team.tag}] · {t("td.crumb")}</p></div></div>

            {/* Jamoa kartasi (premium — real Elo/daraja/gerb/tarkib) */}
            <div className="etc-cw et-rise" style={{ margin: "0 auto 16px" }}><TeamCardBody d={team.card} /></div>

            {/* Jamoa karta */}
            <div className="et-glass et-rise" style={{ overflow: "hidden", marginBottom: 14 }}>
                {team.coverImage && <div style={{ height: 112 }}><img src={team.coverImage} alt="" style={{ height: "100%", width: "100%", objectFit: "cover" }} /></div>}
                <div style={{ padding: 18 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
                        <span className="et-logo" style={{ width: 64, height: 64, fontSize: "1.1rem" }}>{team.logo ? <img src={team.logo} alt="" /> : team.tag.slice(0, 3)}</span>
                        <div style={{ minWidth: 0, flex: 1 }}>
                            <p className="et-fh" style={{ fontWeight: 700, fontSize: "1.2rem", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{team.name}</p>
                            <p style={{ fontSize: ".85rem", fontWeight: 700, color: "var(--es-faint)" }}>[{team.tag}]</p>
                            {team.isOwner && <span className="et-chip" style={{ marginTop: 4, display: "inline-flex", alignItems: "center", gap: 4, color: "var(--es-c2)", background: "rgba(0,206,200,0.12)" }}><Crown size={12} /> {t("td.owner")}</span>}
                        </div>
                        {team.isOwner && !editOpen && <button className="et-pbtn" style={{ padding: 9 }} onClick={openEdit}><Pencil size={16} /></button>}
                    </div>
                    {team.bio && !editOpen && <p style={{ marginTop: 12, fontSize: ".82rem", color: "var(--es-mut)" }}>{team.bio}</p>}

                    {editOpen && team.isOwner && (
                        <div style={{ marginTop: 16, display: "flex", flexDirection: "column", gap: 10, borderTop: "1px solid var(--es-soft-bd)", paddingTop: 16 }}>
                            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                                <button onClick={() => fileRef.current?.click()} className="et-logo" style={{ width: 56, height: 56, cursor: "pointer" }}>
                                    {eLogo ? <img src={eLogo} alt="" /> : uploading ? <Loader2 size={16} className="animate-spin" color="#fff" /> : <ImagePlus size={20} color="#fff" />}
                                </button>
                                <input ref={fileRef} type="file" accept="image/*" hidden onChange={e => { const f = e.target.files?.[0]; if (f) uploadLogo(f); }} />
                                <span style={{ fontSize: ".78rem", color: "var(--es-faint)" }}>{t("td.editLogo")}</span>
                            </div>
                            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                                <button onClick={() => coverRef.current?.click()} style={{ display: "flex", height: 56, width: 96, flex: "0 0 auto", alignItems: "center", justifyContent: "center", overflow: "hidden", borderRadius: 14, cursor: "pointer", ...soft }}>
                                    {eCover ? <img src={eCover} alt="" style={{ height: "100%", width: "100%", objectFit: "cover" }} /> : <ImagePlus size={20} style={{ color: "var(--es-faint)" }} />}
                                </button>
                                <input ref={coverRef} type="file" accept="image/*" hidden onChange={e => { const f = e.target.files?.[0]; if (f) uploadImg(f, setECover); }} />
                                <span style={{ fontSize: ".78rem", color: "var(--es-faint)" }}>{t("td.editCover")}</span>
                            </div>
                            <input className="et-inp" value={eName} onChange={e => setEName(e.target.value)} placeholder={t("td.editName")} />
                            <input className="et-inp" style={{ textTransform: "uppercase" }} value={eTag} onChange={e => setETag(e.target.value.toUpperCase())} maxLength={5} placeholder="Teg" />
                            <input className="et-inp" value={eBio} onChange={e => setEBio(e.target.value)} placeholder={t("td.editBio")} />
                            <div style={{ display: "flex", gap: 8 }}>
                                <button className="et-mini ghost" style={{ flex: 1 }} onClick={() => setEditOpen(false)}><X size={16} /> {t("td.cancel")}</button>
                                <button className="et-mini" style={{ flex: 1 }} onClick={saveEdit} disabled={busy || uploading}>{busy ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />} {t("td.save")}</button>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Roster lock */}
            {team.locked && (
                <div style={{ marginBottom: 14, display: "flex", alignItems: "center", gap: 8, borderRadius: 14, padding: "12px 16px", background: "rgba(255,176,32,0.10)", border: "1px solid rgba(255,176,32,0.3)" }}>
                    <AlertTriangle size={16} style={{ flex: "0 0 auto", color: "#FFB020" }} /><span style={{ fontSize: ".8rem", fontWeight: 600, color: "#FFB020" }}>{t("td.locked")}</span>
                </div>
            )}

            {/* A'zolik so'rovlari */}
            {requests.length > 0 && (
                <div style={{ marginBottom: 14, display: "flex", flexDirection: "column", gap: 8 }}>
                    {requests.map(rq => {
                        const mine = team.myAthleteId;
                        if (rq.type === "LEAVE") {
                            if (team.isOwner) return <ReqRow key={rq.id} text={`${rq.ign} ${t("td.leaveReqSuffix")}`} onApprove={() => respondReq(rq.id, "approve")} onReject={() => respondReq(rq.id, "reject")} />;
                            if (rq.athleteId === mine) return <ReqRow key={rq.id} text="Chiqish so'rovingiz egaga yuborildi" onCancel={() => cancelReq(rq.id)} />;
                            return null;
                        }
                        if (rq.type === "KICK") {
                            if (rq.athleteId === mine) return <ReqRow key={rq.id} text={t("td.kickAsk")} onApprove={() => respondReq(rq.id, "approve")} onReject={() => respondReq(rq.id, "reject")} />;
                            if (team.isOwner) return <ReqRow key={rq.id} text={`${rq.ign} ${t("td.kickSentSuffix")}`} onCancel={() => cancelReq(rq.id)} />;
                            return null;
                        }
                        if (rq.type === "TEAM_DELETE") {
                            const approved = mine ? rq.approvals.includes(mine) : false;
                            if (team.isOwner) return <ReqRow key={rq.id} text={`${t("td.delVotes")} ${rq.approvals.length}`} onCancel={() => cancelReq(rq.id)} />;
                            if (mine && !approved) return <ReqRow key={rq.id} text={t("td.delAsk")} onApprove={() => respondReq(rq.id, "approve")} onReject={() => respondReq(rq.id, "reject")} />;
                            if (approved) return <ReqRow key={rq.id} text={t("td.delAgreed")} />;
                            return null;
                        }
                        return null;
                    })}
                </div>
            )}

            {/* Ega amallari */}
            {team.isOwner && (
                <div style={{ marginBottom: 14, display: "flex", flexDirection: "column", gap: 12 }}>
                    <div className="et-grid et-g2">
                        <button className="et-btn" onClick={genCode} disabled={busy || team.locked}><UserPlus size={16} /> {t("td.inviteCode")}</button>
                        <button className="et-btn ghost" style={{ position: "relative" }} onClick={() => { setReqOpen(o => !o); if (!reqOpen) loadReqs(); }}>
                            <Inbox size={16} /> {t("td.requests")}
                            {team.pendingRequests > 0 && <span style={{ position: "absolute", right: -4, top: -4, display: "flex", height: 20, minWidth: 20, alignItems: "center", justifyContent: "center", borderRadius: 999, padding: "0 4px", fontSize: ".66rem", fontWeight: 700, color: "#fff", background: "#FF3C5F" }}>{team.pendingRequests}</span>}
                        </button>
                    </div>
                    {code && (
                        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", borderRadius: 14, padding: "12px 16px", background: "rgba(0,206,200,0.08)", border: "1px solid rgba(0,206,200,0.3)" }}>
                            <span className="et-fh" style={{ fontSize: "1.1rem", fontWeight: 700, letterSpacing: ".15em" }}>{code}</span>
                            <button onClick={() => { navigator.clipboard?.writeText(code); setCopied(true); setTimeout(() => setCopied(false), 1500); }} style={{ display: "flex", alignItems: "center", gap: 6, background: "none", border: 0, cursor: "pointer", fontSize: ".78rem", fontWeight: 700, color: "var(--es-c2)" }}>{copied ? <Check size={16} /> : <Copy size={16} />}{copied ? t("td.copied") : t("td.copy")}</button>
                        </div>
                    )}
                    {reqOpen && (
                        <div className="et-glass" style={{ padding: 8 }}>
                            {reqs.length === 0 ? <p style={{ padding: "16px 0", textAlign: "center", fontSize: ".78rem", color: "var(--es-faint)" }}>{t("td.noReq")}</p> : reqs.map(r => (
                                <div key={r.id} style={{ display: "flex", alignItems: "center", gap: 8, borderRadius: 11, padding: 8 }}>
                                    <Avatar image={r.image} fallback={r.ign} />
                                    <div style={{ minWidth: 0, flex: 1 }}><p style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", fontSize: ".86rem", fontWeight: 700 }}>{r.ign}</p><p style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", fontSize: ".72rem", color: "var(--es-faint)" }}>{r.name} · {r.position || r.game}</p></div>
                                    <button onClick={() => actReq(r.id, "accept")} style={{ display: "flex", height: 32, width: 32, alignItems: "center", justifyContent: "center", borderRadius: 9, color: "#fff", background: ACCENT, border: 0, cursor: "pointer" }}><Check size={16} /></button>
                                    <button onClick={() => actReq(r.id, "reject")} style={{ display: "flex", height: 32, width: 32, alignItems: "center", justifyContent: "center", borderRadius: 9, cursor: "pointer", ...soft }}><X size={16} style={{ color: "var(--es-mut)" }} /></button>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}

            {/* Lavozimlar / Staff */}
            {(staff.length > 0 || team.isOwner) && (
                <div className="et-glass" style={{ padding: 16, marginBottom: 14 }}>
                    <p className="et-fh" style={{ display: "flex", alignItems: "center", gap: 8, fontWeight: 700, marginBottom: 12 }}><Shield size={16} style={{ color: "var(--es-c2)" }} /> {t("stf.title")}</p>
                    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                        {staff.length === 0 && !team.isOwner && <p style={{ fontSize: ".78rem", color: "var(--es-faint)" }}>{t("stf.none")}</p>}
                        {staff.map(s => (
                            <div key={s.id} className="et-row" style={{ cursor: "default" }}>
                                <Avatar image={s.image} fallback={s.name || s.username || "?"} />
                                <div style={{ minWidth: 0, flex: 1 }}>
                                    <p style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", fontSize: ".86rem", fontWeight: 700 }}>{s.name || (s.username ? `@${s.username}` : s.humoId)}</p>
                                    <p style={{ fontSize: ".72rem", color: "var(--es-c2)" }}>{s.role === "STAFF" ? (s.title || t("stf.role.STAFF")) : t(`stf.role.${s.role}`)}</p>
                                </div>
                                {team.isOwner && (<>
                                    {team.isRealOwner && <button onClick={() => { if (confirm(t("stf.transferConfirm"))) transferOwner(s.profileId); }} title={t("stf.transferOwner")} style={{ display: "flex", height: 28, width: 28, alignItems: "center", justifyContent: "center", borderRadius: 8, cursor: "pointer", ...soft }}><Crown size={14} style={{ color: "#FFB020" }} /></button>}
                                    <button onClick={() => removeStaff(s.profileId)} style={{ display: "flex", height: 28, width: 28, alignItems: "center", justifyContent: "center", borderRadius: 8, cursor: "pointer", background: "rgba(255,60,60,0.10)", border: 0 }}><X size={14} style={{ color: "#ff7a84" }} /></button>
                                </>)}
                            </div>
                        ))}
                    </div>
                    {team.isOwner && (
                        <div style={{ marginTop: 12, display: "flex", flexDirection: "column", gap: 8, borderTop: "1px solid var(--es-soft-bd)", paddingTop: 12 }}>
                            <input className="et-inp" value={stIdent} onChange={e => setStIdent(e.target.value)} placeholder={t("stf.identPh")} />
                            <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                                {STAFF_ROLES.map(rl => <button key={rl} className={`et-pbtn${stRole === rl ? " on" : ""}`} onClick={() => setStRole(rl)}>{t(`stf.role.${rl}`)}</button>)}
                            </div>
                            {stRole === "STAFF" && <input className="et-inp" value={stTitle} onChange={e => setStTitle(e.target.value)} placeholder={t("stf.titlePh")} />}
                            <button className="et-mini" onClick={addStaff}><UserPlus size={16} /> {t("stf.give")}</button>
                            {stMsg && <p style={{ fontSize: ".78rem", fontWeight: 600, color: "#FFB020" }}>{stMsg}</p>}
                            <p style={{ fontSize: ".66rem", color: "var(--es-faint)" }}>{t("stf.transferHint")}</p>
                        </div>
                    )}
                </div>
            )}

            {/* Rosterlar */}
            {team.rosters.length === 0 ? (
                <div className="et-glass"><div className="et-empty"><span className="ic"><Shield size={24} /></span><b>{t("td.rosterEmpty")}</b>{team.isOwner ? t("td.ownerHint") : t("td.noMembers")}</div></div>
            ) : team.rosters.map(r => (
                <div key={r.id} className="et-glass" style={{ padding: 16, marginBottom: 14 }}>
                    <div style={{ marginBottom: 12, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                        <p className="et-fh" style={{ fontWeight: 700 }}>{r.game.name}</p>
                        <span style={{ display: "flex", alignItems: "center", gap: 8, fontSize: ".72rem", fontWeight: 700, color: "var(--es-faint)" }}>
                            <span style={{ color: "var(--es-c2)" }}>Elo {r.rating}</span>
                            <span>{r.members.length}/{r.game.teamSize}+</span>
                        </span>
                    </div>
                    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                        {r.members.map(m => (
                            <div key={m.athleteId}>
                                <div className="et-row" style={{ cursor: "default" }}>
                                    <Link href={`/esport-test/a/${m.athleteId}`} style={{ display: "flex", minWidth: 0, flex: 1, alignItems: "center", gap: 12, textDecoration: "none", color: "inherit" }}>
                                        <Avatar image={m.image} fallback={m.ign} />
                                        <div style={{ minWidth: 0, flex: 1 }}>
                                            <p style={{ display: "flex", alignItems: "center", gap: 4, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", fontSize: ".86rem", fontWeight: 700 }}>{m.ign}{m.verified && <BadgeCheck size={14} style={{ color: "var(--es-c2)" }} />}</p>
                                            <p style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", fontSize: ".72rem", color: "var(--es-faint)" }}>{m.name}{m.position ? ` · ${m.position}` : ""}</p>
                                        </div>
                                    </Link>
                                    <span className="et-chip" style={m.role === "CAPTAIN" ? { display: "inline-flex", alignItems: "center", gap: 4, background: "rgba(0,206,200,0.14)", color: "var(--es-c2)" } : { background: "var(--es-soft)", color: "var(--es-mut)" }}>
                                        {m.role === "CAPTAIN" && <Crown size={12} />}{t("rl." + m.role)}
                                    </span>
                                    {team.isOwner && m.role !== "CAPTAIN" && <button onClick={() => setSel(sel === m.athleteId ? null : m.athleteId)} style={{ display: "flex", height: 28, width: 28, alignItems: "center", justifyContent: "center", borderRadius: 8, cursor: "pointer", ...soft }}><Settings2 size={14} style={{ color: "var(--es-mut)" }} /></button>}
                                </div>
                                {sel === m.athleteId && team.isOwner && (
                                    <div style={{ marginTop: 6, display: "flex", flexWrap: "wrap", gap: 6, borderRadius: 14, padding: 8, ...soft }}>
                                        {ROLES.filter(x => x !== "CAPTAIN").map(rl => (
                                            <button key={rl} className={`et-pbtn${m.role === rl ? " on" : ""}`} onClick={() => setRole(m.athleteId, rl)}>{t("rl." + rl)}</button>
                                        ))}
                                        {team.isRealOwner && <button className="et-pbtn" style={{ marginLeft: "auto", color: "#FFB020" }} onClick={() => { if (confirm(t("stf.transferConfirm"))) transferOwner(m.humoProfileId); }}><Crown size={14} /> {t("stf.makeOwner")}</button>}
                                        <button className="et-pbtn" style={{ color: "#ff7a84" }} onClick={() => kick(m.athleteId)} disabled={team.locked}><Trash2 size={14} /> Chiqarish</button>
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
                    <button className="et-mini danger" style={{ marginTop: 8, width: "100%", padding: 12 }} onClick={leave} disabled={team.locked}><LogOut size={16} /> {t("td.leave")}</button>
                ) : (
                    <button className="et-btn" style={{ marginTop: 8, width: "100%" }} onClick={joinRequest} disabled={busy || team.locked}>{busy ? <Loader2 size={16} className="animate-spin" /> : <UserPlus size={16} />} {t("td.apply")}</button>
                )
            )}
            {err && <div className="et-errmsg" style={{ marginTop: 12 }}><AlertTriangle size={14} /> {err}</div>}

            {/* Egasi: o'chirish */}
            {team.isRealOwner && (
                <button className="et-mini danger" style={{ marginTop: 24, width: "100%", padding: 12 }} onClick={del} disabled={team.locked}><Trash2 size={14} /> {t("td.delete")}</button>
            )}
            {/* Admin: majburiy o'chirish */}
            {isAdmin && !team.isRealOwner && (
                <button className="et-mini danger" style={{ marginTop: 12, width: "100%", padding: 12 }} onClick={forceDelete}><AlertTriangle size={14} /> {t("bl.teamRemove")}</button>
            )}
        </div>
    );
}

function ReqRow({ text, onApprove, onReject, onCancel }: { text: string; onApprove?: () => void; onReject?: () => void; onCancel?: () => void }) {
    const t = useEsT();
    return (
        <div className="et-row" style={{ cursor: "default", background: "color-mix(in oklab,var(--es-c1) 10%,var(--es-soft))" }}>
            <span style={{ minWidth: 0, flex: 1, fontSize: ".8rem", fontWeight: 600 }}>{text}</span>
            {onApprove && <button className="et-mini" onClick={onApprove}><Check size={14} /> {t("td.approve")}</button>}
            {onReject && <button className="et-mini ghost" onClick={onReject}><X size={14} /> {t("td.reject")}</button>}
            {onCancel && <button className="et-mini ghost" onClick={onCancel}>{t("td.cancel")}</button>}
        </div>
    );
}

function Avatar({ image, fallback }: { image: string | null; fallback: string }) {
    return image
        ? <img src={image} alt="" style={{ height: 36, width: 36, borderRadius: 11, objectFit: "cover" }} />
        : <span style={{ display: "flex", height: 36, width: 36, alignItems: "center", justifyContent: "center", borderRadius: 11, fontSize: ".72rem", fontWeight: 700, color: "#fff", background: ACCENT }}>{fallback.slice(0, 2).toUpperCase()}</span>;
}
