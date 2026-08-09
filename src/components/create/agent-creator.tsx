"use client";

// @create — Agent yaratuvchi sahifa (Telegramdagi @BotFather naqshi).
// Har foydalanuvchi o'z agentlarini yaratishi mumkin (maks 5 ta).

import { useCallback, useEffect, useState } from "react";
import Image from "next/image";
import { Link } from "@/i18n/routing";
import { useSession, signIn } from "next-auth/react";
import { Bot, Plus, Loader2, Trash2, Copy, ExternalLink, Check, ArrowLeft, AlertCircle } from "lucide-react";

type Agent = {
    id: string; profileId: string;
    username: string | null; name: string | null; image: string | null; humoId: string | null;
    module: string; isSystem: boolean; webhookUrl: string | null;
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
                                    <button onClick={() => navigator.clipboard.writeText(freshKey.apiKey)}
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
                        <div key={a.id} className="p-4 rounded-2xl flex items-center gap-3"
                            style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(43,62,232,0.12)" }}>
                            <div className="w-11 h-11 rounded-xl overflow-hidden shrink-0 flex items-center justify-center"
                                style={{ background: "rgba(43,62,232,0.15)" }}>
                                {a.image ? (
                                    <Image src={a.image} alt="" width={44} height={44} className="w-full h-full object-cover" />
                                ) : (
                                    <Bot className="w-5 h-5 text-white/50" />
                                )}
                            </div>
                            <div className="flex-1 min-w-0">
                                <p className="text-sm font-bold text-white truncate">{a.name}</p>
                                <p className="text-[11px] text-white/50">@{a.username} • {a.module}</p>
                            </div>
                            <Link href={`/nexus/u/${a.username}`}
                                className="p-2 rounded-lg hover:bg-white/[0.05] text-white/60" title="Ochish">
                                <ExternalLink size={14} />
                            </Link>
                            <button onClick={() => del(a.id)}
                                className="p-2 rounded-lg hover:bg-red-500/15 text-red-400" title="O'chirish">
                                <Trash2 size={14} />
                            </button>
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
