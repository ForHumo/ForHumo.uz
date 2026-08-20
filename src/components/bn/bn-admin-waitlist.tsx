"use client";

// BN admin — sotuvchi WAITLIST paneli.
// Jalol shu ekrandan qo'ng'iroq qilinadigan ro'yxatni ko'radi, holatni yangilaydi.

import { useState, useEffect, useCallback } from "react";
import {
    ClipboardList, Loader2, Phone, MessageCircle, Check, X,
    Clock, PhoneCall, Store, Trash2, Download,
} from "lucide-react";
import { BN } from "@/lib/bn-theme";

type Status = "PENDING" | "CONTACTED" | "CONVERTED" | "REJECTED";

interface WaitlistEntry {
    id: string;
    name: string;
    phone: string;
    city: string;
    marketSlug: string | null;
    marketName: string | null;
    category: string | null;
    note: string | null;
    source: string | null;
    ref: string | null;
    status: Status;
    contactNote: string | null;
    contactedAt: string | null;
    contactedBy: { name: string | null; username: string | null } | null;
    createdAt: string;
}

const TABS: { key: Status; label: string; icon: React.ReactNode; color: string }[] = [
    { key: "PENDING",   label: "Yangi",       icon: <Clock className="w-3.5 h-3.5" />,    color: BN.gold },
    { key: "CONTACTED", label: "Aloqa qilindi", icon: <PhoneCall className="w-3.5 h-3.5" />, color: BN.info },
    { key: "CONVERTED", label: "Do'kon ochdi", icon: <Store className="w-3.5 h-3.5" />,   color: BN.ok },
    { key: "REJECTED",  label: "Rad",         icon: <X className="w-3.5 h-3.5" />,        color: BN.err },
];

export function BnAdminWaitlist() {
    const [tab, setTab] = useState<Status>("PENDING");
    const [entries, setEntries] = useState<WaitlistEntry[]>([]);
    const [stats, setStats] = useState<Record<string, number>>({});
    const [loading, setLoading] = useState(true);
    const [busyIds, setBusyIds] = useState<Set<string>>(new Set());

    const load = useCallback(() => {
        setLoading(true);
        fetch(`/api/bn/admin/waitlist?status=${tab}`)
            .then(r => r.json())
            .then(d => { setEntries(d.entries ?? []); setStats(d.stats ?? {}); })
            .catch(() => { /* ignore */ })
            .finally(() => setLoading(false));
    }, [tab]);

    useEffect(() => { load(); }, [load]);

    async function updateEntry(id: string, patch: { status?: Status; contactNote?: string }) {
        setBusyIds(s => new Set([...s, id]));
        try {
            const r = await fetch(`/api/bn/admin/waitlist/${id}`, {
                method: "PATCH",
                headers: { "content-type": "application/json" },
                body: JSON.stringify(patch),
            });
            const d = await r.json();
            if (!r.ok) { alert(d?.error ?? "Xatolik"); return; }
            // Agar status o'zgarsa — hozirgi tab'dan olib tashlab, statistikani qayta yuklaymiz
            if (patch.status && patch.status !== tab) {
                setEntries(prev => prev.filter(e => e.id !== id));
                setStats(prev => {
                    const next = { ...prev };
                    next[tab] = Math.max(0, (next[tab] ?? 1) - 1);
                    next[patch.status!] = (next[patch.status!] ?? 0) + 1;
                    return next;
                });
            } else if (d.entry) {
                setEntries(prev => prev.map(e => e.id === id ? d.entry : e));
            }
        } finally {
            setBusyIds(s => { const n = new Set(s); n.delete(id); return n; });
        }
    }

    const total = Object.values(stats).reduce((a, b) => a + b, 0);

    return (
        <div>
            {/* Tab bar + CSV eksport */}
            <div className="flex items-center gap-1.5 mb-4 flex-wrap">
                {TABS.map(t => {
                    const active = tab === t.key;
                    const count = stats[t.key] ?? 0;
                    return (
                        <button
                            key={t.key}
                            onClick={() => setTab(t.key)}
                            className="flex items-center gap-1.5 h-9 px-3.5 rounded-xl text-[12.5px] font-bold"
                            style={{
                                background: active ? t.color : BN.surface,
                                color: active ? "#000" : BN.text2,
                                border: `1px solid ${active ? t.color : BN.border}`,
                            }}
                        >
                            {t.icon}
                            {t.label}
                            {count > 0 && (
                                <span className="min-w-[18px] h-[18px] px-1 grid place-items-center rounded-full text-[10px] font-black"
                                    style={{ background: active ? "rgba(0,0,0,0.15)" : BN.surfaceUp, color: active ? "#000" : BN.text3 }}>
                                    {count}
                                </span>
                            )}
                        </button>
                    );
                })}

                {/* CSV eksport — hozirgi tab uchun + hammasi */}
                <div className="flex items-center gap-1.5 ml-auto">
                    <a
                        href={`/api/bn/admin/waitlist/export?status=${tab}`}
                        title={`${tab} — CSV yuklash (Excel'da ochiladi)`}
                        className="flex items-center gap-1.5 h-9 px-3 rounded-xl text-[12px] font-bold transition-transform active:scale-[0.97]"
                        style={{ background: BN.surface, border: `1px solid ${BN.borderGold}`, color: BN.gold }}
                    >
                        <Download className="w-3.5 h-3.5" />
                        CSV ({stats[tab] ?? 0})
                    </a>
                    {total > (stats[tab] ?? 0) && (
                        <a
                            href="/api/bn/admin/waitlist/export"
                            title="Barcha statuslar birga — CSV"
                            className="flex items-center gap-1.5 h-9 px-3 rounded-xl text-[12px] font-bold transition-transform active:scale-[0.97]"
                            style={{ background: BN.surface, border: `1px solid ${BN.border}`, color: BN.text2 }}
                        >
                            <Download className="w-3.5 h-3.5" />
                            Hammasi ({total})
                        </a>
                    )}
                </div>
            </div>

            {loading ? (
                <div className="grid place-items-center py-12">
                    <Loader2 className="w-6 h-6 animate-spin" style={{ color: BN.gold }} />
                </div>
            ) : entries.length === 0 ? (
                <div className="p-8 text-center rounded-2xl"
                    style={{ background: BN.surface, border: `1px solid ${BN.border}` }}>
                    <ClipboardList className="w-8 h-8 mx-auto mb-3" style={{ color: BN.text3 }} />
                    <p className="text-[14px] font-bold" style={{ color: BN.text2 }}>Ro&apos;yxat bo&apos;sh</p>
                </div>
            ) : (
                <div className="space-y-2.5">
                    {entries.map(e => (
                        <WaitlistCard
                            key={e.id}
                            e={e}
                            busy={busyIds.has(e.id)}
                            onUpdate={patch => updateEntry(e.id, patch)}
                        />
                    ))}
                </div>
            )}
        </div>
    );
}

