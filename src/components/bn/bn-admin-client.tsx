"use client";

// BN admin — arizalar navbati. Faqat OWNER/MODERATOR admin ko'radi.

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
    ShieldCheck, Store, MapPin, Phone, Check, X, Loader2, User,
    Building2, ChevronRight, Users, Ban, ShieldOff, ClipboardList, Radio, LayoutDashboard, ImageIcon,
} from "lucide-react";
import { BN, TIER_META } from "@/lib/bn-theme";
import { BnAdminList } from "./bn-admin-list";
import { BnAdminBans } from "./bn-admin-bans";
import { BnAdminBoycott } from "./bn-admin-boycott";
import { BnAdminWaitlist } from "./bn-admin-waitlist";
import { BnAdminBroadcast } from "./bn-admin-broadcast";
import { BnAdminDashboard } from "./bn-admin-dashboard";
import { BnAdminAds } from "./bn-admin-ads";

export interface AdminShopRow {
    id: string;
    slug: string;
    name: string;
    status: "PENDING" | "APPROVED" | "REJECTED" | "SUSPENDED" | "TERMINATED";
    tier: "NEW" | "TRUSTED" | "VERIFIED" | "PREMIUM";
    legalType: "YATT" | "MCHJ";
    legalName: string;
    innNumber: string;
    phone: string;
    locationType: "IN_MARKET" | "STANDALONE" | "ONLINE";
    marketName: string | null;
    marketSection: string | null;
    marketShopNo: string | null;
    address: string | null;
    city: string;
    bankName: string | null;
    bankAccount: string | null;
    bankMfo: string | null;
    createdAt: string;
    rejectReason: string | null;
    profile: {
        email: string | null; name: string | null; username: string | null; humoId: string | null;
    } | null;
}

interface Props {
    initial: AdminShopRow[];
    role: "OWNER" | "MODERATOR";
}

const TABS = [
    { key: "PENDING",    label: "Kutilmoqda" },
    { key: "APPROVED",   label: "Tasdiqlangan" },
    { key: "SUSPENDED",  label: "Muzlatilgan" },
    { key: "TERMINATED", label: "Chiqarilgan" },
    { key: "REJECTED",   label: "Rad etilgan" },
] as const;

