"use client";

// Belis admin — bookinglar boshqaruvi (@sevinch + founderlar).

import { useEffect, useState, useCallback } from "react";
import { useSession } from "next-auth/react";
import {
    ShieldCheck, Loader2, CheckCircle2, Package, Calendar, XCircle,
    Phone, MapPin, Truck, Info, Send, AlertTriangle, RotateCw, Settings, HelpCircle,
    TrendingUp, ClipboardList,
} from "lucide-react";
import { BELIS, BELIS_GOLD_GRADIENT } from "@/lib/belis-theme";
import { BelisLink } from "./belis-nav";
import { BelisChatButton } from "./belis-booking-chat";

interface Booking {
    id: string;
    code: string;
    status: "REQUESTED" | "CONFIRMED" | "PICKED_UP" | "RETURNED_OK" | "RETURNED_DAMAGE" | "LATE" | "CANCELLED";
    buyerName: string;
    buyerPhone: string;
    eventDate: string;
    pickupDate: string;
    returnDate: string;
    rentTotalUzs: number;
    depositUzs: number;
    paidRent: number;
    paidDeposit: number;
    fulfillType: "PICKUP" | "YANDEX_CUSTOMER";
    address: string | null;
    komplekt: { slug: string; nameUz: string; images: string[] } | null;
    fineUzs: number;
    refundedUzs: number;
    createdAt: string;
}

type Filter = "" | Booking["status"];

const TABS: Array<{ key: Filter; label: string; icon: React.ReactNode }> = [
    { key: "REQUESTED", label: "Yangi",       icon: <AlertTriangle className="w-3.5 h-3.5" /> },
    { key: "CONFIRMED", label: "Tasdiqlangan", icon: <CheckCircle2 className="w-3.5 h-3.5" /> },
    { key: "PICKED_UP", label: "Olib ketildi", icon: <Package className="w-3.5 h-3.5" /> },
    { key: "LATE",      label: "Kechikkan",    icon: <RotateCw className="w-3.5 h-3.5" /> },
    { key: "",          label: "Barchasi",     icon: <Calendar className="w-3.5 h-3.5" /> },
];

function fmtSom(n: number): string { return `${n.toLocaleString("uz-UZ")} so'm`; }
function fmtDate(iso: string): string {
    return new Date(iso).toLocaleDateString("uz-UZ", { day: "2-digit", month: "short" });
}

