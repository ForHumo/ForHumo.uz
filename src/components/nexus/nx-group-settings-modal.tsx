"use client";

// Guruh sozlamalari modali (OWNER/ADMIN).
// Ismi, tavsif, avatar/cover, qoidalar, ruxsatlar, slow mode, auto-delete, restrict forward.

import { useEffect, useState } from "react";
import { X, Loader2, Save, Trash2, Clock, ShieldOff, Users, MessageSquare, Image, Link as LinkIcon, Pin, Info } from "lucide-react";

type ChannelData = {
    id: string; name: string; description: string | null; handle: string | null;
    avatarUrl: string | null; coverUrl: string | null; rules: string | null;
    isPrivate: boolean; type: "CHANNEL" | "GROUP";
    slowModeSeconds: number;
    autoDeleteAfterSeconds: number;
    restrictForwarding: boolean;
    allowComments: boolean;
    isOwner: boolean;
    role: "OWNER" | "ADMIN" | "MEMBER" | null;
    defaultPermissions: Record<string, boolean> | null;
};

const AUTO_DELETE_OPTIONS = [
    { label: "O'chirilgan", value: 0 },
    { label: "24 soat", value: 86400 },
    { label: "7 kun", value: 7 * 86400 },
    { label: "30 kun", value: 30 * 86400 },
];

const SLOW_MODE_OPTIONS = [
    { label: "O'chirilgan", value: 0 },
    { label: "10 sekund", value: 10 },
    { label: "30 sekund", value: 30 },
    { label: "1 daqiqa", value: 60 },
    { label: "5 daqiqa", value: 300 },
    { label: "15 daqiqa", value: 900 },
    { label: "1 soat", value: 3600 },
];

const PERM_LABELS: Array<{ key: string; label: string; icon: React.ComponentType<{ className?: string; style?: React.CSSProperties }> }> = [
    { key: "sendMessages", label: "Xabar yuborish", icon: MessageSquare },
    { key: "sendMedia", label: "Media yuborish", icon: Image },
    { key: "sendLinks", label: "Havola yuborish", icon: LinkIcon },
    { key: "addMembers", label: "A'zo qo'shish", icon: Users },
    { key: "pinMessages", label: "Pin qilish", icon: Pin },
    { key: "changeInfo", label: "Ma'lumot tahriri", icon: Info },
];

