"use client";

// Bot yaratish modali — real form (Telegram BotFather uslub).
// Username majburiy `_agent` bilan tugashi kerak. API kalit bir marta ko'rsatiladi.

import { useState } from "react";
import { X, Bot, Loader2, Copy, Check, AlertTriangle } from "lucide-react";

export function NxAgentCreateModal({
    open, onClose, onCreated,
}: {
    open: boolean;
    onClose: () => void;
    onCreated: () => void;
}) {
    const [username, setUsername] = useState("");
    const [name, setName] = useState("");
    const [image, setImage] = useState("");
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [created, setCreated] = useState<{ agent: { id: string; username: string; name: string }; apiKey: string } | null>(null);
    const [copied, setCopied] = useState(false);

    async function submit() {
        setError(null);
        const clean = username.trim().replace(/^@/, "").toLowerCase();
        if (!clean.endsWith("_agent")) {
            setError("Username `_agent` bilan tugashi shart (masalan: mybot_agent)");
            return;
        }
        if (!/^[a-z0-9_]{4,32}$/.test(clean)) {
            setError("4-32 belgi: a-z, 0-9, _");
            return;
        }
        if (name.trim().length < 2) {
            setError("Nomni kiriting");
            return;
        }
        setBusy(true);
        try {
            const r = await fetch("/api/nexus/agents", {
                method: "POST", headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ username: clean, name: name.trim(), image: image.trim() || undefined }),
            });
            const d = await r.json().catch(() => ({}));
            if (r.ok) {
                setCreated({ agent: d.agent, apiKey: d.apiKey });
            } else {
                setError(d?.error ?? "Yaratib bo'lmadi");
            }
        } finally { setBusy(false); }
    }

    function copy(v: string) {
        try {
            navigator.clipboard.writeText(v);
            setCopied(true);
            setTimeout(() => setCopied(false), 1500);
        } catch {}
    }

    function close() {
        if (created) onCreated();
        setUsername(""); setName(""); setImage(""); setError(null); setCreated(null);
        onClose();
    }

    if (!open) return null;

    return (
        <>
            <div className="fixed inset-0 z-[320] bg-black/70 backdrop-blur-sm" onClick={close} />
            <div className="fixed inset-x-4 top-1/2 -translate-y-1/2 md:inset-x-0 md:mx-auto md:max-w-md z-[321] rounded-3xl overflow-hidden max-h-[90vh] overflow-y-auto"
                style={{ background: "rgba(8,12,32,0.99)", border: "1px solid rgba(43,62,232,0.30)" }}>
                <div className="flex items-center justify-between px-5 py-4"
                    style={{ borderBottom: "1px solid rgba(43,62,232,0.14)" }}>
                    <h3 className="text-base font-black text-white flex items-center gap-2">
                        <Bot className="w-4 h-4" style={{ color: "#00CEC8" }} />
                        {created ? "Bot yaratildi" : "Yangi agent"}
                    </h3>
                    <button onClick={close} className="w-8 h-8 rounded-full flex items-center justify-center"
                        style={{ background: "rgba(43,62,232,0.12)" }}>
                        <X className="w-4 h-4 text-white" />
                    </button>
                </div>

                <div className="p-5 space-y-4">
                    {created ? (
                        <>
                            <div className="p-4 rounded-2xl text-center"
                                style={{ background: "rgba(0,206,200,0.08)", border: "1px solid rgba(0,206,200,0.30)" }}>
                                <Bot className="w-10 h-10 mx-auto mb-2" style={{ color: "#00CEC8" }} />
                                <p className="text-sm font-black text-white">@{created.agent.username}</p>
                                <p className="text-xs mt-0.5" style={{ color: "rgba(160,176,224,0.85)" }}>{created.agent.name}</p>
                            </div>

                            <div className="p-3 rounded-xl flex items-start gap-2"
                                style={{ background: "rgba(245,179,1,0.08)", border: "1px solid rgba(245,179,1,0.30)" }}>
                                <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" style={{ color: "#F5B301" }} />
                                <p className="text-[11px] leading-snug" style={{ color: "rgba(230,220,180,0.95)" }}>
                                    <b>API kalitni HOZIR nusxa oling.</b> Bir marta ko&apos;rsatiladi.
                                    Yo&apos;qotsangiz &quot;Qayta generatsiya&quot; qilishga to&apos;g&apos;ri keladi.
                                </p>
                            </div>

                            <div>
                                <label className="text-[10px] font-black uppercase tracking-widest mb-1.5 block"
                                    style={{ color: "rgba(160,176,224,0.7)" }}>
                                    API kalit (webhook HMAC)
                                </label>
                                <div className="flex items-center gap-1 rounded-xl overflow-hidden"
                                    style={{ background: "rgba(11,18,40,0.60)", border: "1px solid rgba(43,62,232,0.30)" }}>
                                    <div className="flex-1 min-w-0 px-3 py-2.5">
                                        <p className="text-[10px] text-white font-mono truncate">{created.apiKey}</p>
                                    </div>
                                    <button onClick={() => copy(created.apiKey)}
                                        className="h-11 px-3 flex-shrink-0"
                                        style={{ background: copied ? "rgba(0,206,200,0.20)" : "rgba(43,62,232,0.20)" }}>
                                        {copied
                                            ? <Check className="w-4 h-4" style={{ color: "#00CEC8" }} />
                                            : <Copy className="w-4 h-4" style={{ color: "white" }} />}
                                    </button>
                                </div>
                            </div>

                            <button onClick={close}
                                className="w-full h-11 rounded-full font-black text-sm"
                                style={{ background: "linear-gradient(135deg, #2B3EE8, #00CEC8)", color: "white" }}>
                                Tayyor
                            </button>
                        </>
                    ) : (
                        <>
                            <div>
                                <label className="text-[10px] font-black uppercase tracking-widest mb-1.5 block"
                                    style={{ color: "rgba(160,176,224,0.7)" }}>
                                    Username <span style={{ color: "#EF4444" }}>*</span>
                                </label>
                                <div className="flex items-center rounded-xl overflow-hidden"
                                    style={{ background: "rgba(11,18,40,0.60)", border: "1px solid rgba(43,62,232,0.30)" }}>
                                    <span className="pl-3 pr-1 text-sm font-bold" style={{ color: "rgba(160,176,224,0.85)" }}>@</span>
                                    <input value={username}
                                        onChange={e => setUsername(e.target.value.slice(0, 32))}
                                        placeholder="mybot_agent"
                                        className="flex-1 h-11 pr-3 text-sm focus:outline-none bg-transparent"
                                        style={{ color: "white" }}
                                    />
                                </div>
                                <p className="text-[10px] mt-1" style={{ color: "rgba(140,160,210,0.7)" }}>
                                    `_agent` bilan tugashi shart. Misol: <b>quiz_agent</b>, <b>weather_agent</b>
                                </p>
                            </div>

                            <div>
                                <label className="text-[10px] font-black uppercase tracking-widest mb-1.5 block"
                                    style={{ color: "rgba(160,176,224,0.7)" }}>
                                    Nomi <span style={{ color: "#EF4444" }}>*</span>
                                </label>
                                <input value={name}
                                    onChange={e => setName(e.target.value.slice(0, 50))}
                                    placeholder="Mening Botim"
                                    className="w-full h-11 rounded-xl px-3 text-sm focus:outline-none"
                                    style={{ background: "rgba(11,18,40,0.60)", border: "1px solid rgba(43,62,232,0.30)", color: "white" }}
                                />
                            </div>

                            <div>
                                <label className="text-[10px] font-black uppercase tracking-widest mb-1.5 block"
                                    style={{ color: "rgba(160,176,224,0.7)" }}>
                                    Avatar URL (ixtiyoriy)
                                </label>
                                <input value={image}
                                    onChange={e => setImage(e.target.value.slice(0, 500))}
                                    placeholder="https://..."
                                    className="w-full h-11 rounded-xl px-3 text-sm focus:outline-none"
                                    style={{ background: "rgba(11,18,40,0.60)", border: "1px solid rgba(43,62,232,0.30)", color: "white" }}
                                />
                            </div>

                            {error && (
                                <div className="p-2.5 rounded-lg text-[11px]"
                                    style={{ background: "rgba(239,68,68,0.10)", border: "1px solid rgba(239,68,68,0.30)", color: "#EF4444" }}>
                                    {error}
                                </div>
                            )}

                            <button onClick={submit} disabled={busy}
                                className="w-full h-11 rounded-full font-black text-sm flex items-center justify-center gap-2 disabled:opacity-50"
                                style={{ background: "linear-gradient(135deg, #2B3EE8, #00CEC8)", color: "white" }}>
                                {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Bot className="w-4 h-4" />}
                                Bot yaratish
                            </button>
                        </>
                    )}
                </div>
            </div>
        </>
    );
}