export function BelisAdminPage() {
    const { status } = useSession();
    const [filter, setFilter] = useState<Filter>("REQUESTED");
    const [rows, setRows] = useState<Booking[] | null>(null);
    const [busyIds, setBusyIds] = useState<Set<string>>(new Set());
    const [forbidden, setForbidden] = useState(false);
    const [returnTarget, setReturnTarget] = useState<Booking | null>(null);

    const load = useCallback(async () => {
        const q = filter ? `?status=${filter}` : "";
        setRows(null);
        try {
            const r = await fetch(`/api/belis/admin/bookings${q}`, { cache: "no-store" });
            if (r.status === 403) { setForbidden(true); return; }
            const d = await r.json();
            setRows(Array.isArray(d?.bookings) ? d.bookings : []);
        } catch { setRows([]); }
    }, [filter]);

    useEffect(() => {
        if (status === "authenticated") load();
    }, [status, load]);

    async function action(code: string, endpoint: "confirm" | "pickup", body?: Record<string, unknown>) {
        setBusyIds(s => new Set([...s, code]));
        try {
            const r = await fetch(`/api/belis/bookings/${code}/${endpoint}`, {
                method: "POST",
                headers: body ? { "content-type": "application/json" } : {},
                body: body ? JSON.stringify(body) : undefined,
            });
            if (r.ok) await load();
        } finally {
            setBusyIds(s => { const n = new Set(s); n.delete(code); return n; });
        }
    }

    if (status === "loading") return null;
    if (forbidden) {
        return (
            <div className="max-w-md mx-auto px-4 py-16 text-center">
                <XCircle className="w-12 h-12 mx-auto mb-3" style={{ color: BELIS.err }} />
                <p className="text-[16px] font-black" style={{ color: BELIS.text }}>Ruxsat yo&apos;q</p>
                <p className="text-[13px] mt-1" style={{ color: BELIS.text2 }}>Belis admin faqat @sevinch va founderlar uchun.</p>
            </div>
        );
    }

    return (
        <div className="max-w-5xl mx-auto px-4 py-6">
            <div className="flex items-center gap-3 mb-5">
                <span className="w-11 h-11 rounded-2xl grid place-items-center"
                    style={{ background: BELIS_GOLD_GRADIENT, color: BELIS.onGold }}>
                    <ShieldCheck className="w-5 h-5" />
                </span>
                <h1 className="text-[24px] font-black flex-1" style={{ color: BELIS.text }}>Belis admin</h1>
                <BelisLink href="/belis/admin/qollanma"
                    className="w-10 h-10 rounded-xl grid place-items-center"
                    style={{ background: BELIS.goldSoft, color: BELIS.goldDeep }}
                    title="Qo'llanma">
                    <HelpCircle className="w-4 h-4" />
                </BelisLink>
                <BelisLink href="/belis/admin/kalendar"
                    className="h-10 px-4 rounded-xl text-[13px] font-black flex items-center gap-1.5"
                    style={{ background: BELIS.surface, color: BELIS.text, border: `1px solid ${BELIS.border}` }}>
                    <Calendar className="w-4 h-4" /> Kalendar
                </BelisLink>
                <BelisLink href="/belis/admin/katalog"
                    className="h-10 px-4 rounded-xl text-[13px] font-black flex items-center gap-1.5"
                    style={{ background: BELIS.surface, color: BELIS.text, border: `1px solid ${BELIS.border}` }}>
                    <Settings className="w-4 h-4" /> Katalog
                </BelisLink>
            </div>

            {/* KPI dashboard */}
            <BelisKpiRow />

            <div className="flex items-center gap-1.5 mb-5 overflow-x-auto pb-1">
                {TABS.map(t => {
                    const active = filter === t.key;
                    return (
                        <button key={t.key || "all"} onClick={() => setFilter(t.key)}
                            className="flex items-center gap-1.5 h-10 px-4 rounded-xl text-[13px] font-black flex-shrink-0"
                            style={{
                                background: active ? BELIS_GOLD_GRADIENT : BELIS.surface,
                                color: active ? BELIS.onGold : BELIS.text2,
                                border: `1px solid ${active ? "transparent" : BELIS.border}`,
                            }}>
                            {t.icon}{t.label}
                        </button>
                    );
                })}
            </div>

            {rows === null && (
                <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin" style={{ color: BELIS.gold }} /></div>
            )}
            {rows && rows.length === 0 && (
                <div className="text-center py-16 rounded-2xl" style={{ background: BELIS.surface, border: `1px solid ${BELIS.border}` }}>
                    <Info className="w-8 h-8 mx-auto mb-2 opacity-40" style={{ color: BELIS.text3 }} />
                    <p className="text-[13px]" style={{ color: BELIS.text2 }}>Bu bo&apos;limda hozircha arizalar yo&apos;q</p>
                </div>
            )}

            {rows && rows.length > 0 && (
                <div className="space-y-2.5">
                    {rows.map(b => (
                        <AdminCard key={b.id} b={b} busy={busyIds.has(b.code)}
                            onConfirm={() => action(b.code, "confirm")}
                            onPickup={() => action(b.code, "pickup")}
                            onReturn={() => setReturnTarget(b)}
                        />
                    ))}
                </div>
            )}

            {returnTarget && (
                <ReturnModal
                    booking={returnTarget}
                    onClose={() => setReturnTarget(null)}
                    onDone={() => { setReturnTarget(null); load(); }}
                />
            )}
        </div>
    );
}