function WaitlistCard({
    e, busy, onUpdate,
}: { e: WaitlistEntry; busy: boolean; onUpdate: (p: { status?: Status; contactNote?: string }) => void }) {
    const [noteOpen, setNoteOpen] = useState(false);
    const [note, setNote] = useState(e.contactNote ?? "");
    const phoneClean = e.phone.replace(/\s/g, "");

    return (
        <div className="p-4 rounded-2xl" style={{ background: BN.surface, border: `1px solid ${BN.border}` }}>
            <div className="flex items-start gap-3 mb-3 flex-wrap">
                <div className="flex-1 min-w-[220px]">
                    <p className="text-[15px] font-black">{e.name}</p>
                    <a href={`tel:${phoneClean}`}
                        className="inline-flex items-center gap-1 mt-1 text-[13px] font-bold tabular-nums"
                        style={{ color: BN.gold }}>
                        <Phone className="w-3.5 h-3.5" />
                        {e.phone}
                    </a>
                    <p className="text-[11.5px] mt-1.5" style={{ color: BN.text3 }}>
                        {new Date(e.createdAt).toLocaleString("uz-UZ", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}
                        {e.source && <> · <span style={{ color: BN.text2 }}>{e.source}</span></>}
                        {e.ref && <> · ref: <span style={{ color: BN.gold }}>{e.ref}</span></>}
                    </p>
                </div>

                {/* Tezkor aloqa tugmalari */}
                <div className="flex items-center gap-2 flex-shrink-0">
                    <a href={`tel:${phoneClean}`}
                        className="h-9 px-3 grid place-items-center rounded-lg text-[12.5px] font-bold"
                        style={{ background: BN.gold, color: "#000" }}>
                        <Phone className="w-3.5 h-3.5" />
                    </a>
                    <a href={`https://wa.me/${phoneClean.replace(/^\+/, "")}`}
                        target="_blank" rel="noopener noreferrer"
                        className="h-9 px-3 grid place-items-center rounded-lg text-[12.5px] font-bold"
                        style={{ background: "#25D366", color: "#fff" }}>
                        <MessageCircle className="w-3.5 h-3.5" />
                    </a>
                </div>
            </div>

            {/* Ma'lumot */}
            <div className="flex flex-wrap gap-x-4 gap-y-1.5 mb-3 text-[12.5px]">
                {e.marketName && (
                    <span style={{ color: BN.text2 }}>
                        <span style={{ color: BN.text3 }}>Bozor:</span> <b>{e.marketName}</b>
                    </span>
                )}
                {e.category && (
                    <span style={{ color: BN.text2 }}>
                        <span style={{ color: BN.text3 }}>Kategoriya:</span> <b>{e.category}</b>
                    </span>
                )}
                <span style={{ color: BN.text2 }}>
                    <span style={{ color: BN.text3 }}>Shahar:</span> <b>{e.city}</b>
                </span>
            </div>

            {e.note && (
                <p className="p-2.5 rounded-lg text-[12.5px] mb-3"
                    style={{ background: BN.surfaceUp, color: BN.text2 }}>
                    <span style={{ color: BN.text3 }}>Foydalanuvchi izohi:</span> {e.note}
                </p>
            )}

            {/* Aloqa izohi (admin yozgan) */}
            {noteOpen ? (
                <div className="mb-3">
                    <textarea
                        value={note}
                        onChange={ev => setNote(ev.target.value)}
                        rows={2}
                        maxLength={1000}
                        placeholder="Suhbat izohi (masalan: 'Payshanba 15:00 da qo'ng'iroq qilamiz')"
                        className="w-full p-2.5 rounded-lg text-[12.5px] outline-none resize-none"
                        style={{ background: BN.surfaceUp, border: `1px solid ${BN.border}`, color: BN.text }}
                    />
                    <div className="flex items-center gap-2 mt-2">
                        <button
                            onClick={() => { onUpdate({ contactNote: note }); setNoteOpen(false); }}
                            disabled={busy}
                            className="h-8 px-3 rounded-lg text-[12px] font-bold"
                            style={{ background: BN.gold, color: "#000" }}>
                            Saqlash
                        </button>
                        <button onClick={() => { setNote(e.contactNote ?? ""); setNoteOpen(false); }}
                            className="h-8 px-3 rounded-lg text-[12px] font-bold"
                            style={{ background: BN.surfaceUp, color: BN.text2 }}>
                            Bekor
                        </button>
                    </div>
                </div>
            ) : e.contactNote ? (
                <div className="mb-3 p-2.5 rounded-lg text-[12.5px] flex items-start gap-2"
                    style={{ background: `${BN.info}14`, color: BN.text2 }}>
                    <span style={{ color: BN.text3 }}>Aloqa izohi:</span>
                    <span className="flex-1">{e.contactNote}</span>
                    <button onClick={() => setNoteOpen(true)}
                        className="text-[11px] font-bold flex-shrink-0"
                        style={{ color: BN.gold }}>Tahrir</button>
                </div>
            ) : (
                <button onClick={() => setNoteOpen(true)}
                    className="mb-3 text-[11.5px] font-bold"
                    style={{ color: BN.gold }}>
                    + Aloqa izohi qo&apos;shish
                </button>
            )}

            {/* Kim aloqa qildi */}
            {e.contactedAt && e.contactedBy && (
                <p className="text-[11px] mb-3" style={{ color: BN.text3 }}>
                    Aloqa qildi: <b style={{ color: BN.text2 }}>{e.contactedBy.name ?? e.contactedBy.username ?? "?"}</b>
                    {" · "}
                    {new Date(e.contactedAt).toLocaleString("uz-UZ", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}
                </p>
            )}

            {/* Status action buttons */}
            <div className="flex items-center gap-2 flex-wrap">
                {e.status !== "CONTACTED" && (
                    <button onClick={() => onUpdate({ status: "CONTACTED" })} disabled={busy}
                        className="h-8 px-3 rounded-lg text-[12px] font-bold flex items-center gap-1.5"
                        style={{ background: `${BN.info}22`, color: BN.info }}>
                        <PhoneCall className="w-3.5 h-3.5" /> Aloqa qildim
                    </button>
                )}
                {e.status !== "CONVERTED" && (
                    <button onClick={() => onUpdate({ status: "CONVERTED" })} disabled={busy}
                        className="h-8 px-3 rounded-lg text-[12px] font-bold flex items-center gap-1.5"
                        style={{ background: `${BN.ok}22`, color: BN.ok }}>
                        <Check className="w-3.5 h-3.5" /> Do&apos;kon ochdi
                    </button>
                )}
                {e.status !== "REJECTED" && (
                    <button onClick={() => onUpdate({ status: "REJECTED" })} disabled={busy}
                        className="h-8 px-3 rounded-lg text-[12px] font-bold flex items-center gap-1.5"
                        style={{ background: `${BN.err}22`, color: BN.err }}>
                        <Trash2 className="w-3.5 h-3.5" /> Rad
                    </button>
                )}
                {e.status !== "PENDING" && (
                    <button onClick={() => onUpdate({ status: "PENDING" })} disabled={busy}
                        className="h-8 px-3 rounded-lg text-[12px] font-bold"
                        style={{ background: BN.surfaceUp, color: BN.text3 }}>
                        Yangi'ga qaytarish
                    </button>
                )}
                {busy && <Loader2 className="w-4 h-4 animate-spin" style={{ color: BN.gold }} />}
            </div>
        </div>
    );
}
