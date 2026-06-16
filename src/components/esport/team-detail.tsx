"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { Link, useRouter } from "@/i18n/routing";
import {
    ArrowLeft, Loader2, Shield, Crown, Copy, Check, UserPlus, Inbox,
    LogOut, Trash2, BadgeCheck, X, AlertTriangle, Settings2, Pencil, ImagePlus,
} from "lucide-react";
import { useEsT } from "@/lib/esport-i18n";

interface Member { athleteId: string; role: string; ign: string; gameUserId: string; gameServer: string | null; position: string | null; name: string; username: string | null; image: string | null; humoId: string | null; verified: boolean }
interface Roster { id: string; game: { slug: string; name: string; teamSize: number }; rating: number; members: Member[] }
interface Team { id: string; name: string; tag: string; logo: string | null; bio: string | null; isOwner: boolean; amIMember: boolean; myAthleteId: string | null; pendingRequests: number; rosters: Roster[] }
interface JoinReq { id: string; athleteId: string; ign: string; position: string | null; game: string; name: string; username: string | null; image: string | null }
interface ReqItem { id: string; type: string; athleteId: string | null; ign: string | null; approvals: string[]; createdAt: string }

const ACCENT = "linear-gradient(135deg,#2B3EE8,#00CEC8)";
const card = { background: "var(--es-card)", border: "1px solid var(--es-card-bd)" };
const soft = { background: "var(--es-soft)", border: "1px solid var(--es-soft-bd)" };
const ROLES = ["CAPTAIN", "STARTER", "SUB"];