function AdminCard({ b, busy, onConfirm, onPickup, onReturn }: {
    b: Booking; busy: boolean;
    onConfirm: () => void; onPickup: () => void; onReturn: () => void;
}) {
    const isRequested = b.status === "REQUESTED";
    const isConfirmed = b.status === "CONFIRMED";
    const isPickedUpOrLate = b.status === "PICKED_UP" || b.status === "LATE";

    return (
        <div className="p-4 rounded-2xl"
            style={{
                background: BELIS.surface,
                border: `1px solid ${b.status === "LATE" ? BELIS.err : b.status === "REQUESTED" ? BELIS.gold : BELIS.border}`,
            }}>
            <div className="flex items-start gap-3 mb-3">
                <span className="w-14 h-14 rounded-xl overflow-hidden flex-shrink-0" style={{ background: BELIS.surfaceUp }}>
                    {b.komplekt?.images[0] && (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={b.komplekt.images[0]} alt="" className="w-full h-full object-cover" />
                    )}
                </span>
                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-[11px] font-black" style={{ color: BELIS.text3 }}>#{b.code}</span>
                        <StatusChip status={b.status} />
                    </div>
                    <p className="text-[14px] font-black mt-0.5" style={{ color: BELIS.text }}>{b.buyerName}</p>
                    <p className="text-[12px]" style={{ color: BELIS.text2 }}>
                        {b.komplekt?.nameUz ?? "?"} · {fmtDate(b.eventDate)}
                    </p>
                </div>
                <div className="text-right flex-shrink-0">
                    <p className="text-[14px] font-black tabular-nums" style={{ color: BELIS.goldDeep }}>{fmtSom(b.rentTotalUzs + b.depositUzs)}</p>
                </div>
            </div>

            {/* Ma'lumot qatori */}
            <div className="grid grid-cols-2 gap-2 mb-3 text-[11.5px]" style={{ color: BELIS.text2 }}>
                <div className="flex items-center gap-1"><Phone className="w-3 h-3" />{b.buyerPhone}</div>
                <div className="flex items-center gap-1">
                    {b.fulfillType === "PICKUP" ? <MapPin className="w-3 h-3" /> : <Truck className="w-3 h-3" />}
                    {b.fulfillType === "PICKUP" ? "Pickup" : "Yandex"}
                </div>
                <div>Olib ketish: <b>{fmtDate(b.pickupDate)}</b></div>
                <div>Qaytarish: <b>{fmtDate(b.returnDate)}</b></div>
            </div>

            {b.address && (
                <div className="text-[11.5px] mb-3 p-2 rounded-lg flex items-start gap-1"
                    style={{ background: BELIS.bg, color: BELIS.text2 }}>
                    <MapPin className="w-3 h-3 flex-shrink-0 mt-0.5" />{b.address}
                </div>
            )}

            <div className="flex items-center gap-2 flex-wrap">
                {isRequested && (
                    <button onClick={onConfirm} disabled={busy}
                        className="h-9 px-4 rounded-lg text-[12px] font-black flex items-center gap-1.5 disabled:opacity-60"
                        style={{ background: BELIS_GOLD_GRADIENT, color: BELIS.onGold }}>
                        {busy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <><Send className="w-3.5 h-3.5" /> Tasdiqlash</>}
                    </button>
                )}
                {isConfirmed && (
                    <button onClick={onPickup} disabled={busy}
                        className="h-9 px-4 rounded-lg text-[12px] font-black flex items-center gap-1.5 disabled:opacity-60"
                        style={{ background: BELIS_GOLD_GRADIENT, color: BELIS.onGold }}>
                        {busy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <><Package className="w-3.5 h-3.5" /> Olib ketildi</>}
                    </button>
                )}
                {isPickedUpOrLate && (
                    <button onClick={onReturn} disabled={busy}
                        className="h-9 px-4 rounded-lg text-[12px] font-black flex items-center gap-1.5 disabled:opacity-60"
                        style={{ background: BELIS_GOLD_GRADIENT, color: BELIS.onGold }}>
                        <RotateCw className="w-3.5 h-3.5" /> Qaytdi
                    </button>
                )}
                <div className="ml-auto flex items-center gap-2">
                    <BelisChatButton code={b.code} otherName={b.buyerName} />
                    <a href={`tel:${b.buyerPhone.replace(/\s/g, "")}`}
                        className="h-9 px-3 rounded-lg text-[12px] font-black flex items-center gap-1.5"
                        style={{ background: BELIS.bg, color: BELIS.text }}>
                        <Phone className="w-3.5 h-3.5" />
                    </a>
                </div>
            </div>
        </div>
    );
}