export function BnAdminClient({ initial, role }: Props) {
    const router = useRouter();
    const [section, setSection] = useState<"DASHBOARD" | "SHOPS" | "WAITLIST" | "ADMINS" | "BANS" | "BOYCOTT" | "BROADCAST" | "ADS">("DASHBOARD");
    const [tab, setTab] = useState<AdminShopRow["status"]>("PENDING");
    const [rows, setRows] = useState<AdminShopRow[]>(initial);
    const [busyIds, setBusyIds] = useState<Set<string>>(new Set());
    const [expanded, setExpanded] = useState<string | null>(null);

    const filtered = rows.filter(s => s.status === tab);

    async function approve(id: string) {
        setBusyIds(s => new Set([...s, id]));
        try {
            const r = await fetch(`/api/bn/admin/shops/${id}/approve`, { method: "POST" });
            if (r.ok) {
                setRows(prev => prev.map(x => x.id === id ? { ...x, status: "APPROVED" } : x));
                router.refresh();
            }
        } finally {
            setBusyIds(s => { const n = new Set(s); n.delete(id); return n; });
        }
    }
    async function reject(id: string) {
        const reason = prompt("Rad etish sababi:");
        if (!reason) return;
        setBusyIds(s => new Set([...s, id]));
        try {
            const r = await fetch(`/api/bn/admin/shops/${id}/reject`, {
                method: "POST",
                headers: { "content-type": "application/json" },
                body: JSON.stringify({ reason }),
            });
            if (r.ok) {
                setRows(prev => prev.map(x => x.id === id ? { ...x, status: "REJECTED", rejectReason: reason } : x));
                router.refresh();
            }
        } finally {
            setBusyIds(s => { const n = new Set(s); n.delete(id); return n; });
        }
    }

    return (
        <div className="mx-auto max-w-[1280px] px-4 py-6 pb-16">
            <div className="flex items-center gap-3 mb-2">
                <span
                    className="w-11 h-11 rounded-2xl grid place-items-center flex-shrink-0"
                    style={{ background: BN.goldSoft, color: BN.gold }}
                >
                    <ShieldCheck className="w-5 h-5" />
                </span>
                <div>
                    <h1 className="text-[24px] sm:text-[28px] font-black tracking-tight leading-none">BN Admin</h1>
                    <p className="text-[12.5px] mt-1" style={{ color: BN.text3 }}>Do&apos;kon arizalari va boshqaruv · <span style={{ color: BN.gold }}>{role}</span></p>
                </div>
            </div>

            <div className="flex items-center gap-1.5 mt-5 mb-3 flex-wrap">
                <button
                    onClick={() => setSection("DASHBOARD")}
                    className="flex items-center gap-1.5 h-9 px-3.5 rounded-xl text-[12.5px] font-bold"
                    style={{
                        background: section === "DASHBOARD" ? BN.gold : BN.surface,
                        color: section === "DASHBOARD" ? BN.onGold : BN.text2,
                        border: `1px solid ${section === "DASHBOARD" ? BN.gold : BN.border}`,
                    }}
                >
                    <LayoutDashboard className="w-3.5 h-3.5" /> Dashboard
                </button>
                <button
                    onClick={() => setSection("SHOPS")}
                    className="flex items-center gap-1.5 h-9 px-3.5 rounded-xl text-[12.5px] font-bold"
                    style={{
                        background: section === "SHOPS" ? BN.gold : BN.surface,
                        color: section === "SHOPS" ? BN.onGold : BN.text2,
                        border: `1px solid ${section === "SHOPS" ? BN.gold : BN.border}`,
                    }}
                >
                    <Store className="w-3.5 h-3.5" /> Do&apos;konlar
                </button>
                <button
                    onClick={() => setSection("WAITLIST")}
                    className="flex items-center gap-1.5 h-9 px-3.5 rounded-xl text-[12.5px] font-bold"
                    style={{
                        background: section === "WAITLIST" ? BN.gold : BN.surface,
                        color: section === "WAITLIST" ? BN.onGold : BN.text2,
                        border: `1px solid ${section === "WAITLIST" ? BN.gold : BN.border}`,
                    }}
                >
                    <ClipboardList className="w-3.5 h-3.5" /> Waitlist
                </button>
                <button
                    onClick={() => setSection("BANS")}
                    className="flex items-center gap-1.5 h-9 px-3.5 rounded-xl text-[12.5px] font-bold"
                    style={{
                        background: section === "BANS" ? BN.gold : BN.surface,
                        color: section === "BANS" ? BN.onGold : BN.text2,
                        border: `1px solid ${section === "BANS" ? BN.gold : BN.border}`,
                    }}
                >
                    <ShieldCheck className="w-3.5 h-3.5" /> Banlar
                </button>
                <button
                    onClick={() => setSection("BOYCOTT")}
                    className="flex items-center gap-1.5 h-9 px-3.5 rounded-xl text-[12.5px] font-bold"
                    style={{
                        background: section === "BOYCOTT" ? BN.gold : BN.surface,
                        color: section === "BOYCOTT" ? BN.onGold : BN.text2,
                        border: `1px solid ${section === "BOYCOTT" ? BN.gold : BN.border}`,
                    }}
                >
                    <ShieldOff className="w-3.5 h-3.5" /> Boykot
                </button>
                <button
                    onClick={() => setSection("ADS")}
                    className="flex items-center gap-1.5 h-9 px-3.5 rounded-xl text-[12.5px] font-bold"
                    style={{
                        background: section === "ADS" ? BN.gold : BN.surface,
                        color: section === "ADS" ? BN.onGold : BN.text2,
                        border: `1px solid ${section === "ADS" ? BN.gold : BN.border}`,
                    }}
                >
                    <ImageIcon className="w-3.5 h-3.5" /> Reklama
                </button>
                {role === "OWNER" && (
                    <button
                        onClick={() => setSection("ADMINS")}
                        className="flex items-center gap-1.5 h-9 px-3.5 rounded-xl text-[12.5px] font-bold"
                        style={{
                            background: section === "ADMINS" ? BN.gold : BN.surface,
                            color: section === "ADMINS" ? BN.onGold : BN.text2,
                            border: `1px solid ${section === "ADMINS" ? BN.gold : BN.border}`,
                        }}
                    >
                        <Users className="w-3.5 h-3.5" /> Adminlar
                    </button>
                )}
                {role === "OWNER" && (
                    <button
                        onClick={() => setSection("BROADCAST")}
                        className="flex items-center gap-1.5 h-9 px-3.5 rounded-xl text-[12.5px] font-bold"
                        style={{
                            background: section === "BROADCAST" ? BN.gold : BN.surface,
                            color: section === "BROADCAST" ? BN.onGold : BN.text2,
                            border: `1px solid ${section === "BROADCAST" ? BN.gold : BN.border}`,
                        }}
                    >
                        <Radio className="w-3.5 h-3.5" /> Broadcast
                    </button>
                )}
            </div>

            {section === "DASHBOARD" ? <BnAdminDashboard /> : section === "ADMINS" && role === "OWNER" ? <BnAdminList /> : section === "BROADCAST" && role === "OWNER" ? <BnAdminBroadcast /> : section === "BANS" ? <BnAdminBans role={role} /> : section === "BOYCOTT" ? <BnAdminBoycott role={role} /> : section === "WAITLIST" ? <BnAdminWaitlist /> : section === "ADS" ? <BnAdminAds /> : (
            <><div className="flex items-center gap-1.5 my-6 overflow-x-auto pb-1">
                {TABS.map(t => {
                    const count = rows.filter(s => s.status === t.key).length;
                    return (
                        <button
                            key={t.key}
                            onClick={() => setTab(t.key)}
                            className="flex items-center gap-2 h-10 px-4 rounded-xl text-[13.5px] font-bold flex-shrink-0 transition-colors"
                            style={{
                                background: tab === t.key ? BN.goldSoft : BN.surface,
                                border: `1px solid ${tab === t.key ? BN.goldEdge : BN.border}`,
                                color: tab === t.key ? BN.gold : BN.text2,
                            }}
                        >
                            {t.label}
                            <span
                                className="min-w-[20px] h-5 px-1.5 grid place-items-center rounded-full text-[10.5px] font-black"
                                style={{ background: tab === t.key ? BN.gold : BN.surfaceUp, color: tab === t.key ? BN.onGold : BN.text3 }}
                            >
                                {count}
                            </span>
                        </button>
                    );
                })}
            </div>

            {filtered.length === 0 ? (
                <div
                    className="p-8 rounded-2xl text-center"
                    style={{ background: BN.surface, border: `1px solid ${BN.border}` }}
                >
                    <p className="text-[14px]" style={{ color: BN.text3 }}>Hozircha bu turdagi ariza yo&apos;q.</p>
                </div>
            ) : (
                <div className="space-y-2.5">
                    {filtered.map(s => {
                        const busy = busyIds.has(s.id);
                        const isOpen = expanded === s.id;
                        const tier = TIER_META[s.tier];
                        return (
                            <div
                                key={s.id}
                                className="rounded-2xl overflow-hidden"
                                style={{ background: BN.surface, border: `1px solid ${BN.border}` }}
                            >
                                <button
                                    onClick={() => setExpanded(isOpen ? null : s.id)}
                                    className="flex items-center gap-3 w-full p-4 text-left"
                                >
                                    <span
                                        className="w-11 h-11 rounded-xl grid place-items-center flex-shrink-0"
                                        style={{ background: BN.surfaceUp, color: BN.text2 }}
                                    >
                                        <Store className="w-5 h-5" />
                                    </span>
                                    <span className="flex-1 min-w-0">
                                        <span className="flex items-center gap-2 flex-wrap">
                                            <span className="text-[14.5px] font-black truncate">{s.name}</span>
                                            {s.status !== "PENDING" && (
                                                <span
                                                    className="px-1.5 py-0.5 rounded-md text-[9.5px] font-black leading-none"
                                                    style={{
                                                        background: s.status === "APPROVED" ? BN.okSoft : BN.errSoft,
                                                        color: s.status === "APPROVED" ? BN.ok : BN.err,
                                                    }}
                                                >
                                                    {s.status}
                                                </span>
                                            )}
                                            {s.status === "APPROVED" && s.tier !== "NEW" && (
                                                <span
                                                    className="px-1.5 py-0.5 rounded-md text-[9.5px] font-black leading-none"
                                                    style={{ background: `${tier.color}1F`, color: tier.color }}
                                                >
                                                    {tier.label}
                                                </span>
                                            )}
                                        </span>
                                        <span className="flex items-center gap-2 text-[11.5px] mt-1" style={{ color: BN.text3 }}>
                                            <span className="flex items-center gap-1"><Building2 className="w-3 h-3" />{s.legalType} · {s.innNumber}</span>
                                            <span>·</span>
                                            <span className="flex items-center gap-1"><Phone className="w-3 h-3" />{s.phone}</span>
                                        </span>
                                    </span>
                                    <ChevronRight
                                        className="w-4 h-4 transition-transform"
                                        style={{ transform: isOpen ? "rotate(90deg)" : undefined, color: BN.text3 }}
                                    />
                                </button>

                                {isOpen && (
                                    <div
                                        className="p-4 space-y-3 text-[13px]"
                                        style={{ borderTop: `1px solid ${BN.border}`, background: BN.surfaceUp }}
                                    >
                                        <Row label="F.I.SH / MChJ" value={s.legalName} />
                                        {s.profile && (
                                            <>
                                                <Row label="Foydalanuvchi" value={s.profile.name ?? s.profile.email ?? "—"} icon={<User className="w-3.5 h-3.5" />} />
                                                {s.profile.humoId && <Row label="Humo ID" value={s.profile.humoId} />}
                                                {s.profile.username && <Row label="@username" value={`@${s.profile.username}`} />}
                                            </>
                                        )}
                                        <Row label="Joylashuv" value={locLabel(s)} icon={<MapPin className="w-3.5 h-3.5" />} />
                                        {s.bankAccount && (
                                            <Row label="Bank" value={`${s.bankName ?? ""} · ${s.bankAccount} · MFO ${s.bankMfo ?? ""}`} />
                                        )}
                                        <Row label="Ariza sanasi" value={new Date(s.createdAt).toLocaleString("uz-UZ")} />
                                        {s.rejectReason && (
                                            <div
                                                className="p-2.5 rounded-lg text-[12.5px]"
                                                style={{ background: BN.errSoft, color: BN.err }}
                                            >
                                                Sabab: {s.rejectReason}
                                            </div>
                                        )}

                                        {(s.status === "APPROVED" || s.status === "SUSPENDED") && (
                                            <div className="flex flex-wrap items-center gap-2 pt-2">
                                                <ShopActions shopId={s.id} shopName={s.name} role={role} status={s.status} />
                                            </div>
                                        )}

                                        {s.status === "PENDING" && (
                                            <div className="flex items-center gap-2 pt-2">
                                                <button
                                                    onClick={() => approve(s.id)}
                                                    disabled={busy}
                                                    className="flex items-center justify-center gap-2 flex-1 h-11 rounded-xl text-[13.5px] font-black disabled:opacity-60"
                                                    style={{ background: BN.ok, color: "#fff" }}
                                                >
                                                    {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Check className="w-4 h-4" /> Tasdiqlash</>}
                                                </button>
                                                <button
                                                    onClick={() => reject(s.id)}
                                                    disabled={busy}
                                                    className="flex items-center justify-center gap-2 flex-1 h-11 rounded-xl text-[13.5px] font-black disabled:opacity-60"
                                                    style={{ background: BN.errSoft, color: BN.err, border: `1px solid ${BN.err}33` }}
                                                >
                                                    <X className="w-4 h-4" /> Rad etish
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            )}
            </>)}
        </div>
    );
}

function ShopActions({ shopId, shopName, role, status }: {
    shopId: string; shopName: string; role: "OWNER" | "MODERATOR"; status: "APPROVED" | "SUSPENDED";
}) {
    const [busy, setBusy] = useState(false);
    const [openBan, setOpenBan] = useState(false);
    const router = useRouter();

    async function requestTerminate() {
        const reason = prompt(`"${shopName}" ni chiqarib yuborish so'rovi — sabab (batafsil):`);
        if (!reason || reason.trim().length < 5) return;
        setBusy(true);
        try {
            const r = await fetch("/api/bn/admin/termination-requests", {
                method: "POST",
                headers: { "content-type": "application/json" },
                body: JSON.stringify({ shopId, reason: reason.trim() }),
            });
            if (r.ok) alert("So'rov yuborildi. OWNER hal qiladi.");
            else {
                const j = await r.json().catch(() => ({}));
                alert(j.error === "already_pending" ? "Bu do'kon uchun so'rov allaqachon bor" : "Xatolik");
            }
        } finally { setBusy(false); }
    }

    async function terminateNow() {
        const reason = prompt(`"${shopName}" ni HOZIROQ chiqarib yuborish (abadiy!) — sabab:`);
        if (!reason || reason.trim().length < 3) return;
        if (!confirm("Bu qaytarilmas amal. Davom etamizmi?")) return;
        setBusy(true);
        try {
            const r = await fetch("/api/bn/admin/terminate", {
                method: "POST",
                headers: { "content-type": "application/json" },
                body: JSON.stringify({ shopId, reason: reason.trim() }),
            });
            if (r.ok) { alert("Do'kon chiqarib yuborildi"); router.refresh(); }
            else alert("Xatolik");
        } finally { setBusy(false); }
    }

    return (
        <>
            {status === "APPROVED" && (
                <button
                    onClick={() => setOpenBan(true)}
                    disabled={busy}
                    className="flex items-center gap-1.5 h-10 px-3.5 rounded-xl text-[12.5px] font-bold"
                    style={{ background: "rgba(251,191,36,0.15)", color: "#fbbf24", border: "1px solid rgba(251,191,36,0.3)" }}
                >
                    <Ban className="w-3.5 h-3.5" /> Ban qo&apos;yish
                </button>
            )}
            {role === "OWNER" ? (
                <button
                    onClick={terminateNow}
                    disabled={busy}
                    className="flex items-center gap-1.5 h-10 px-3.5 rounded-xl text-[12.5px] font-bold"
                    style={{ background: "#ef4444", color: "#fff" }}
                >
                    <ShieldOff className="w-3.5 h-3.5" /> Chiqarib yuborish
                </button>
            ) : (
                <button
                    onClick={requestTerminate}
                    disabled={busy}
                    className="flex items-center gap-1.5 h-10 px-3.5 rounded-xl text-[12.5px] font-bold"
                    style={{ background: BN.surfaceUp, color: "#ef4444", border: `1px solid ${BN.border}` }}
                >
                    <ShieldOff className="w-3.5 h-3.5" /> Chiqarish so&apos;rovi
                </button>
            )}
            {openBan && <BanModal shopId={shopId} shopName={shopName} onClose={() => setOpenBan(false)} onDone={() => { setOpenBan(false); router.refresh(); }} />}
        </>
    );
}

function BanModal({ shopId, shopName, onClose, onDone }: {
    shopId: string; shopName: string; onClose: () => void; onDone: () => void;
}) {
    const [type, setType] = useState<"TEMP" | "PERM">("TEMP");
    const [days, setDays] = useState(7);
    const [reason, setReason] = useState("");
    const [publicReason, setPublicReason] = useState("");
    const [busy, setBusy] = useState(false);
    const [err, setErr] = useState<string | null>(null);

    async function submit() {
        setBusy(true); setErr(null);
        try {
            const body: Record<string, unknown> = { shopId, type, reason: reason.trim(), publicReason: publicReason.trim() || null };
            if (type === "TEMP") {
                const exp = new Date();
                exp.setDate(exp.getDate() + Math.max(1, days));
                body.expiresAt = exp.toISOString();
            }
            const r = await fetch("/api/bn/admin/ban", {
                method: "POST",
                headers: { "content-type": "application/json" },
                body: JSON.stringify(body),
            });
            if (!r.ok) {
                const j = await r.json().catch(() => ({}));
                setErr(j.error || "Xatolik");
                return;
            }
            onDone();
        } finally { setBusy(false); }
    }

    return (
        <div className="fixed inset-0 z-[200] grid place-items-center p-4" style={{ background: "rgba(0,0,0,0.7)", backdropFilter: "blur(6px)" }} onClick={onClose}>
            <div className="w-full max-w-[440px] rounded-3xl p-6 relative" style={{ background: BN.surface, border: `1px solid ${BN.border}` }} onClick={(e) => e.stopPropagation()}>
                <button onClick={onClose} className="absolute top-4 right-4" style={{ color: BN.text3 }}><X className="w-4 h-4" /></button>
                <h2 className="text-[17px] font-black mb-1">Ban qo&apos;yish</h2>
                <p className="text-[13px] mb-4" style={{ color: BN.text3 }}>{shopName}</p>

                {err && <div className="rounded-xl px-3 py-2 mb-3 text-[12.5px]" style={{ background: BN.errSoft, color: BN.err }}>{err}</div>}

                <label className="text-[11px] uppercase tracking-wider font-bold" style={{ color: BN.text3 }}>Turi</label>
                <div className="grid grid-cols-2 gap-2 mt-1 mb-3">
                    {(["TEMP", "PERM"] as const).map(t => (
                        <button key={t} onClick={() => setType(t)} className="rounded-xl px-3 py-2.5 text-[13px] font-bold"
                            style={{
                                background: type === t ? BN.goldSoft : BN.surfaceUp,
                                border: `1px solid ${type === t ? BN.goldEdge : BN.border}`,
                                color: type === t ? BN.gold : BN.text2,
                            }}>
                            {t === "TEMP" ? "Vaqtincha" : "Abadiy"}
                        </button>
                    ))}
                </div>

                {type === "TEMP" && (
                    <>
                        <label className="text-[11px] uppercase tracking-wider font-bold" style={{ color: BN.text3 }}>Necha kun</label>
                        <input type="number" value={days} onChange={e => setDays(Math.max(1, Number(e.target.value) || 1))}
                            className="w-full rounded-xl px-3 py-2.5 mt-1 mb-3 text-[14px]" min={1}
                            style={{ background: BN.surfaceUp, border: `1px solid ${BN.border}`, color: "#fff" }} />
                    </>
                )}

                <label className="text-[11px] uppercase tracking-wider font-bold" style={{ color: BN.text3 }}>Sabab (ichki)</label>
                <textarea value={reason} onChange={e => setReason(e.target.value)} rows={3}
                    placeholder="Aniq nima uchun ban qo'yildi..."
                    className="w-full rounded-xl px-3 py-2.5 mt-1 mb-3 text-[13.5px] resize-none"
                    style={{ background: BN.surfaceUp, border: `1px solid ${BN.border}`, color: "#fff" }} />

                <label className="text-[11px] uppercase tracking-wider font-bold" style={{ color: BN.text3 }}>Sotuvchiga xabar (ixtiyoriy)</label>
                <input value={publicReason} onChange={e => setPublicReason(e.target.value)}
                    placeholder="Qisqa tushuntirish sotuvchi ko'radi"
                    className="w-full rounded-xl px-3 py-2.5 mt-1 mb-4 text-[13.5px]"
                    style={{ background: BN.surfaceUp, border: `1px solid ${BN.border}`, color: "#fff" }} />

                <button onClick={submit} disabled={busy || reason.trim().length < 3}
                    className="w-full rounded-xl h-11 font-bold text-[14px] flex items-center justify-center gap-2 disabled:opacity-40"
                    style={{ background: "#ef4444", color: "#fff" }}>
                    {busy && <Loader2 className="w-4 h-4 animate-spin" />}
                    Ban qo&apos;yish
                </button>
            </div>
        </div>
    );
}

function Row({ label, value, icon }: { label: string; value: string; icon?: React.ReactNode }) {
    return (
        <div className="flex items-baseline justify-between gap-3">
            <span className="flex items-center gap-1.5 flex-shrink-0" style={{ color: BN.text3 }}>
                {icon}
                {label}
            </span>
            <span className="font-bold text-right truncate" style={{ color: BN.text }}>{value}</span>
        </div>
    );
}

function locLabel(s: AdminShopRow): string {
    if (s.locationType === "IN_MARKET") {
        const parts = [s.marketName, s.marketSection, s.marketShopNo && `${s.marketShopNo}-do'kon`].filter(Boolean);
        return parts.join(" · ");
    }
    if (s.locationType === "STANDALONE") return s.address ?? s.city;
    return "Onlayn do'kon";
}