export function NxGroupSettingsModal({
    open, channelId, onClose, onUpdated, onDeleted,
}: {
    open: boolean;
    channelId: string;
    onClose: () => void;
    onUpdated?: () => void;
    onDeleted?: () => void;
}) {
    const [data, setData] = useState<ChannelData | null>(null);
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        if (!open) return;
        setLoading(true);
        fetch(`/api/nexus/channels/${channelId}`)
            .then(r => r.ok ? r.json() : { channel: null })
            .then(d => setData(d.channel))
            .finally(() => setLoading(false));
    }, [open, channelId]);

    if (!open) return null;

    const canEdit = data?.isOwner || data?.role === "ADMIN";
    const isOwner = !!data?.isOwner;

    const save = async () => {
        if (!data) return;
        setSaving(true);
        try {
            const r = await fetch(`/api/nexus/channels/${channelId}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    name: data.name,
                    description: data.description ?? "",
                    rules: data.rules ?? "",
                    slowModeSeconds: data.slowModeSeconds,
                    autoDeleteAfterSeconds: data.autoDeleteAfterSeconds,
                    restrictForwarding: data.restrictForwarding,
                    defaultPermissions: data.defaultPermissions,
                }),
            });
            if (r.ok) {
                onUpdated?.();
                onClose();
            }
        } finally { setSaving(false); }
    };

    const del = async () => {
        if (!confirm("Guruhni butunlay o'chirasizmi? Barcha xabarlar yo'qoladi.")) return;
        setSaving(true);
        try {
            const r = await fetch(`/api/nexus/channels/${channelId}`, { method: "DELETE" });
            if (r.ok) {
                onDeleted?.();
                onClose();
            }
        } finally { setSaving(false); }
    };

    const setPerm = (key: string, value: boolean) => {
        if (!data) return;
        const perms = { ...(data.defaultPermissions || {}), [key]: value };
        setData({ ...data, defaultPermissions: perms });
    };

    return (
        <>
            <div className="fixed inset-0 z-[320] bg-black/60 backdrop-blur-sm" onClick={onClose} />
            <div className="fixed inset-x-0 bottom-0 z-[321] flex max-h-[90vh] flex-col overflow-hidden rounded-t-3xl md:inset-y-0 md:right-0 md:inset-x-auto md:max-h-full md:w-[460px] md:rounded-none md:rounded-l-3xl"
                style={{ background: "rgba(8,12,32,0.99)", border: "1px solid rgba(43,62,232,0.3)" }}
                onClick={e => e.stopPropagation()}>

                <div className="flex items-center justify-between px-5 py-4 flex-shrink-0"
                    style={{ borderBottom: "1px solid rgba(43,62,232,0.14)" }}>
                    <h3 className="text-base font-black text-white">Guruh sozlamalari</h3>
                    <button onClick={onClose}
                        className="flex h-8 w-8 items-center justify-center rounded-full"
                        style={{ background: "rgba(43,62,232,0.12)", border: "1px solid rgba(43,62,232,0.22)" }}>
                        <X className="h-4 w-4 text-white" />
                    </button>
                </div>

                {loading || !data ? (
                    <div className="flex justify-center py-16">
                        <Loader2 className="w-6 h-6 animate-spin" style={{ color: "#2B3EE8" }} />
                    </div>
                ) : (
                    <>
                        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-5" style={{ scrollbarWidth: "none" }}>
                            {/* Nom */}
                            <div>
                                <label className="block text-[10px] uppercase tracking-widest mb-1.5" style={{ color: "rgba(140,160,210,0.7)" }}>
                                    Nom
                                </label>
                                <input disabled={!canEdit} value={data.name}
                                    onChange={e => setData({ ...data, name: e.target.value })}
                                    className="w-full rounded-xl px-3 py-2.5 text-sm text-white outline-none disabled:opacity-60"
                                    style={{ background: "rgba(5,8,24,0.60)", border: "1px solid rgba(43,62,232,0.22)", caretColor: "#00CEC8" }} />
                            </div>

                            {/* Tavsif */}
                            <div>
                                <label className="block text-[10px] uppercase tracking-widest mb-1.5" style={{ color: "rgba(140,160,210,0.7)" }}>
                                    Tavsif
                                </label>
                                <textarea disabled={!canEdit} value={data.description ?? ""}
                                    onChange={e => setData({ ...data, description: e.target.value })}
                                    rows={3}
                                    className="w-full rounded-xl px-3 py-2.5 text-sm text-white outline-none resize-none disabled:opacity-60"
                                    style={{ background: "rgba(5,8,24,0.60)", border: "1px solid rgba(43,62,232,0.22)", caretColor: "#00CEC8" }} />
                            </div>

                            {/* Qoidalar */}
                            <div>
                                <label className="block text-[10px] uppercase tracking-widest mb-1.5" style={{ color: "rgba(140,160,210,0.7)" }}>
                                    Qoidalar (a&apos;zolar ko&apos;radi)
                                </label>
                                <textarea disabled={!canEdit} value={data.rules ?? ""}
                                    onChange={e => setData({ ...data, rules: e.target.value })}
                                    rows={4}
                                    placeholder="Guruh qoidalarini yozing..."
                                    className="w-full rounded-xl px-3 py-2.5 text-sm text-white outline-none resize-none disabled:opacity-60"
                                    style={{ background: "rgba(5,8,24,0.60)", border: "1px solid rgba(43,62,232,0.22)", caretColor: "#00CEC8" }} />
                            </div>

                            {/* Slow mode */}
                            {data.type === "GROUP" && (
                                <div>
                                    <label className="block text-[10px] uppercase tracking-widest mb-1.5 flex items-center gap-1.5" style={{ color: "rgba(140,160,210,0.7)" }}>
                                        <Clock className="w-3 h-3" /> Slow mode
                                    </label>
                                    <select disabled={!canEdit} value={data.slowModeSeconds}
                                        onChange={e => setData({ ...data, slowModeSeconds: Number(e.target.value) })}
                                        className="w-full rounded-xl px-3 py-2.5 text-sm text-white outline-none disabled:opacity-60"
                                        style={{ background: "rgba(5,8,24,0.60)", border: "1px solid rgba(43,62,232,0.22)" }}>
                                        {SLOW_MODE_OPTIONS.map(o => (
                                            <option key={o.value} value={o.value} style={{ background: "#080C20" }}>{o.label}</option>
                                        ))}
                                    </select>
                                </div>
                            )}

                            {/* Auto-delete */}
                            <div>
                                <label className="block text-[10px] uppercase tracking-widest mb-1.5 flex items-center gap-1.5" style={{ color: "rgba(140,160,210,0.7)" }}>
                                    <Trash2 className="w-3 h-3" /> Xabarlar auto-o&apos;chishi
                                </label>
                                <select disabled={!canEdit} value={data.autoDeleteAfterSeconds}
                                    onChange={e => setData({ ...data, autoDeleteAfterSeconds: Number(e.target.value) })}
                                    className="w-full rounded-xl px-3 py-2.5 text-sm text-white outline-none disabled:opacity-60"
                                    style={{ background: "rgba(5,8,24,0.60)", border: "1px solid rgba(43,62,232,0.22)" }}>
                                    {AUTO_DELETE_OPTIONS.map(o => (
                                        <option key={o.value} value={o.value} style={{ background: "#080C20" }}>{o.label}</option>
                                    ))}
                                </select>
                            </div>

                            {/* Restrict forwarding — faqat owner */}
                            {isOwner && (
                                <label className="flex items-center gap-3 rounded-xl px-3 py-3"
                                    style={{ background: "rgba(11,18,40,0.55)", border: "1px solid rgba(43,62,232,0.14)" }}>
                                    <input type="checkbox" checked={data.restrictForwarding}
                                        onChange={e => setData({ ...data, restrictForwarding: e.target.checked })} />
                                    <div className="flex-1">
                                        <p className="text-sm font-bold text-white flex items-center gap-1.5">
                                            <ShieldOff className="w-3.5 h-3.5" style={{ color: "#00CEC8" }} />
                                            Forward taqiqi
                                        </p>
                                        <p className="text-[11px]" style={{ color: "rgba(140,160,210,0.7)" }}>
                                            A&apos;zolar xabarlarni boshqa suhbatga jo&apos;nata olmaydi
                                        </p>
                                    </div>
                                </label>
                            )}

                            {/* Default permissions — faqat guruh + owner */}
                            {data.type === "GROUP" && isOwner && (
                                <div>
                                    <label className="block text-[10px] uppercase tracking-widest mb-2" style={{ color: "rgba(140,160,210,0.7)" }}>
                                        A&apos;zolar uchun ruxsatlar
                                    </label>
                                    <div className="space-y-1.5">
                                        {PERM_LABELS.map(({ key, label, icon: Icon }) => {
                                            const val = data.defaultPermissions?.[key] ?? true;
                                            return (
                                                <label key={key}
                                                    className="flex items-center gap-3 rounded-xl px-3 py-2.5"
                                                    style={{ background: "rgba(11,18,40,0.55)", border: "1px solid rgba(43,62,232,0.14)" }}>
                                                    <input type="checkbox" checked={val}
                                                        onChange={e => setPerm(key, e.target.checked)} />
                                                    <Icon className="w-4 h-4 flex-shrink-0" style={{ color: "rgba(140,160,210,0.8)" }} />
                                                    <p className="text-sm text-white flex-1">{label}</p>
                                                </label>
                                            );
                                        })}
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Actions */}
                        <div className="flex-shrink-0 px-5 py-4 space-y-2" style={{ borderTop: "1px solid rgba(43,62,232,0.14)" }}>
                            {canEdit && (
                                <button onClick={save} disabled={saving}
                                    className="w-full flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-bold text-white disabled:opacity-60"
                                    style={{ background: "linear-gradient(135deg,#2B3EE8,#00CEC8)" }}>
                                    {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                                    Saqlash
                                </button>
                            )}
                            {isOwner && !data.name?.startsWith("For Humo") && (
                                <button onClick={del} disabled={saving}
                                    className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-bold disabled:opacity-60"
                                    style={{ background: "rgba(255,80,90,0.1)", border: "1px solid rgba(255,80,90,0.3)", color: "#FF505A" }}>
                                    <Trash2 className="w-4 h-4" />
                                    Guruhni o&apos;chirish
                                </button>
                            )}
                        </div>
                    </>
                )}
            </div>
        </>
    );
}
