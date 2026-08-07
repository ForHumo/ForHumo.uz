"use client";

// BN admin — arizalar navbati. Faqat OWNER/MODERATOR admin ko'radi.

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
    ShieldCheck, Store, MapPin, Phone, Check, X, Loader2, User,
    Building2, ChevronRight, Users,
} from "lucide-react";
import { BN, TIER_META } from "@/lib/bn-theme";
import { BnAdminList } from "./bn-admin-list";

export interface AdminShopRow {
    id: string;
    slug: string;
    name: string;
    status: "PENDING" | "APPROVED" | "REJECTED" | "SUSPENDED";
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
    { key: "PENDING",  label: "Kutilmoqda" },
    { key: "APPROVED", label: "Tasdiqlangan" },
    { key: "REJECTED", label: "Rad etilgan" },
] as const;

export function BnAdminClient({ initial, role }: Props) {
    const router = useRouter();
    const [section, setSection] = useState<"SHOPS" | "ADMINS">("SHOPS");
    const [tab, setTab] = useState<"PENDING" | "APPROVED" | "REJECTED">("PENDING");
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

            {role === "OWNER" && (
                <div className="flex items-center gap-1.5 mt-5 mb-3">
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
                </div>
            )}

            {section === "ADMINS" && role === "OWNER" ? <BnAdminList /> : (
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
