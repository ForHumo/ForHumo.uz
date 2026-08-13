"use client";

// Yangi kanal yoki guruh yaratish modali.
// Foydalanuvchidan: tip (kanal/guruh), nom, @handle (ixtiyoriy), tavsif, xususiy/ochiq.
// POST /api/nexus/channels

import { useState } from "react";
import { X, Megaphone, Users, Loader2, Lock, Globe } from "lucide-react";

interface Props {
    initialType?: "CHANNEL" | "GROUP";
    onClose: () => void;
    onCreated: (id: string) => void;
}

export function NxChannelCreateModal({ initialType, onClose, onCreated }: Props) {
    const [type, setType] = useState<"CHANNEL" | "GROUP">(initialType ?? "CHANNEL");
    const [name, setName] = useState("");
    const [handle, setHandle] = useState("");
    const [description, setDescription] = useState("");
    const [isPrivate, setIsPrivate] = useState(false);
    const [busy, setBusy] = useState(false);
    const [err, setErr] = useState<string | null>(null);

    async function submit() {
        if (!name.trim()) { setErr("Nom kerak"); return; }
        setBusy(true);
        setErr(null);
        try {
            const r = await fetch("/api/nexus/channels", {
                method: "POST", headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    type, name: name.trim(),
                    handle: handle.trim() || undefined,
                    description: description.trim() || undefined,
                    isPrivate,
                }),
            });
            const d = await r.json().catch(() => ({}));
            if (r.ok && d?.channel?.id) {
                onCreated(d.channel.id);
                onClose();
            } else {
                setErr(d?.error ?? "Yaratib bo'lmadi");
            }
        } finally {
            setBusy(false);
        }
    }

    return (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4"
            style={{ background: "rgba(3,7,25,0.75)", backdropFilter: "blur(6px)" }}
            onClick={() => !busy && onClose()}>
            <div onClick={e => e.stopPropagation()}
                className="w-full max-w-md rounded-2xl overflow-hidden flex flex-col"
                style={{ background: "#0B1228", border: "1px solid rgba(43,62,232,0.30)", maxHeight: "85vh" }}>
                {/* Header */}
                <div className="p-4 flex items-center justify-between border-b" style={{ borderColor: "rgba(43,62,232,0.20)" }}>
                    <p className="text-sm font-black" style={{ color: "rgba(220,230,255,0.95)" }}>
                        Yangi {type === "CHANNEL" ? "kanal" : "guruh"}
                    </p>
                    <button onClick={onClose} disabled={busy}
                        className="w-7 h-7 rounded-md flex items-center justify-center hover:bg-white/[0.06]">
                        <X className="w-4 h-4" style={{ color: "rgba(160,176,224,0.85)" }} />
                    </button>
                </div>

                {/* Tip tanlash */}
                <div className="p-4 grid grid-cols-2 gap-2">
                    <button onClick={() => setType("CHANNEL")}
                        className="flex flex-col items-center gap-1.5 py-3 rounded-xl transition"
                        style={{
                            background: type === "CHANNEL" ? "rgba(0,206,200,0.15)" : "rgba(43,62,232,0.08)",
                            border: `1px solid ${type === "CHANNEL" ? "rgba(0,206,200,0.50)" : "rgba(43,62,232,0.20)"}`,
                        }}>
                        <Megaphone className="w-5 h-5" style={{ color: type === "CHANNEL" ? "#00CEC8" : "rgba(160,176,224,0.85)" }} />
                        <span className="text-xs font-black" style={{ color: type === "CHANNEL" ? "#00CEC8" : "rgba(220,230,255,0.85)" }}>Kanal</span>
                        <span className="text-[10px] opacity-70" style={{ color: "rgba(220,230,255,0.75)" }}>Faqat ega yozadi</span>
                    </button>
                    <button onClick={() => setType("GROUP")}
                        className="flex flex-col items-center gap-1.5 py-3 rounded-xl transition"
                        style={{
                            background: type === "GROUP" ? "rgba(0,206,200,0.15)" : "rgba(43,62,232,0.08)",
                            border: `1px solid ${type === "GROUP" ? "rgba(0,206,200,0.50)" : "rgba(43,62,232,0.20)"}`,
                        }}>
                        <Users className="w-5 h-5" style={{ color: type === "GROUP" ? "#00CEC8" : "rgba(160,176,224,0.85)" }} />
                        <span className="text-xs font-black" style={{ color: type === "GROUP" ? "#00CEC8" : "rgba(220,230,255,0.85)" }}>Guruh</span>
                        <span className="text-[10px] opacity-70" style={{ color: "rgba(220,230,255,0.75)" }}>Barcha a&apos;zolar yozadi</span>
                    </button>
                </div>

                {/* Forma */}
                <div className="px-4 pb-3 space-y-2.5 overflow-y-auto">
                    <div>
                        <label className="text-[10px] font-bold uppercase tracking-wider" style={{ color: "rgba(140,160,210,0.65)" }}>Nom</label>
                        <input value={name} onChange={e => setName(e.target.value)}
                            maxLength={80} placeholder={type === "CHANNEL" ? "Mening kanalim" : "Do'stlar guruhi"}
                            className="w-full h-10 px-3 mt-1 rounded-lg bg-transparent text-white text-sm focus:outline-none"
                            style={{ border: "1px solid rgba(43,62,232,0.30)" }} />
                    </div>
                    <div>
                        <label className="text-[10px] font-bold uppercase tracking-wider" style={{ color: "rgba(140,160,210,0.65)" }}>Handle (ixtiyoriy)</label>
                        <div className="flex items-center mt-1 rounded-lg" style={{ border: "1px solid rgba(43,62,232,0.30)" }}>
                            <span className="pl-3 pr-1 text-white/60 text-sm">@</span>
                            <input value={handle} onChange={e => setHandle(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, "").slice(0, 30))}
                                placeholder="mening_kanalim"
                                className="flex-1 h-10 pr-3 bg-transparent text-white text-sm focus:outline-none" />
                        </div>
                    </div>
                    <div>
                        <label className="text-[10px] font-bold uppercase tracking-wider" style={{ color: "rgba(140,160,210,0.65)" }}>Tavsif</label>
                        <textarea value={description} onChange={e => setDescription(e.target.value.slice(0, 500))}
                            rows={2} placeholder="Bu erda nima haqida gaplashiladi..."
                            className="w-full px-3 py-2 mt-1 rounded-lg bg-transparent text-white text-xs focus:outline-none resize-none"
                            style={{ border: "1px solid rgba(43,62,232,0.30)" }} />
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                        <button onClick={() => setIsPrivate(false)}
                            className="flex items-center gap-2 px-3 py-2 rounded-lg transition"
                            style={{
                                background: !isPrivate ? "rgba(0,206,200,0.12)" : "rgba(43,62,232,0.06)",
                                border: `1px solid ${!isPrivate ? "rgba(0,206,200,0.40)" : "rgba(43,62,232,0.20)"}`,
                            }}>
                            <Globe className="w-3.5 h-3.5" style={{ color: !isPrivate ? "#00CEC8" : "rgba(160,176,224,0.75)" }} />
                            <div className="text-left">
                                <p className="text-xs font-bold" style={{ color: "rgba(220,230,255,0.95)" }}>Ochiq</p>
                                <p className="text-[9px] opacity-70" style={{ color: "rgba(220,230,255,0.75)" }}>Har kim topa oladi</p>
                            </div>
                        </button>
                        <button onClick={() => setIsPrivate(true)}
                            className="flex items-center gap-2 px-3 py-2 rounded-lg transition"
                            style={{
                                background: isPrivate ? "rgba(0,206,200,0.12)" : "rgba(43,62,232,0.06)",
                                border: `1px solid ${isPrivate ? "rgba(0,206,200,0.40)" : "rgba(43,62,232,0.20)"}`,
                            }}>
                            <Lock className="w-3.5 h-3.5" style={{ color: isPrivate ? "#00CEC8" : "rgba(160,176,224,0.75)" }} />
                            <div className="text-left">
                                <p className="text-xs font-bold" style={{ color: "rgba(220,230,255,0.95)" }}>Xususiy</p>
                                <p className="text-[9px] opacity-70" style={{ color: "rgba(220,230,255,0.75)" }}>Faqat taklif bilan</p>
                            </div>
                        </button>
                    </div>
                    {err && (
                        <p className="text-[11px] font-bold" style={{ color: "#EF4444" }}>{err}</p>
                    )}
                </div>

                {/* Footer */}
                <div className="p-4 border-t flex gap-2" style={{ borderColor: "rgba(43,62,232,0.20)" }}>
                    <button onClick={onClose} disabled={busy}
                        className="flex-1 h-10 rounded-lg text-sm font-black"
                        style={{ background: "rgba(11,18,40,0.85)", color: "#fff", border: "1px solid rgba(43,62,232,0.30)" }}>
                        Bekor
                    </button>
                    <button onClick={submit} disabled={busy || !name.trim()}
                        className="flex-1 h-10 rounded-lg text-sm font-black text-white disabled:opacity-40 flex items-center justify-center gap-2"
                        style={{ background: "linear-gradient(135deg,#2B3EE8,#00CEC8)" }}>
                        {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                        Yaratish
                    </button>
                </div>
            </div>
        </div>
    );
}
