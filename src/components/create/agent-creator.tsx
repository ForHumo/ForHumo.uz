"use client";

// @create — Agent yaratuvchi sahifa (Telegramdagi @BotFather naqshi).
// Har foydalanuvchi o'z agentlarini yaratishi mumkin (maks 5 ta).

import { useCallback, useEffect, useState } from "react";
import Image from "next/image";
import { Link } from "@/i18n/routing";
import { useSession, signIn } from "next-auth/react";
import { Bot, Plus, Loader2, Trash2, Copy, ExternalLink, Check, ArrowLeft, AlertCircle, Settings, Link as LinkIcon, RefreshCw, Save, EyeOff, Eye } from "lucide-react";
import { copyToClipboard } from "@/lib/copy-to-clipboard";

type BotCommand = { cmd: string; description: string };
type Agent = {
    id: string; profileId: string;
    username: string | null; name: string | null; image: string | null; humoId: string | null;
    module: string; isSystem: boolean; webhookUrl: string | null;
    commands?: BotCommand[] | null;
    createdAt: string;
};

export function AgentCreator() {
    const { status } = useSession();
    const [agents, setAgents] = useState<Agent[]>([]);
    const [max, setMax] = useState(5);
    const [loading, setLoading] = useState(false);
    const [formOpen, setFormOpen] = useState(false);
    const [name, setName] = useState("");
    const [username, setUsername] = useState("");
    const [sending, setSending] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [freshKey, setFreshKey] = useState<{ agent: Agent; apiKey: string } | null>(null);

    const load = useCallback(async () => {
        setLoading(true);
        try {
            const r = await fetch("/api/nexus/agents", { cache: "no-store" });
            if (r.ok) { const j = await r.json(); setAgents(j.items ?? []); setMax(j.max ?? 5); }
        } finally { setLoading(false); }
    }, []);

    useEffect(() => { if (status === "authenticated") load(); }, [status, load]);

    async function submit(e: React.FormEvent) {
        e.preventDefault();
        setError(null); setSending(true);
        try {
            const cleanUsername = username.trim().replace(/^@/, "").toLowerCase();
            const finalUsername = cleanUsername.endsWith("_agent") ? cleanUsername : `${cleanUsername}_agent`;
            const r = await fetch("/api/nexus/agents", {
                method: "POST", headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ username: finalUsername, name: name.trim() }),
            });
            const d = await r.json();
            if (!r.ok) { setError(d.error || "Yaratib bo'lmadi"); return; }
            setFreshKey({ agent: d.agent, apiKey: d.apiKey });
            setName(""); setUsername(""); setFormOpen(false);
            load();
        } finally { setSending(false); }
    }

    async function del(id: string) {
        if (!confirm("Agentni o'chirilsinmi? Bu qaytarib bo'lmaydi.")) return;
        const r = await fetch(`/api/nexus/agents/${id}`, { method: "DELETE" });
        if (r.ok) load();
    }

    // Sozlamalar (webhook/kalit) panelini kengaytirish holati — id → open
    const [openSettings, setOpenSettings] = useState<string | null>(null);

    if (status === "unauthenticated") {
        return (
            <div className="fixed inset-0 z-[100] flex items-center justify-center p-6"
                style={{ background: "linear-gradient(180deg, #050818 0%, #0a0f28 100%)" }}>
                <div className="max-w-sm w-full text-center">
                    <div className="w-14 h-14 mx-auto rounded-2xl flex items-center justify-center mb-4"
                        style={{ background: "linear-gradient(135deg,#2B3EE8,#00CEC8)" }}>
                        <Bot className="w-7 h-7 text-white" />
                    </div>
                    <h1 className="text-lg font-black text-white mb-1">@create</h1>
                    <p className="text-sm text-white/50 mb-5">Agent yaratish uchun tizimga kiring</p>
                    <button onClick={() => signIn("google")}
                        className="w-full py-2.5 rounded-xl text-sm font-bold text-white"
                        style={{ background: "linear-gradient(135deg,#2B3EE8,#00CEC8)" }}>
                        Kirish
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="fixed inset-0 z-[100] overflow-y-auto" style={{ background: "linear-gradient(180deg, #050818 0%, #080f28 100%)" }}>
            {/* Header */}
            <div className="sticky top-0 z-10 backdrop-blur-xl" style={{ background: "rgba(5,8,24,0.85)", borderBottom: "1px solid rgba(43,62,232,0.15)" }}>
                <div className="max-w-3xl mx-auto px-4 h-14 flex items-center gap-3">
                    <Link href="/" className="p-2 rounded-lg hover:bg-white/[0.05] text-white/60">
                        <ArrowLeft size={18} />
                    </Link>
                    <div className="w-9 h-9 rounded-xl flex items-center justify-center"
                        style={{ background: "linear-gradient(135deg,#2B3EE8,#00CEC8)" }}>
                        <Bot className="w-5 h-5 text-white" />
                    </div>
                    <div className="flex-1 min-w-0">
                        <div className="text-sm font-black text-white leading-tight">@create</div>
                        <div className="text-[11px] text-white/50 leading-tight">Nexus agentlar yaratuvchisi</div>
                    </div>
                </div>
            </div>

            <div className="max-w-3xl mx-auto px-4 py-6">
                {/* Yangi kalit ko'rsatish (bir marta) */}
                {freshKey && (
                    <div className="mb-6 p-4 rounded-2xl border" style={{ background: "rgba(0,206,200,0.08)", borderColor: "rgba(0,206,200,0.30)" }}>
                        <div className="flex items-start gap-3">
                            <Check className="w-5 h-5 shrink-0 mt-0.5" style={{ color: "#00CEC8" }} />
                            <div className="flex-1 min-w-0">
                                <p className="text-sm font-black text-white">Agent yaratildi: @{freshKey.agent.username}</p>
                                <p className="text-xs text-white/60 mt-1">
                                    Kelajakda webhook uchun API kalit. <b>Bir marta ko'rsatiladi</b>, nusxa oling:
                                </p>
                                <div className="mt-2 flex items-center gap-2 rounded-xl p-2" style={{ background: "rgba(0,0,0,0.35)" }}>
                                    <code className="flex-1 text-xs text-white font-mono break-all">{freshKey.apiKey}</code>
                                    <button onClick={() => void copyToClipboard(freshKey.apiKey)}
                                        className="p-1.5 rounded-lg hover:bg-white/[0.06]"><Copy size={14} className="text-white/70" /></button>
                                </div>
                                <button onClick={() => setFreshKey(null)}
                                    className="mt-2 text-[11px] font-medium hover:underline" style={{ color: "#00CEC8" }}>
                                    Yopish
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {/* Yangi agent tugmasi/formasi */}
                {!formOpen ? (
                    <button
                        onClick={() => setFormOpen(true)}
                        disabled={agents.length >= max}
                        className="w-full mb-6 py-3 rounded-2xl text-sm font-bold text-white flex items-center justify-center gap-2 disabled:opacity-40"
                        style={{ background: "linear-gradient(135deg,#2B3EE8,#00CEC8)" }}>
                        <Plus size={16} /> Yangi agent yaratish
                        <span className="text-[10px] opacity-75">({agents.length}/{max})</span>
                    </button>
                ) : (
                    <form onSubmit={submit} className="mb-6 p-4 rounded-2xl space-y-3"
                        style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(43,62,232,0.20)" }}>
                        <div>
                            <label className="text-[10px] font-bold uppercase tracking-wider text-white/50">Agent nomi</label>
                            <input value={name} onChange={e => setName(e.target.value)}
                                placeholder="Masalan: Mening Do'konim" maxLength={50} autoFocus
                                className="w-full mt-1.5 px-3 py-2.5 rounded-xl bg-transparent text-white text-sm focus:outline-none"
                                style={{ border: "1px solid rgba(43,62,232,0.30)" }} />
                        </div>
                        <div>
                            <label className="text-[10px] font-bold uppercase tracking-wider text-white/50">Username</label>
                            <div className="flex items-center gap-2 mt-1.5 px-3 rounded-xl"
                                style={{ background: "transparent", border: "1px solid rgba(43,62,232,0.30)" }}>
                                <span className="text-white/40 text-sm">@</span>
                                <input value={username}
                                    onChange={e => setUsername(e.target.value.replace(/[^a-z0-9_]/gi, "").toLowerCase())}
                                    placeholder="mydokon"
                                    maxLength={26}
                                    className="flex-1 py-2.5 bg-transparent text-white text-sm focus:outline-none" />
                                <span className="text-[#00CEC8] text-sm font-bold">_agent</span>
                            </div>
                            <p className="text-[10px] text-white/40 mt-1.5">
                                <AlertCircle size={10} className="inline -mt-0.5 mr-1" />
                                Nom oxiriga <code className="text-[#00CEC8]">_agent</code> avtomatik qo'shiladi
                            </p>
                        </div>
                        {error && <p className="text-xs" style={{ color: "#EF4444" }}>{error}</p>}
                        <div className="flex gap-2">
                            <button type="button" onClick={() => { setFormOpen(false); setError(null); }}
                                disabled={sending}
                                className="flex-1 py-2.5 rounded-xl text-xs font-bold text-white/70"
                                style={{ background: "rgba(255,255,255,0.05)" }}>Bekor</button>
                            <button type="submit" disabled={sending || !name.trim() || !username.trim()}
                                className="flex-1 py-2.5 rounded-xl text-xs font-black text-white disabled:opacity-40 flex items-center justify-center gap-2"
                                style={{ background: "linear-gradient(135deg,#2B3EE8,#00CEC8)" }}>
                                {sending && <Loader2 size={14} className="animate-spin" />}
                                Yaratish
                            </button>
                        </div>
                    </form>
                )}

                {/* Ro'yxat */}
                <div className="space-y-2">
                    {loading && agents.length === 0 ? (
                        <div className="flex justify-center py-10"><Loader2 className="animate-spin text-white/30" /></div>
                    ) : agents.length === 0 ? (
                        <div className="text-center py-10 text-sm text-white/40">
                            <Bot size={36} className="mx-auto mb-3 opacity-30" />
                            Hali agentlaringiz yo'q
                        </div>
                    ) : agents.map(a => (
                        <div key={a.id} className="rounded-2xl"
                            style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(43,62,232,0.12)" }}>
                            <div className="p-4 flex items-center gap-3">
                                <div className="w-11 h-11 rounded-xl overflow-hidden shrink-0 flex items-center justify-center"
                                    style={{ background: "rgba(43,62,232,0.15)" }}>
                                    {a.image ? (
                                        <Image src={a.image} alt="" width={44} height={44} className="w-full h-full object-cover" />
                                    ) : (
                                        <Bot className="w-5 h-5 text-white/50" />
                                    )}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="text-sm font-bold text-white truncate flex items-center gap-1.5">
                                        {a.name}
                                        {a.webhookUrl && <span className="w-1.5 h-1.5 rounded-full" style={{ background: "#22C55E" }} title="Webhook faol" />}
                                    </p>
                                    <p className="text-[11px] text-white/50">@{a.username} • {a.module}</p>
                                </div>
                                {!a.isSystem && (
                                    <button onClick={() => setOpenSettings(openSettings === a.id ? null : a.id)}
                                        className="p-2 rounded-lg hover:bg-white/[0.05] text-white/60" title="Sozlamalar">
                                        <Settings size={14} />
                                    </button>
                                )}
                                <Link href={`/nexus/u/${a.username}`}
                                    className="p-2 rounded-lg hover:bg-white/[0.05] text-white/60" title="Ochish">
                                    <ExternalLink size={14} />
                                </Link>
                                {!a.isSystem && (
                                    <button onClick={() => del(a.id)}
                                        className="p-2 rounded-lg hover:bg-red-500/15 text-red-400" title="O'chirish">
                                        <Trash2 size={14} />
                                    </button>
                                )}
                            </div>
                            {openSettings === a.id && !a.isSystem && (
                                <AgentSettingsPanel agent={a} onSaved={load} />
                            )}
                        </div>
                    ))}
                </div>

                <p className="text-[11px] text-white/30 text-center mt-8">
                    Agentlar Telegramdagi botlarga o'xshaydi — foydalanuvchilar bilan DM orqali
                    strukturaviy xabar almashadi. Har agent maks {max} tagacha (foydalanuvchida).
                </p>
            </div>
        </div>
    );
}

// Har agent uchun sozlamalar paneli: webhook URL saqlash, API kalitni qayta yaratish.
function AgentSettingsPanel({ agent, onSaved }: { agent: Agent; onSaved: () => void }) {
    const [url, setUrl] = useState(agent.webhookUrl ?? "");
    const [saving, setSaving] = useState(false);
    const [saved, setSaved] = useState(false);
    const [rotating, setRotating] = useState(false);
    const [rotatedKey, setRotatedKey] = useState<string | null>(null);
    const [showKey, setShowKey] = useState(false);
    const [err, setErr] = useState<string | null>(null);

    async function saveWebhook() {
        setSaving(true); setErr(null); setSaved(false);
        try {
            const clean = url.trim();
            const r = await fetch(`/api/nexus/agents/${agent.id}`, {
                method: "PATCH", headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ webhookUrl: clean }),
            });
            if (r.ok) { setSaved(true); onSaved(); setTimeout(() => setSaved(false), 2000); }
            else {
                const d = await r.json().catch(() => ({}));
                setErr(d?.error ?? "Saqlab bo'lmadi");
            }
        } finally { setSaving(false); }
    }

    async function rotate() {
        if (!confirm("Yangi API kalit yaratilsinmi? Eski kalit darhol ishlamay qoladi.")) return;
        setRotating(true); setErr(null);
        try {
            const r = await fetch(`/api/nexus/agents/${agent.id}/regenerate-key`, { method: "POST" });
            const d = await r.json().catch(() => ({}));
            if (r.ok && d?.apiKey) {
                setRotatedKey(d.apiKey);
                setShowKey(true);
            } else {
                setErr(d?.error ?? "Kalit yaratib bo'lmadi");
            }
        } finally { setRotating(false); }
    }

    // Commands editor
    const [commands, setCommands] = useState<BotCommand[]>(agent.commands ?? []);
    const [savingCmds, setSavingCmds] = useState(false);
    const [savedCmds, setSavedCmds] = useState(false);
    function addCmd() {
        if (commands.length >= 32) return;
        setCommands(cs => [...cs, { cmd: "", description: "" }]);
    }
    function updCmd(i: number, key: "cmd" | "description", value: string) {
        setCommands(cs => cs.map((c, idx) => idx === i ? { ...c, [key]: value } : c));
    }
    function delCmd(i: number) {
        setCommands(cs => cs.filter((_, idx) => idx !== i));
    }
    async function saveCommands() {
        setSavingCmds(true); setErr(null); setSavedCmds(false);
        try {
            // Bo'sh yoki noto'g'ri qatorlarni tozalash
            const cleaned = commands
                .map(c => ({
                    cmd: c.cmd.trim().toLowerCase().replace(/^\//, "").slice(0, 32),
                    description: c.description.trim().slice(0, 256),
                }))
                .filter(c => /^[a-z0-9_]{1,32}$/.test(c.cmd) && c.description.length > 0);
            const r = await fetch(`/api/nexus/agents/${agent.id}`, {
                method: "PATCH", headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ commands: cleaned }),
            });
            if (r.ok) {
                setCommands(cleaned);
                setSavedCmds(true);
                onSaved();
                setTimeout(() => setSavedCmds(false), 2000);
            } else {
                const d = await r.json().catch(() => ({}));
                setErr(d?.error ?? "Saqlab bo'lmadi");
            }
        } finally { setSavingCmds(false); }
    }

    return (
        <div className="px-4 pb-4 space-y-3 border-t" style={{ borderColor: "rgba(43,62,232,0.15)" }}>
            <div className="pt-3">
                <label className="text-[10px] font-bold uppercase tracking-wider text-white/50 flex items-center gap-1">
                    <LinkIcon size={10} /> Webhook URL
                </label>
                <div className="mt-1.5 flex gap-2">
                    <input value={url} onChange={e => setUrl(e.target.value)}
                        placeholder="https://sizning-serveringiz.uz/webhook"
                        className="flex-1 px-3 py-2 rounded-xl bg-transparent text-white text-xs font-mono focus:outline-none"
                        style={{ border: "1px solid rgba(43,62,232,0.30)" }} />
                    <button onClick={saveWebhook} disabled={saving}
                        className="px-3 py-2 rounded-xl text-xs font-bold text-white flex items-center gap-1 disabled:opacity-40"
                        style={{ background: saved ? "rgba(34,197,94,0.20)" : "rgba(0,206,200,0.14)", border: `1px solid ${saved ? "rgba(34,197,94,0.35)" : "rgba(0,206,200,0.30)"}`, color: saved ? "#22C55E" : "#00CEC8" }}>
                        {saving ? <Loader2 size={12} className="animate-spin" /> : saved ? <Check size={12} /> : <Save size={12} />}
                        {saved ? "Saqlandi" : "Saqlash"}
                    </button>
                </div>
                <p className="text-[10px] text-white/40 mt-1.5">
                    Foydalanuvchi agentga DM yozganda shu URL'ga POST yuboriladi.
                    Javob JSON: <code className="text-[#00CEC8]">{"{ text: string }"}</code>
                </p>
            </div>

            <div>
                <label className="text-[10px] font-bold uppercase tracking-wider text-white/50">API kalit</label>
                {rotatedKey ? (
                    <div className="mt-1.5 rounded-xl p-2" style={{ background: "rgba(0,0,0,0.35)", border: "1px solid rgba(0,206,200,0.30)" }}>
                        <div className="flex items-center gap-2">
                            <code className={`flex-1 text-xs text-white font-mono break-all ${showKey ? "" : "select-none blur-sm"}`}>{rotatedKey}</code>
                            <button onClick={() => setShowKey(v => !v)} className="p-1.5 rounded-lg hover:bg-white/[0.06]"
                                title={showKey ? "Yashirish" : "Ko'rsatish"}>
                                {showKey ? <EyeOff size={12} className="text-white/70" /> : <Eye size={12} className="text-white/70" />}
                            </button>
                            <button onClick={() => void copyToClipboard(rotatedKey)}
                                className="p-1.5 rounded-lg hover:bg-white/[0.06]"><Copy size={12} className="text-white/70" /></button>
                        </div>
                        <p className="text-[10px] text-white/50 mt-1.5">
                            <AlertCircle size={9} className="inline -mt-0.5 mr-1" />
                            Bu kalit bir marta ko&apos;rsatiladi. Saqlab qo&apos;ying.
                        </p>
                    </div>
                ) : (
                    <button onClick={rotate} disabled={rotating}
                        className="mt-1.5 w-full px-3 py-2 rounded-xl text-xs font-bold flex items-center justify-center gap-2 disabled:opacity-40"
                        style={{ background: "rgba(245,158,11,0.10)", border: "1px solid rgba(245,158,11,0.30)", color: "#F59E0B" }}>
                        {rotating ? <Loader2 size={12} className="animate-spin" /> : <RefreshCw size={12} />}
                        Kalit yangilash (eski ishlamay qoladi)
                    </button>
                )}
            </div>

            {/* Bot commands (Telegram uslub) */}
            <div>
                <div className="flex items-center justify-between">
                    <label className="text-[10px] font-bold uppercase tracking-wider text-white/50">
                        Bot commands ({commands.length}/32)
                    </label>
                    <div className="flex items-center gap-1.5">
                        <button type="button" onClick={addCmd} disabled={commands.length >= 32}
                            className="px-2 py-1 rounded-lg text-[10px] font-bold flex items-center gap-1 disabled:opacity-40"
                            style={{ background: "rgba(43,62,232,0.10)", color: "rgba(220,230,255,0.85)", border: "1px solid rgba(43,62,232,0.25)" }}>
                            <Plus size={10} /> Qo&apos;shish
                        </button>
                        <button type="button" onClick={saveCommands} disabled={savingCmds}
                            className="px-2 py-1 rounded-lg text-[10px] font-bold flex items-center gap-1 disabled:opacity-40"
                            style={{
                                background: savedCmds ? "rgba(34,197,94,0.20)" : "rgba(0,206,200,0.14)",
                                border: `1px solid ${savedCmds ? "rgba(34,197,94,0.35)" : "rgba(0,206,200,0.30)"}`,
                                color: savedCmds ? "#22C55E" : "#00CEC8",
                            }}>
                            {savingCmds ? <Loader2 size={10} className="animate-spin" /> : savedCmds ? <Check size={10} /> : <Save size={10} />}
                            {savedCmds ? "Saqlandi" : "Saqlash"}
                        </button>
                    </div>
                </div>
                {commands.length === 0 ? (
                    <p className="text-[10px] text-white/40 mt-2">
                        DM composer&apos;da &quot;/&quot; bosilganda foydalanuvchi ko&apos;radi
                    </p>
                ) : (
                    <div className="mt-2 space-y-1.5">
                        {commands.map((c, i) => (
                            <div key={i} className="flex items-center gap-1.5">
                                <span className="text-[11px] text-white/50">/</span>
                                <input value={c.cmd} onChange={e => updCmd(i, "cmd", e.target.value.replace(/[^a-z0-9_]/gi, "").toLowerCase())}
                                    placeholder="start" maxLength={32}
                                    className="w-24 px-2 py-1.5 rounded-lg bg-transparent text-white text-xs font-mono focus:outline-none"
                                    style={{ border: "1px solid rgba(43,62,232,0.30)" }} />
                                <input value={c.description} onChange={e => updCmd(i, "description", e.target.value)}
                                    placeholder="Botni ishga tushirish" maxLength={256}
                                    className="flex-1 px-2 py-1.5 rounded-lg bg-transparent text-white text-xs focus:outline-none"
                                    style={{ border: "1px solid rgba(43,62,232,0.30)" }} />
                                <button type="button" onClick={() => delCmd(i)}
                                    className="p-1.5 rounded-md hover:bg-red-500/15 text-red-400">
                                    <Trash2 size={12} />
                                </button>
                            </div>
                        ))}
                    </div>
                )}
                <p className="text-[10px] text-white/40 mt-1.5">
                    <AlertCircle size={9} className="inline -mt-0.5 mr-1" />
                    Foydalanuvchi tanlaganda &quot;/cmd&quot; xabar sifatida yuboriladi
                </p>
            </div>

            {err && <p className="text-xs" style={{ color: "#EF4444" }}>{err}</p>}

            <details className="text-[10px] text-white/50">
                <summary className="cursor-pointer text-white/70 font-bold">Webhook payload / imzo tekshiruvi</summary>
                <pre className="mt-2 p-2 rounded-lg overflow-x-auto text-[10px] leading-relaxed"
                    style={{ background: "rgba(0,0,0,0.35)", color: "rgba(220,230,255,0.75)" }}>
{`POST <webhookUrl>
Headers:
  X-Forhumo-Event: message.created
  X-Forhumo-Timestamp: <unix seconds>
  X-Forhumo-Signature: sha256=<hex>

Body (JSON):
  {
    event: "message.created",
    chatId, messageId,
    from: { profileId, username, name },
    text, mediaUrl, mediaType, timestamp
  }

Imzo tekshiruv (Node.js):
  const expected = "sha256=" + crypto
    .createHmac("sha256", API_KEY)
    .update(\`\${timestamp}.\${rawBody}\`)
    .digest("hex");

Javob (JSON, 200):
  { text?: string, mediaUrl?, mediaType?, mediaMime?, mediaName? }`}
                </pre>
            </details>
        </div>
    );
}