function StatusChip({ status }: { status: Booking["status"] }) {
    const table: Record<Booking["status"], { label: string; color: string }> = {
        REQUESTED:       { label: "Yangi",        color: BELIS.warn },
        CONFIRMED:       { label: "Tasdiqlangan", color: BELIS.goldDeep },
        PICKED_UP:       { label: "Olib ketildi", color: BELIS.goldDeep },
        RETURNED_OK:     { label: "Qaytdi (OK)",  color: BELIS.ok },
        RETURNED_DAMAGE: { label: "Zarar",        color: BELIS.err },
        LATE:            { label: "Kechikkan",    color: BELIS.err },
        CANCELLED:       { label: "Bekor",        color: BELIS.text3 },
    };
    const meta = table[status];
    return (
        <span className="text-[10px] font-black px-1.5 py-0.5 rounded"
            style={{ background: `${meta.color}22`, color: meta.color }}>
            {meta.label}
        </span>
    );
}

function ReturnModal({ booking, onClose, onDone }: {
    booking: Booking; onClose: () => void; onDone: () => void;
}) {
    const [ok, setOk] = useState(true);
    const [damageReport, setDamageReport] = useState("");
    const [fineUzs, setFineUzs] = useState("0");
    const [submitting, setSubmitting] = useState(false);

    async function submit() {
        setSubmitting(true);
        try {
            const r = await fetch(`/api/belis/bookings/${booking.code}/return`, {
                method: "POST",
                headers: { "content-type": "application/json" },
                body: JSON.stringify({
                    ok,
                    damageReport: damageReport.trim() || undefined,
                    fineUzs: ok ? 0 : Math.max(0, Math.floor(Number(fineUzs) || 0)),
                }),
            });
            if (r.ok) onDone();
        } finally { setSubmitting(false); }
    }

    return (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4"
            style={{ background: "rgba(0,0,0,0.65)" }} onClick={onClose}>
            <div className="w-full max-w-sm rounded-3xl p-5"
                style={{ background: BELIS.surface, border: `1px solid ${BELIS.border}` }}
                onClick={e => e.stopPropagation()}>
                <p className="text-[15px] font-black mb-1" style={{ color: BELIS.text }}>Qaytish holati</p>
                <p className="text-[12px] mb-4" style={{ color: BELIS.text3 }}>#{booking.code} · {booking.buyerName}</p>

                <div className="grid grid-cols-2 gap-2 mb-3">
                    <button onClick={() => setOk(true)}
                        className="p-3 rounded-xl text-[13px] font-black"
                        style={{
                            background: ok ? BELIS.okSoft : BELIS.bg,
                            border: `1px solid ${ok ? BELIS.ok : BELIS.border}`,
                            color: ok ? BELIS.ok : BELIS.text,
                        }}>
                        <CheckCircle2 className="w-4 h-4 mx-auto mb-1" />
                        Butun qaytdi
                    </button>
                    <button onClick={() => setOk(false)}
                        className="p-3 rounded-xl text-[13px] font-black"
                        style={{
                            background: !ok ? BELIS.errSoft : BELIS.bg,
                            border: `1px solid ${!ok ? BELIS.err : BELIS.border}`,
                            color: !ok ? BELIS.err : BELIS.text,
                        }}>
                        <AlertTriangle className="w-4 h-4 mx-auto mb-1" />
                        Zarar/kam
                    </button>
                </div>

                {!ok && (
                    <>
                        <textarea value={damageReport} onChange={e => setDamageReport(e.target.value.slice(0, 2000))}
                            rows={3} placeholder="Qanday zarar (masalan: 2 tog'ora sinib qolgan)"
                            className="w-full p-3 rounded-xl text-[13px] resize-none focus:outline-none mb-2"
                            style={{ background: BELIS.bg, color: BELIS.text, border: `1px solid ${BELIS.border}` }} />
                        <label className="text-[12px] font-black mb-1 block" style={{ color: BELIS.text }}>Shtraf (so&apos;m)</label>
                        <input value={fineUzs} onChange={e => setFineUzs(e.target.value.replace(/\D/g, ""))}
                            placeholder="0" inputMode="numeric"
                            className="w-full h-11 px-3 rounded-xl text-[13px] focus:outline-none"
                            style={{ background: BELIS.bg, color: BELIS.text, border: `1px solid ${BELIS.border}` }} />
                    </>
                )}

                <div className="flex items-center gap-2 mt-4">
                    <button onClick={onClose} className="flex-1 h-11 rounded-xl text-[13px] font-black"
                        style={{ background: BELIS.bg, color: BELIS.text }}>Bekor</button>
                    <button onClick={submit} disabled={submitting}
                        className="flex-1 h-11 rounded-xl text-[13px] font-black flex items-center justify-center gap-1.5 disabled:opacity-60"
                        style={{ background: BELIS_GOLD_GRADIENT, color: BELIS.onGold }}>
                        {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : "Yozib qo'yish"}
                    </button>
                </div>
            </div>
        </div>
    );
}