export default function TeamDetail({ teamId }: { teamId: string }) {
    const t = useEsT();
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
    // Tahrirlash
    const [editOpen, setEditOpen] = useState(false);
    const [eName, setEName] = useState("");
    const [eTag, setETag] = useState("");
    const [eBio, setEBio] = useState("");
    const [eLogo, setELogo] = useState("");
    const [uploading, setUploading] = useState(false);
    const fileRef = useRef<HTMLInputElement>(null);

    function openEdit() {
        if (!team) return;
        setEName(team.name); setETag(team.tag); setEBio(team.bio || ""); setELogo(team.logo || ""); setErr(""); setEditOpen(true);
    }
    async function uploadLogo(file: File) {
        setUploading(true); setErr("");
        const fd = new FormData(); fd.append("file", file); fd.append("kind", "brand");
        const r = await fetch("/api/market/upload", { method: "POST", body: fd }).then(x => x.json()).catch(() => ({ error: "Yuklash xatosi" }));
        setUploading(false);
        if (r.url) setELogo(r.url); else setErr(r.error || "Rasm yuklanmadi");
    }
    async function saveEdit() {
        setBusy(true); setErr("");
        const r = await fetch(`/api/esport/teams/${teamId}`, {
            method: "PATCH", headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ name: eName, tag: eTag, bio: eBio, logo: eLogo || null }),
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
    useEffect(() => { load(); loadRequests(); }, [load, loadRequests]);

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
    // Chiqarish — endi sportchi roziligini so'raydi (darhol chiqarmaydi)
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
    // Chiqish — jamoa egasi roziligini so'raydi
    async function leave() {
        const r = await fetch(`/api/esport/teams/${teamId}/requests`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ type: "LEAVE" }) }).then(x => x.json()).catch(() => ({ error: "Xato" }));
        setErr(r.message || r.error || ""); await loadRequests();
    }
    // O'chirish — yolg'iz bo'lsa darhol, a'zolar bo'lsa 100% rozilik so'raydi
    async function del() {
        const r = await fetch(`/api/esport/teams/${teamId}/requests`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ type: "TEAM_DELETE" }) }).then(x => x.json()).catch(() => ({ error: "Xato" }));
        if (r.deleted) { router.push("/esport/teams"); return; }
        setErr(r.message || r.error || ""); await loadRequests();
    }
    async function respondReq(reqId: string, action: "approve" | "reject") {
        const r = await fetch(`/api/esport/requests/${reqId}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action }) }).then(x => x.json()).catch(() => ({ error: "Xato" }));
        if (r.deleted) { router.push("/esport/teams"); return; }
        setErr(r.message || r.error || ""); await loadRequests(); await load();
    }
    async function cancelReq(reqId: string) {
        await fetch(`/api/esport/requests/${reqId}`, { method: "DELETE" });
        await loadRequests();
    }

    if (loading) return <main className="flex items-center justify-center py-24" ><Loader2 className="h-7 w-7 animate-spin text-white/40" /></main>;
    if (!team) return <main className="flex flex-col items-center justify-center py-24 gap-3" ><p className="text-sm text-white/60">{err || t("td.notFound")}</p><Link href="/esport/teams" className="text-sm font-bold text-[#00CEC8]">{t("td.back")}</Link></main>;

    return (
        <main className="min-h-full" >
            <div className="mx-auto w-full max-w-3xl px-5 py-8">
                {/* Header */}
                <div className="mb-5 flex items-center gap-3">
                    <Link href="/esport/teams" className="flex h-9 w-9 items-center justify-center rounded-xl" style={{ background: "rgba(43,62,232,0.18)", border: "1px solid rgba(43,62,232,0.30)" }}><ArrowLeft className="h-4 w-4 text-white/80" /></Link>
                    <span className="text-sm font-bold text-white/50">{t("td.crumb")}</span>
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
                            {team.isOwner && <span className="mt-1 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-bold text-[#00CEC8]" style={{ background: "rgba(0,206,200,0.12)" }}><Crown className="h-3 w-3" /> {t("td.owner")}</span>}
                        </div>
                        {team.isOwner && !editOpen && <button onClick={openEdit} className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl" style={soft}><Pencil className="h-4 w-4 text-white/70" /></button>}
                    </div>
                    {team.bio && !editOpen && <p className="mt-3 text-xs text-white/55">{team.bio}</p>}

                    {/* Tahrirlash formasi (faqat ega) */}
                    {editOpen && team.isOwner && (
                        <div className="mt-4 space-y-2.5 border-t pt-4" style={{ borderColor: "rgba(255,255,255,0.08)" }}>
                            <div className="flex items-center gap-3">
                                <button onClick={() => fileRef.current?.click()} className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-2xl" style={soft}>
                                    {eLogo ? <img src={eLogo} alt="" className="h-full w-full object-cover" /> : uploading ? <Loader2 className="h-4 w-4 animate-spin text-white/50" /> : <ImagePlus className="h-5 w-5 text-white/40" />}
                                </button>
                                <input ref={fileRef} type="file" accept="image/*" hidden onChange={e => { const f = e.target.files?.[0]; if (f) uploadLogo(f); }} />
                                <span className="text-xs text-white/40">{t("td.editLogo")}</span>
                            </div>
                            <input value={eName} onChange={e => setEName(e.target.value)} placeholder={t("td.editName")} className="w-full rounded-2xl px-4 py-3 text-sm font-semibold text-white outline-none placeholder:text-white/30" style={soft} />
                            <input value={eTag} onChange={e => setETag(e.target.value.toUpperCase())} maxLength={5} placeholder="Teg" className="w-full rounded-2xl px-4 py-3 text-sm font-semibold uppercase text-white outline-none placeholder:text-white/30" style={soft} />
                            <input value={eBio} onChange={e => setEBio(e.target.value)} placeholder={t("td.editBio")} className="w-full rounded-2xl px-4 py-3 text-sm font-semibold text-white outline-none placeholder:text-white/30" style={soft} />
                            <div className="flex gap-2">
                                <button onClick={() => setEditOpen(false)} className="flex flex-1 items-center justify-center gap-1.5 rounded-2xl py-2.5 text-sm font-bold text-white/70" style={soft}><X className="h-4 w-4" /> {t("td.cancel")}</button>
                                <button onClick={saveEdit} disabled={busy || uploading} className="flex flex-1 items-center justify-center gap-1.5 rounded-2xl py-2.5 text-sm font-black text-white disabled:opacity-60" style={{ background: ACCENT }}>{busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />} {t("td.save")}</button>
                            </div>
                        </div>
                    )}
                </div>

                {/* A'zolik so'rovlari (chiqish/chiqarish/o'chirish kelishuvi) */}
                {requests.length > 0 && (
                    <div className="mb-5 space-y-2">
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

                {/* Owner actions */}
                {team.isOwner && (
                    <div className="mb-5 space-y-3">
                        <div className="grid grid-cols-2 gap-3">
                            <button onClick={genCode} disabled={busy} className="flex items-center justify-center gap-2 rounded-2xl py-3 text-sm font-bold text-white" style={{ background: ACCENT }}><UserPlus className="h-4 w-4" /> {t("td.inviteCode")}</button>
                            <button onClick={() => { setReqOpen(o => !o); if (!reqOpen) loadReqs(); }} className="relative flex items-center justify-center gap-2 rounded-2xl py-3 text-sm font-bold text-white/85" style={card}>
                                <Inbox className="h-4 w-4" /> {t("td.requests")}
                                {team.pendingRequests > 0 && <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full px-1 text-[11px] font-black text-white" style={{ background: "#FF3C5F" }}>{team.pendingRequests}</span>}
                            </button>
                        </div>
                        {code && (
                            <div className="flex items-center justify-between rounded-2xl px-4 py-3" style={{ background: "rgba(0,206,200,0.08)", border: "1px solid rgba(0,206,200,0.3)" }}>
                                <span className="text-lg font-black tracking-widest text-white">{code}</span>
                                <button onClick={() => { navigator.clipboard?.writeText(code); setCopied(true); setTimeout(() => setCopied(false), 1500); }} className="flex items-center gap-1.5 text-xs font-bold text-[#00CEC8]">{copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}{copied ? t("td.copied") : t("td.copy")}</button>
                            </div>
                        )}
                        {reqOpen && (
                            <div className="rounded-2xl p-2" style={card}>
                                {reqs.length === 0 ? <p className="py-4 text-center text-xs text-white/40">{t("td.noReq")}</p> : reqs.map(r => (
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
                    <div className="rounded-3xl p-8 text-center" style={card}><Shield className="mx-auto h-10 w-10 text-white/25" /><p className="mt-3 text-sm font-bold text-white/65">{t("td.rosterEmpty")}</p><p className="mt-1 text-xs text-white/40">{team.isOwner ? t("td.ownerHint") : t("td.noMembers")}</p></div>
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
                                            {m.role === "CAPTAIN" && <Crown className="h-3 w-3" />}{t("rl." + m.role)}
                                        </span>
                                        {team.isOwner && m.role !== "CAPTAIN" && <button onClick={() => setSel(sel === m.athleteId ? null : m.athleteId)} className="flex h-7 w-7 items-center justify-center rounded-lg" style={{ background: "rgba(255,255,255,0.05)" }}><Settings2 className="h-3.5 w-3.5 text-white/50" /></button>}
                                    </div>
                                    {sel === m.athleteId && team.isOwner && (
                                        <div className="mt-1.5 flex flex-wrap gap-1.5 rounded-2xl p-2" style={soft}>
                                            {ROLES.filter(x => x !== "CAPTAIN").map(rl => (
                                                <button key={rl} onClick={() => setRole(m.athleteId, rl)} className="rounded-lg px-3 py-1.5 text-xs font-bold" style={m.role === rl ? { background: ACCENT, color: "#fff" } : { background: "rgba(255,255,255,0.05)", color: "rgba(255,255,255,0.7)" }}>{t("rl." + rl)}</button>
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
                        <button onClick={leave} className="mt-2 flex w-full items-center justify-center gap-2 rounded-2xl py-3 text-sm font-bold text-red-300" style={{ background: "rgba(255,60,60,0.10)", border: "1px solid rgba(255,60,60,0.25)" }}><LogOut className="h-4 w-4" /> {t("td.leave")}</button>
                    ) : (
                        <button onClick={joinRequest} disabled={busy} className="mt-2 flex w-full items-center justify-center gap-2 rounded-2xl py-3 text-sm font-bold text-white" style={{ background: ACCENT }}>{busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <UserPlus className="h-4 w-4" />} {t("td.apply")}</button>
                    )
                )}
                {err && <div className="mt-3 flex items-center gap-2 rounded-2xl px-4 py-2.5" style={{ background: "rgba(43,62,232,0.10)", border: "1px solid rgba(43,62,232,0.3)" }}><AlertTriangle className="h-4 w-4 text-white/50" /><span className="text-xs font-semibold text-white/70">{err}</span></div>}

                {/* Egasi: o'chirish */}
                {team.isOwner && (
                    <button onClick={del} className="mt-6 flex w-full items-center justify-center gap-2 rounded-2xl py-3 text-xs font-bold text-red-300/70" style={{ background: "rgba(255,60,60,0.06)" }}><Trash2 className="h-3.5 w-3.5" /> {t("td.delete")}</button>
                )}
            </div>
        </main>
    );
}

function ReqRow({ text, onApprove, onReject, onCancel }: { text: string; onApprove?: () => void; onReject?: () => void; onCancel?: () => void }) {
    const t = useEsT();
    return (
        <div className="flex items-center gap-2 rounded-2xl p-3" style={{ background: "rgba(43,62,232,0.10)", border: "1px solid rgba(43,62,232,0.28)" }}>
            <span className="min-w-0 flex-1 text-xs font-semibold text-white/80">{text}</span>
            {onApprove && <button onClick={onApprove} className="flex h-8 items-center gap-1 rounded-lg px-3 text-xs font-bold text-white" style={{ background: ACCENT }}><Check className="h-3.5 w-3.5" /> {t("td.approve")}</button>}
            {onReject && <button onClick={onReject} className="flex h-8 items-center gap-1 rounded-lg px-3 text-xs font-bold text-white/70" style={soft}><X className="h-3.5 w-3.5" /> {t("td.reject")}</button>}
            {onCancel && <button onClick={onCancel} className="flex h-8 items-center gap-1 rounded-lg px-3 text-xs font-bold text-white/60" style={soft}>{t("td.cancel")}</button>}
        </div>
    );
}

function Avatar({ image, fallback }: { image: string | null; fallback: string }) {
    return image
        ? <img src={image} alt="" className="h-9 w-9 rounded-xl object-cover" />
        : <div className="flex h-9 w-9 items-center justify-center rounded-xl text-xs font-black text-white" style={{ background: ACCENT }}>{fallback.slice(0, 2).toUpperCase()}</div>;
}
