"use client";

// Bot boshqaruv modali (owner uchun) — 4 tab: Info / Sozlamalar / Buyruqlar / Statistika.
// Webhook test tugma + real-time response. API kalit rotate. Commands editor form.

import { useEffect, useState } from "react";
import {
    X, Bot, Loader2, Save, Trash2, RotateCw, Zap, Copy, Check, Plus,
    BarChart2, Settings as SettingsIcon, Terminal, Info as InfoIcon, AlertTriangle,
} from "lucide-react";

type Tab = "info" | "settings" | "commands" | "stats";

type Cmd = { cmd: string; description: string };

type AgentDetail = {
    id: string; profileId: string; username: string; name: string;
    image: string | null; humoId: string;
    webhookUrl: string | null;
    commands: Cmd[];
};

type StatsData = {
    received: { day: number; week: number; month: number; total: number };
    sent: { day: number; week: number; month: number; total: number };
    uniqueUsers: number;
    activeUsers7d: number;
    daily?: Array<{ date: string; received: number; sent: number }>;
    topCommands?: Array<{ cmd: string; count: number }>;
    hasWebhook: boolean;
    hasApiKey: boolean;
    createdAt: string;
};

export function NxAgentManageModal({
    open, agentId, onClose, onDeleted,
}: {
    open: boolean;
    agentId: string;
    onClose: () => void;
    onDeleted: () => void;
}) {
    const [tab, setTab] = useState<Tab>("info");
    const [detail, setDetail] = useState<AgentDetail | null>(null);
    const [stats, setStats] = useState<StatsData | null>(null);
    const [loading, setLoading] = useState(false);

    // Sozlamalar
    const [name, setName] = useState("");
    const [image, setImage] = useState("");
    const [webhookUrl, setWebhookUrl] = useState("");
    const [commands, setCommands] = useState<Cmd[]>([]);
    const [saving, setSaving] = useState(false);
    const [saved, setSaved] = useState(false);

    // Webhook test
    const [pinging, setPinging] = useState(false);
    const [pingResult, setPingResult] = useState<{ ok: boolean; elapsedMs?: number; replyPreview?: string; error?: string } | null>(null);

    // Regenerate key
    const [rotating, setRotating] = useState(false);
    const [newKey, setNewKey] = useState<string | null>(null);
    const [copied, setCopied] = useState(false);

    // Delete
    const [confirmDelete, setConfirmDelete] = useState(false);
    const [deleting, setDeleting] = useState(false);

    useEffect(() => {
        if (!open) return;
        setLoading(true);
        setPingResult(null);
        setNewKey(null);
        // Detail — /api/nexus/agents natijasidan topamiz (mine tarkibida)
        fetch(`/api/nexus/agents`)
            .then(r => r.ok ? r.json() : { items: [] })
            .then(d => {
                const found = (d.items ?? []).find((a: { id: string }) => a.id === agentId);
                if (found) {
                    const cmds: Cmd[] = Array.isArray(found.commands) ? found.commands : [];
                    setDetail({
                        id: found.id, profileId: found.profileId,
                        username: found.username, name: found.name,
                        image: found.image, humoId: found.humoId,
                        webhookUrl: found.webhookUrl,
                        commands: cmds,
                    });
                    setName(found.name ?? "");
                    setImage(found.image ?? "");
                    setWebhookUrl(found.webhookUrl ?? "");
                    setCommands(cmds);
                }
            })
            .finally(() => setLoading(false));
    }, [open, agentId]);

    useEffect(() => {
        if (!open || tab !== "stats") return;
        fetch(`/api/nexus/agents/${agentId}/stats`)
            .then(r => r.ok ? r.json() : null)
            .then(d => { if (d) setStats(d); });
    }, [open, tab, agentId]);

    async function save() {
        setSaving(true);
        setSaved(false);
        try {
            const r = await fetch(`/api/nexus/agents/${agentId}`, {
                method: "PATCH", headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    name: name.trim(),
                    image: image.trim(),
                    webhookUrl: webhookUrl.trim(),
                    commands: commands.filter(c => c.cmd && c.description),
                }),
            });
            if (r.ok) {
                setSaved(true);
                setTimeout(() => setSaved(false), 2000);
                if (detail) setDetail({ ...detail, name, image, webhookUrl, commands });
            }
        } finally { setSaving(false); }
    }

    async function ping() {
        setPinging(true);
        setPingResult(null);
        try {
            const r = await fetch(`/api/nexus/agents/${agentId}/webhook-ping`, { method: "POST" });
            const d = await r.json().catch(() => ({}));
            setPingResult(d);
        } finally { setPinging(false); }
    }

    async function rotate() {
        if (!confirm("Eski API kalit ishlamaydigan bo'ladi. Davom etamiz?")) return;
        setRotating(true);
        try {
            const r = await fetch(`/api/nexus/agents/${agentId}/regenerate-key`, { method: "POST" });
            const d = await r.json().catch(() => ({}));
            if (r.ok && d.apiKey) setNewKey(d.apiKey);
        } finally { setRotating(false); }
    }

    async function del() {
        setDeleting(true);
        try {
            const r = await fetch(`/api/nexus/agents/${agentId}`, { method: "DELETE" });
            if (r.ok) { onDeleted(); onClose(); }
        } finally { setDeleting(false); }
    }

    function addCmd() {
        if (commands.length >= 32) return;
        setCommands([...commands, { cmd: "", description: "" }]);
    }
    function removeCmd(i: number) {
        setCommands(commands.filter((_, k) => k !== i));
    }
    function updateCmd(i: number, patch: Partial<Cmd>) {
        setCommands(commands.map((c, k) => k === i ? { ...c, ...patch } : c));
    }

    function copy(v: string) {
        try {
            navigator.clipboard.writeText(v);
            setCopied(true);
            setTimeout(() => setCopied(false), 1500);
        } catch {}
    }

    if (!open) return null;

    return (
        <>
            <div className="fixed inset-0 z-[320] bg-black/70 backdrop-blur-sm" onClick={onClose} />
            <div className="fixed inset-x-0 bottom-0 z-[321] flex max-h-[90vh] flex-col overflow-hidden rounded-t-3xl md:inset-y-0 md:right-0 md:inset-x-auto md:max-h-full md:w-[480px] md:rounded-none md:rounded-l-3xl"
                style={{ background: "rgba(8,12,32,0.99)", border: "1px solid rgba(43,62,232,0.30)" }}>
                <div className="flex items-center justify-between px-5 py-4 flex-shrink-0"
                    style={{ borderBottom: "1px solid rgba(43,62,232,0.14)" }}>
                    <h3 className="text-base font-black text-white flex items-center gap-2">
                        <Bot className="w-4 h-4" style={{ color: "#00CEC8" }} />
                        Bot boshqaruvi
                    </h3>
                    <button onClick={onClose} className="w-8 h-8 rounded-full flex items-center justify-center"
                        style={{ background: "rgba(43,62,232,0.12)" }}>
                        <X className="w-4 h-4 text-white" />
                    </button>
                </div>

                {loading || !detail ? (
                    <div className="flex justify-center py-16 flex-1">
                        <Loader2 className="w-6 h-6 animate-spin" style={{ color: "#2B3EE8" }} />
                    </div>
                ) : (
                    <>
                        {/* Header info */}
                        <div className="px-5 py-4 flex items-center gap-3 flex-shrink-0"
                            style={{ borderBottom: "1px solid rgba(43,62,232,0.10)" }}>
                            <img src={detail.image ?? "/logos/forhumo.png"} alt=""
                                className="w-12 h-12 rounded-xl object-cover"
                                style={{ border: "1px solid rgba(43,62,232,0.25)" }} />
                            <div className="flex-1 min-w-0">
                                <p className="text-sm font-black text-white truncate">{detail.name}</p>
                                <p className="text-[11px]" style={{ color: "rgba(160,176,224,0.7)" }}>@{detail.username}</p>
                            </div>
                            <span className="text-[9px] font-black uppercase tracking-widest px-2 py-1 rounded-full"
                                style={{ background: "rgba(0,206,200,0.14)", color: "#00CEC8" }}>
                                BOT
                            </span>
                        </div>

                        {/* Tabs */}
                        <div className="flex gap-1 px-3 py-2 flex-shrink-0 overflow-x-auto"
                            style={{ borderBottom: "1px solid rgba(43,62,232,0.10)", scrollbarWidth: "none" }}>
                            <TabBtn active={tab === "info"} onClick={() => setTab("info")} icon={<InfoIcon className="w-3.5 h-3.5" />} label="Info" />
                            <TabBtn active={tab === "settings"} onClick={() => setTab("settings")} icon={<SettingsIcon className="w-3.5 h-3.5" />} label="Sozlash" />
                            <TabBtn active={tab === "commands"} onClick={() => setTab("commands")} icon={<Terminal className="w-3.5 h-3.5" />} label="Buyruqlar" />
                            <TabBtn active={tab === "stats"} onClick={() => setTab("stats")} icon={<BarChart2 className="w-3.5 h-3.5" />} label="Statistika" />
                        </div>

                        <div className="flex-1 overflow-y-auto p-5 space-y-4" style={{ scrollbarWidth: "none" }}>
                            {tab === "info" && (
                                <>
                                    <InfoRow label="Bot ID" value={detail.id} />
                                    <InfoRow label="Profile ID (bot)" value={detail.profileId} />
                                    <InfoRow label="Humo ID" value={detail.humoId} />
                                    <InfoRow label="Webhook" value={detail.webhookUrl ?? "Sozlanmagan"} />

                                    <div>
                                        <label className="text-[10px] font-black uppercase tracking-widest mb-1.5 block"
                                            style={{ color: "rgba(160,176,224,0.7)" }}>
                                            Webhook test
                                        </label>
                                        <button onClick={ping} disabled={pinging || !detail.webhookUrl}
                                            className="w-full h-11 rounded-xl font-black text-sm flex items-center justify-center gap-2 disabled:opacity-50"
                                            style={{ background: "linear-gradient(135deg, #F5B301, #F97316)", color: "#050818" }}>
                                            {pinging ? <Loader2 className="w-4 h-4 animate-spin" /> : <Zap className="w-4 h-4" />}
                                            {pinging ? "Yuborilyapti..." : "Ping yuborish"}
                                        </button>
                                        {pingResult && (
                                            <div className="mt-2 p-3 rounded-xl text-xs"
                                                style={pingResult.ok
                                                    ? { background: "rgba(0,206,200,0.08)", border: "1px solid rgba(0,206,200,0.30)", color: "rgba(200,240,235,0.95)" }
                                                    : { background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.30)", color: "rgba(240,200,200,0.95)" }}>
                                                <p className="font-bold">
                                                    {pingResult.ok ? "✓ Muvaffaqiyatli" : "✗ Xato"}
                                                    {pingResult.elapsedMs != null && <span className="ml-2 opacity-70">({pingResult.elapsedMs}ms)</span>}
                                                </p>
                                                {pingResult.replyPreview && (
                                                    <p className="mt-1 opacity-90 break-words">Reply: {pingResult.replyPreview}</p>
                                                )}
                                                {pingResult.error && (
                                                    <p className="mt-1 opacity-90 break-words">Xato: {pingResult.error}</p>
                                                )}
                                            </div>
                                        )}
                                    </div>

                                    <div>
                                        <label className="text-[10px] font-black uppercase tracking-widest mb-1.5 block"
                                            style={{ color: "rgba(160,176,224,0.7)" }}>
                                            API kalit
                                        </label>
                                        <button onClick={rotate} disabled={rotating}
                                            className="w-full h-11 rounded-xl font-black text-sm flex items-center justify-center gap-2 disabled:opacity-50"
                                            style={{ background: "rgba(43,62,232,0.20)", color: "white" }}>
                                            {rotating ? <Loader2 className="w-4 h-4 animate-spin" /> : <RotateCw className="w-4 h-4" />}
                                            Yangi kalit generatsiya
                                        </button>
                                        {newKey && (
                                            <>
                                                <div className="mt-2 p-3 rounded-xl flex items-start gap-2"
                                                    style={{ background: "rgba(245,179,1,0.08)", border: "1px solid rgba(245,179,1,0.30)" }}>
                                                    <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" style={{ color: "#F5B301" }} />
                                                    <p className="text-[11px] leading-snug" style={{ color: "rgba(230,220,180,0.95)" }}>
                                                        Yangi kalitni HOZIR nusxa oling — qayta ko&apos;rsatilmaydi.
                                                    </p>
                                                </div>
                                                <div className="mt-2 flex items-center gap-1 rounded-xl overflow-hidden"
                                                    style={{ background: "rgba(11,18,40,0.60)", border: "1px solid rgba(43,62,232,0.30)" }}>
                                                    <div className="flex-1 min-w-0 px-3 py-2.5">
                                                        <p className="text-[10px] text-white font-mono truncate">{newKey}</p>
                                                    </div>
                                                    <button onClick={() => copy(newKey)}
                                                        className="h-11 px-3 flex-shrink-0"
                                                        style={{ background: copied ? "rgba(0,206,200,0.20)" : "rgba(43,62,232,0.20)" }}>
                                                        {copied
                                                            ? <Check className="w-4 h-4" style={{ color: "#00CEC8" }} />
                                                            : <Copy className="w-4 h-4" style={{ color: "white" }} />}
                                                    </button>
                                                </div>
                                            </>
                                        )}
                                    </div>

                                    <div className="pt-4" style={{ borderTop: "1px solid rgba(43,62,232,0.14)" }}>
                                        {confirmDelete ? (
                                            <div className="space-y-2">
                                                <p className="text-[11px] text-center" style={{ color: "#EF4444" }}>
                                                    Bot va uning barcha DM suhbatlari yo&apos;q qilinadi
                                                </p>
                                                <div className="flex gap-2">
                                                    <button onClick={() => setConfirmDelete(false)} disabled={deleting}
                                                        className="flex-1 h-10 rounded-xl font-bold text-sm"
                                                        style={{ background: "rgba(43,62,232,0.20)", color: "white" }}>
                                                        Bekor
                                                    </button>
                                                    <button onClick={del} disabled={deleting}
                                                        className="flex-1 h-10 rounded-xl font-black text-sm flex items-center justify-center gap-1.5"
                                                        style={{ background: "#EF4444", color: "white" }}>
                                                        {deleting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                                                        HAQIQATAN o&apos;chirish
                                                    </button>
                                                </div>
                                            </div>
                                        ) : (
                                            <button onClick={() => setConfirmDelete(true)}
                                                className="w-full h-10 rounded-xl font-bold text-sm flex items-center justify-center gap-1.5"
                                                style={{ background: "rgba(239,68,68,0.10)", border: "1px solid rgba(239,68,68,0.30)", color: "#EF4444" }}>
                                                <Trash2 className="w-3.5 h-3.5" />
                                                Botni o&apos;chirish
                                            </button>
                                        )}
                                    </div>
                                </>
                            )}

                            {tab === "settings" && (
                                <>
                                    <div>
                                        <label className="text-[10px] font-black uppercase tracking-widest mb-1.5 block"
                                            style={{ color: "rgba(160,176,224,0.7)" }}>
                                            Nomi
                                        </label>
                                        <input value={name} onChange={e => setName(e.target.value.slice(0, 50))}
                                            className="w-full h-11 rounded-xl px-3 text-sm focus:outline-none"
                                            style={{ background: "rgba(11,18,40,0.60)", border: "1px solid rgba(43,62,232,0.30)", color: "white" }}
                                        />
                                    </div>
                                    <div>
                                        <label className="text-[10px] font-black uppercase tracking-widest mb-1.5 block"
                                            style={{ color: "rgba(160,176,224,0.7)" }}>
                                            Avatar URL
                                        </label>
                                        <input value={image} onChange={e => setImage(e.target.value.slice(0, 500))}
                                            placeholder="https://..."
                                            className="w-full h-11 rounded-xl px-3 text-sm focus:outline-none"
                                            style={{ background: "rgba(11,18,40,0.60)", border: "1px solid rgba(43,62,232,0.30)", color: "white" }}
                                        />
                                    </div>
                                    <div>
                                        <label className="text-[10px] font-black uppercase tracking-widest mb-1.5 block"
                                            style={{ color: "rgba(160,176,224,0.7)" }}>
                                            Webhook URL
                                        </label>
                                        <input value={webhookUrl} onChange={e => setWebhookUrl(e.target.value.slice(0, 500))}
                                            placeholder="https://api.example.com/webhook"
                                            className="w-full h-11 rounded-xl px-3 text-sm focus:outline-none"
                                            style={{ background: "rgba(11,18,40,0.60)", border: "1px solid rgba(43,62,232,0.30)", color: "white" }}
                                        />
                                        <p className="text-[10px] mt-1" style={{ color: "rgba(140,160,210,0.7)" }}>
                                            HMAC signed POST. Body: message.new event.
                                        </p>
                                    </div>
                                    <button onClick={save} disabled={saving}
                                        className="w-full h-11 rounded-xl font-black text-sm flex items-center justify-center gap-2 disabled:opacity-50"
                                        style={{ background: "linear-gradient(135deg, #2B3EE8, #00CEC8)", color: "white" }}>
                                        {saving ? <Loader2 className="w-4 h-4 animate-spin" />
                                            : saved ? <Check className="w-4 h-4" />
                                            : <Save className="w-4 h-4" />}
                                        {saved ? "Saqlandi" : "Saqlash"}
                                    </button>
                                </>
                            )}

                            {tab === "commands" && (
                                <>
                                    <div className="flex items-center justify-between">
                                        <p className="text-xs" style={{ color: "rgba(160,176,224,0.85)" }}>
                                            {commands.length}/32 buyruq
                                        </p>
                                        <button onClick={addCmd} disabled={commands.length >= 32}
                                            className="inline-flex items-center gap-1 px-3 h-8 rounded-lg text-xs font-black disabled:opacity-50"
                                            style={{ background: "rgba(0,206,200,0.14)", color: "#00CEC8" }}>
                                            <Plus className="w-3 h-3" /> Qo&apos;shish
                                        </button>
                                    </div>
                                    {commands.length === 0 ? (
                                        <div className="p-6 rounded-2xl text-center"
                                            style={{ background: "rgba(11,18,40,0.55)", border: "1px dashed rgba(43,62,232,0.20)" }}>
                                            <Terminal className="w-8 h-8 mx-auto mb-2 opacity-40" style={{ color: "#00CEC8" }} />
                                            <p className="text-sm" style={{ color: "rgba(160,176,224,0.7)" }}>
                                                Buyruq yo&apos;q. Qo&apos;shish bosing.
                                            </p>
                                        </div>
                                    ) : (
                                        <div className="space-y-2">
                                            {commands.map((c, i) => (
                                                <div key={i} className="p-3 rounded-xl space-y-2"
                                                    style={{ background: "rgba(11,18,40,0.55)", border: "1px solid rgba(43,62,232,0.14)" }}>
                                                    <div className="flex items-center gap-2">
                                                        <span className="text-sm font-bold" style={{ color: "#00CEC8" }}>/</span>
                                                        <input value={c.cmd}
                                                            onChange={e => updateCmd(i, { cmd: e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, "").slice(0, 32) })}
                                                            placeholder="start"
                                                            className="flex-1 h-9 rounded-lg px-2 text-xs bg-black/30 focus:outline-none"
                                                            style={{ border: "1px solid rgba(43,62,232,0.20)", color: "white" }}
                                                        />
                                                        <button onClick={() => removeCmd(i)}
                                                            className="w-8 h-8 rounded-lg flex items-center justify-center"
                                                            style={{ background: "rgba(239,68,68,0.10)", color: "#EF4444" }}>
                                                            <Trash2 className="w-3.5 h-3.5" />
                                                        </button>
                                                    </div>
                                                    <input value={c.description}
                                                        onChange={e => updateCmd(i, { description: e.target.value.slice(0, 256) })}
                                                        placeholder="Botni ishga tushirish"
                                                        className="w-full h-9 rounded-lg px-2 text-xs bg-black/30 focus:outline-none"
                                                        style={{ border: "1px solid rgba(43,62,232,0.20)", color: "white" }}
                                                    />
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                    <button onClick={save} disabled={saving}
                                        className="w-full h-11 rounded-xl font-black text-sm flex items-center justify-center gap-2 disabled:opacity-50"
                                        style={{ background: "linear-gradient(135deg, #2B3EE8, #00CEC8)", color: "white" }}>
                                        {saving ? <Loader2 className="w-4 h-4 animate-spin" />
                                            : saved ? <Check className="w-4 h-4" />
                                            : <Save className="w-4 h-4" />}
                                        {saved ? "Saqlandi" : "Buyruqlarni saqlash"}
                                    </button>
                                </>
                            )}

                            {tab === "stats" && (
                                stats ? (
                                    <>
                                        <div className="grid grid-cols-2 gap-2">
                                            <KpiCard label="24 soat" value={stats.received.day + stats.sent.day} />
                                            <KpiCard label="7 kun" value={stats.received.week + stats.sent.week} />
                                            <KpiCard label="30 kun" value={stats.received.month + stats.sent.month} />
                                            <KpiCard label="Jami" value={stats.received.total + stats.sent.total} />
                                        </div>
                                        <div className="grid grid-cols-2 gap-2">
                                            <StatCard label="Foydalanuvchilar" value={stats.uniqueUsers} sub={`${stats.activeUsers7d} faol (7 kun)`} />
                                            <StatCard label="Javob nisbati" value={stats.received.total > 0
                                                ? `${Math.round((stats.sent.total / stats.received.total) * 100)}%`
                                                : "—"} sub={`${stats.sent.total} javob`} />
                                        </div>
                                        {stats.topCommands && stats.topCommands.length > 0 && (
                                            <div>
                                                <p className="text-[10px] font-black uppercase tracking-widest mb-2"
                                                    style={{ color: "rgba(160,176,224,0.7)" }}>
                                                    Top buyruqlar
                                                </p>
                                                <div className="space-y-1">
                                                    {stats.topCommands.slice(0, 5).map((c, i) => (
                                                        <div key={i} className="flex items-center justify-between px-3 py-2 rounded-lg"
                                                            style={{ background: "rgba(11,18,40,0.55)", border: "1px solid rgba(43,62,232,0.14)" }}>
                                                            <span className="text-xs font-bold" style={{ color: "#00CEC8" }}>/{c.cmd}</span>
                                                            <span className="text-xs" style={{ color: "rgba(160,176,224,0.85)" }}>{c.count}</span>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        )}
                                    </>
                                ) : (
                                    <div className="flex justify-center py-8">
                                        <Loader2 className="w-5 h-5 animate-spin" style={{ color: "#2B3EE8" }} />
                                    </div>
                                )
                            )}
                        </div>
                    </>
                )}
            </div>
        </>
    );
}

function TabBtn({ active, onClick, icon, label }: { active: boolean; onClick: () => void; icon: React.ReactNode; label: string }) {
    return (
        <button onClick={onClick}
            className="inline-flex items-center gap-1.5 px-3 h-8 rounded-lg text-[11px] font-black flex-shrink-0"
            style={active
                ? { background: "rgba(0,206,200,0.20)", color: "white", border: "1px solid #00CEC8" }
                : { background: "rgba(11,18,40,0.55)", color: "rgba(160,176,224,0.85)", border: "1px solid rgba(43,62,232,0.14)" }}>
            {icon} {label}
        </button>
    );
}

function InfoRow({ label, value }: { label: string; value: string }) {
    return (
        <div className="p-3 rounded-xl"
            style={{ background: "rgba(11,18,40,0.55)", border: "1px solid rgba(43,62,232,0.14)" }}>
            <p className="text-[10px] uppercase tracking-widest" style={{ color: "rgba(140,160,210,0.7)" }}>{label}</p>
            <p className="text-xs font-mono text-white mt-0.5 break-all">{value}</p>
        </div>
    );
}

function KpiCard({ label, value }: { label: string; value: number }) {
    return (
        <div className="p-3 rounded-xl"
            style={{ background: "rgba(11,18,40,0.55)", border: "1px solid rgba(43,62,232,0.14)" }}>
            <p className="text-[10px] uppercase tracking-widest" style={{ color: "rgba(140,160,210,0.7)" }}>{label}</p>
            <p className="text-lg font-black text-white mt-0.5">{value.toLocaleString("uz-UZ")}</p>
        </div>
    );
}

function StatCard({ label, value, sub }: { label: string; value: number | string; sub: string }) {
    return (
        <div className="p-3 rounded-xl"
            style={{ background: "rgba(11,18,40,0.55)", border: "1px solid rgba(43,62,232,0.14)" }}>
            <p className="text-[10px] uppercase tracking-widest" style={{ color: "rgba(140,160,210,0.7)" }}>{label}</p>
            <p className="text-lg font-black text-white mt-0.5">{value}</p>
            <p className="text-[10px] mt-0.5" style={{ color: "rgba(140,160,210,0.7)" }}>{sub}</p>
        </div>
    );
}