// KPI dashboard qatori — bugun/hafta/butun vaqt statistikasi
interface Stats {
    today: { pickups: number; returns: number; requests: number };
    thisWeek: { newBookings: number; completedOrders: number; expectedRevenue: number; actualRevenue: number };
    allTime: { totalBookings: number; totalRevenue: number; activeKomplekts: number; activeItems: number };
}

function BelisKpiRow() {
    const [stats, setStats] = useState<Stats | null>(null);
    useEffect(() => {
        fetch("/api/belis/admin/stats", { cache: "no-store" })
            .then(r => r.json())
            .then(d => setStats(d))
            .catch(() => {});
    }, []);

    return (
        <div className="mb-5">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                <KpiCard
                    icon={<ClipboardList className="w-4 h-4" />}
                    label="Bugungi ariza"
                    value={stats?.today.requests ?? "…"}
                    hint={stats ? `${stats.today.pickups} pickup · ${stats.today.returns} qaytish` : ""}
                    accent
                />
                <KpiCard
                    icon={<Package className="w-4 h-4" />}
                    label="Hafta bookinglar"
                    value={stats?.thisWeek.newBookings ?? "…"}
                    hint={stats ? `${stats.thisWeek.completedOrders} yakunlangan` : ""}
                />
                <KpiCard
                    icon={<TrendingUp className="w-4 h-4" />}
                    label="Hafta daromad"
                    value={stats ? `${(stats.thisWeek.actualRevenue / 1000).toFixed(0)}K` : "…"}
                    hint={stats ? `${(stats.thisWeek.expectedRevenue / 1000).toFixed(0)}K kutilyapti` : ""}
                    accent
                />
                <KpiCard
                    icon={<ShieldCheck className="w-4 h-4" />}
                    label="Katalog"
                    value={stats?.allTime.activeKomplekts ?? "…"}
                    hint={stats ? `${stats.allTime.activeItems} quti aktiv` : ""}
                />
            </div>
        </div>
    );
}

function KpiCard({ icon, label, value, hint, accent }: {
    icon: React.ReactNode;
    label: string;
    value: string | number;
    hint: string;
    accent?: boolean;
}) {
    return (
        <div className="rounded-2xl p-3"
            style={{
                background: accent ? BELIS_GOLD_GRADIENT : BELIS.surface,
                border: `1px solid ${accent ? "transparent" : BELIS.border}`,
            }}>
            <div className="flex items-center gap-1 text-[11px] font-black"
                style={{ color: accent ? BELIS.onGold : BELIS.text3 }}>
                {icon} {label}
            </div>
            <p className="text-[20px] font-black mt-1 tabular-nums"
                style={{ color: accent ? BELIS.onGold : BELIS.text }}>
                {value}
            </p>
            {hint && (
                <p className="text-[10.5px] mt-0.5"
                    style={{ color: accent ? "rgba(58,53,32,0.65)" : BELIS.text3 }}>
                    {hint}
                </p>
            )}
        </div>
    );
}
