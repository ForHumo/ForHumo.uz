"use client";

// DM sozlamalari umumiy modali (Telegram/WhatsApp uslub).
// Bo'limlar: nickname/label rangi, auto-delete, mute davomiyligi, tozalash, arxiv, yashirish.
// Xavfsizlik: barcha amallar peer'ga ko'rinmaydi (nickname/label/wallpaper — private).

import { useEffect, useState } from "react";
import {
    X, Loader2, User as UserIcon, Timer, BellOff, Bell, Trash2,
    Archive, EyeOff, Save, Check, Palette, Image as ImageIcon, Phone,
    Lock, Users, ShieldCheck,
} from "lucide-react";
import { NxDmCallHistoryModal } from "./nx-dm-call-history-modal";
import { NxDmChatLockSetup } from "./nx-dm-chat-lock-setup";
import { NxDmBroadcastModal } from "./nx-dm-broadcast-modal";
import { NxDmE2eVerifyModal } from "./nx-dm-e2e-verify-modal";
import { NxDmE2eSetupModal } from "./nx-dm-e2e-setup-modal";
import { KeyRound } from "lucide-react";

type PeerLabel = { nickname: string | null; color: string | null; wallpaper: string | null };

type Tab = "profile" | "privacy" | "content";

const COLOR_PRESETS = [
    { key: "red",    label: "Qizil",    hex: "#EF4444" },
    { key: "orange", label: "Orange",   hex: "#F97316" },
    { key: "green",  label: "Yashil",   hex: "#10B981" },
    { key: "blue",   label: "Ko'k",     hex: "#3B82F6" },
    { key: "purple", label: "Binafsha", hex: "#A855F7" },
    { key: "teal",   label: "Turkuaz",  hex: "#00CEC8" },
    { key: "pink",   label: "Pushti",   hex: "#EC4899" },
    { key: "gray",   label: "Kulrang",  hex: "#94A3B8" },
];

// Wallpaper preset ranglari — CSS gradient stringlar
const WALLPAPER_PRESETS: Array<{ key: string; label: string; value: string }> = [
    { key: "default", label: "Standart", value: "" },
    { key: "midnight", label: "Yarim tun", value: "linear-gradient(135deg,#0a0e28,#1a2170)" },
    { key: "ocean",    label: "Okean",    value: "linear-gradient(135deg,#0c4a6e,#0369a1)" },
    { key: "forest",   label: "O'rmon",   value: "linear-gradient(135deg,#14532d,#166534)" },
    { key: "sunset",   label: "Botish",   value: "linear-gradient(135deg,#7c2d12,#c2410c)" },
    { key: "rose",     label: "Atirgul",  value: "linear-gradient(135deg,#831843,#be185d)" },
    { key: "space",    label: "Kosmos",   value: "linear-gradient(135deg,#1e1b4b,#5b21b6)" },
    { key: "gold",     label: "Oltin",    value: "linear-gradient(135deg,#78350f,#ca8a04)" },
];

const AUTO_DELETE_OPTIONS = [
    { seconds: 0, label: "O'chirilgan" },
    { seconds: 3600, label: "1 soat" },
    { seconds: 86400, label: "24 soat" },
    { seconds: 7 * 86400, label: "7 kun" },
    { seconds: 30 * 86400, label: "30 kun" },
];

const MUTE_OPTIONS = [
    { seconds: 0, label: "Yoqilgan" },
    { seconds: 3600, label: "1 soat" },
    { seconds: 8 * 3600, label: "8 soat" },
    { seconds: 24 * 3600, label: "24 soat" },
    { seconds: 7 * 86400, label: "7 kun" },
    { seconds: 365 * 86400, label: "Doim" },
];

export function NxDmSettingsModal({
    open, conversationId, peerId, peerName, myProfileId, autoDeleteSeconds, mutedUntil, onClose, onUpdated,
}: {
    open: boolean;
    conversationId: string;
    peerId: string;
    peerName: string;
    myProfileId: string | null;
    autoDeleteSeconds: number;
    mutedUntil: string | null;
    onClose: () => void;
    onUpdated: () => void;
}) {
    const [tab, setTab] = useState<Tab>("profile");
    const [label, setLabel] = useState<PeerLabel>({ nickname: null, color: null, wallpaper: null });
    const [nickname, setNickname] = useState("");
    const [color, setColor] = useState<string | null>(null);
    const [wallpaper, setWallpaper] = useState<string | null>(null);
    const [autoDelete, setAutoDelete] = useState(0);
    const [busy, setBusy] = useState(false);
    const [saved, setSaved] = useState(false);
    const [callsOpen, setCallsOpen] = useState(false);
    const [chatLockOpen, setChatLockOpen] = useState(false);
    const [broadcastOpen, setBroadcastOpen] = useState(false);
    const [e2eOpen, setE2eOpen] = useState(false);
    const [e2eSetupOpen, setE2eSetupOpen] = useState(false);

    useEffect(() => {
        if (!open) return;
        setAutoDelete(autoDeleteSeconds);
        fetch(`/api/nexus/peer-label/${peerId}`)
            .then(r => r.ok ? r.json() : null)
            .then(d => {
                if (d) {
                    setLabel(d);
                    setNickname(d.nickname ?? "");
                    setColor(d.color ?? null);
                    setWallpaper(d.wallpaper ?? null);
                }
            });
    }, [open, peerId, autoDeleteSeconds]);

    async function saveLabel() {
        setBusy(true);
        try {
            const r = await fetch(`/api/nexus/peer-label/${peerId}`, {
                method: "PATCH", headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    nickname: nickname.trim() || null,
                    color,
                    wallpaper,
                }),
            });
            if (r.ok) {
                const d = await r.json();
                setLabel(d);
                setSaved(true);
                setTimeout(() => setSaved(false), 1500);
                onUpdated();
            }
        } finally { setBusy(false); }
    }

    async function saveAutoDelete(sec: number) {
        setAutoDelete(sec);
        await fetch(`/api/nexus/messages/${conversationId}/auto-delete`, {
            method: "POST", headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ seconds: sec }),
        }).catch(() => {});
        onUpdated();
    }

    async function saveMute(sec: number) {
        await fetch(`/api/nexus/messages/${conversationId}/mute-conv`, {
            method: "POST", headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ seconds: sec }),
        }).catch(() => {});
        onUpdated();
    }

    async function clearForMe() {
        if (!confirm("Suhbatdagi barcha xabarlar SIZGA ko'rinmasligi kerakmi?")) return;
        await fetch(`/api/nexus/messages/${conversationId}/clear`, { method: "POST" }).catch(() => {});
        onUpdated();
        onClose();
    }

    async function archive() {
        await fetch(`/api/nexus/messages/${conversationId}/archive-conv`, { method: "POST" }).catch(() => {});
        onUpdated();
        onClose();
    }

    async function hide() {
        if (!confirm("Chat yashirin bo'limga o'tkazilsinmi?")) return;
        await fetch(`/api/nexus/messages/${conversationId}/hide`, { method: "POST" }).catch(() => {});
        onUpdated();
        onClose();
    }

    if (!open) return null;

    const muted = !!mutedUntil && new Date(mutedUntil).getTime() > Date.now();

    return (
        <>
            <div className="fixed inset-0 z-[320] bg-black/70 backdrop-blur-sm" onClick={onClose} />
            <div className="fixed inset-x-0 bottom-0 z-[321] flex max-h-[85vh] flex-col overflow-hidden rounded-t-3xl md:inset-y-0 md:right-0 md:inset-x-auto md:max-h-full md:w-[440px] md:rounded-none md:rounded-l-3xl"
                style={{ background: "rgba(8,12,32,0.99)", border: "1px solid rgba(43,62,232,0.30)" }}>
                <div className="flex items-center justify-between px-5 py-4 flex-shrink-0"
                    style={{ borderBottom: "1px solid rgba(43,62,232,0.14)" }}>
                    <h3 className="text-base font-black text-white truncate">
                        {peerName} · sozlamalar
                    </h3>
                    <button onClick={onClose} className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0"
                        style={{ background: "rgba(43,62,232,0.12)" }}>
                        <X className="w-4 h-4 text-white" />
                    </button>
                </div>

                {/* Tabs */}
                <div className="flex gap-1 px-3 py-2 flex-shrink-0"
                    style={{ borderBottom: "1px solid rgba(43,62,232,0.10)" }}>
                    <TabBtn active={tab === "profile"} onClick={() => setTab("profile")} icon={<UserIcon className="w-3.5 h-3.5" />} label="Profil" />
                    <TabBtn active={tab === "privacy"} onClick={() => setTab("privacy")} icon={<BellOff className="w-3.5 h-3.5" />} label="Xabarnoma" />
                    <TabBtn active={tab === "content"} onClick={() => setTab("content")} icon={<Trash2 className="w-3.5 h-3.5" />} label="Kontent" />
                </div>

                <div className="flex-1 overflow-y-auto p-5 space-y-4" style={{ scrollbarWidth: "none" }}>
                    {tab === "profile" && (
                        <>
                            <div>
                                <label className="text-[10px] font-black uppercase tracking-widest mb-1.5 block"
                                    style={{ color: "rgba(160,176,224,0.7)" }}>
                                    Maxfiy nom (nickname)
                                </label>
                                <input value={nickname}
                                    onChange={e => setNickname(e.target.value.slice(0, 40))}
                                    placeholder="Masalan: Mama, Ish, Do'st..."
                                    className="w-full h-11 rounded-xl px-3 text-sm focus:outline-none"
                                    style={{ background: "rgba(11,18,40,0.60)", border: "1px solid rgba(43,62,232,0.30)", color: "white" }}
                                />
                                <p className="text-[10px] mt-1" style={{ color: "rgba(140,160,210,0.7)" }}>
                                    Faqat sizga ko&apos;rinadi. Chat ro&apos;yxatida va header&apos;da real ism o&apos;rniga chiqadi.
                                </p>
                            </div>

                            <div>
                                <label className="text-[10px] font-black uppercase tracking-widest mb-1.5 block flex items-center gap-1"
                                    style={{ color: "rgba(160,176,224,0.7)" }}>
                                    <Palette className="w-3 h-3" /> Chat rangi (tag)
                                </label>
                                <div className="grid grid-cols-4 gap-2">
                                    <button onClick={() => setColor(null)}
                                        className="h-10 rounded-lg text-[10px] font-black"
                                        style={color === null
                                            ? { background: "rgba(160,176,224,0.20)", border: "2px solid white", color: "white" }
                                            : { background: "rgba(11,18,40,0.55)", border: "1px solid rgba(43,62,232,0.14)", color: "rgba(160,176,224,0.85)" }}>
                                        Bekor
                                    </button>
                                    {COLOR_PRESETS.map(c => (
                                        <button key={c.key} onClick={() => setColor(c.key)} title={c.label}
                                            className="h-10 rounded-lg relative"
                                            style={{
                                                background: c.hex,
                                                border: color === c.key ? "2px solid white" : "1px solid rgba(43,62,232,0.14)",
                                            }}>
                                            {color === c.key && <Check className="w-4 h-4 mx-auto text-white" />}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Wallpaper (DM-10) */}
                            <div>
                                <label className="text-[10px] font-black uppercase tracking-widest mb-1.5 block flex items-center gap-1"
                                    style={{ color: "rgba(160,176,224,0.7)" }}>
                                    <ImageIcon className="w-3 h-3" /> Chat foni
                                </label>
                                <div className="grid grid-cols-4 gap-2">
                                    {WALLPAPER_PRESETS.map(w => (
                                        <button key={w.key} onClick={() => setWallpaper(w.value || null)}
                                            title={w.label}
                                            className="h-14 rounded-lg relative overflow-hidden"
                                            style={{
                                                background: w.value || "rgba(11,18,40,0.60)",
                                                border: (wallpaper ?? "") === w.value
                                                    ? "2px solid white"
                                                    : "1px solid rgba(43,62,232,0.20)",
                                            }}>
                                            {(wallpaper ?? "") === w.value && (
                                                <Check className="w-4 h-4 mx-auto text-white drop-shadow-md" />
                                            )}
                                            <span className="absolute bottom-0.5 left-0 right-0 text-[9px] font-bold text-white opacity-80 truncate px-1">
                                                {w.label}
                                            </span>
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <button onClick={saveLabel} disabled={busy}
                                className="w-full h-11 rounded-xl font-black text-sm flex items-center justify-center gap-2 disabled:opacity-50"
                                style={{ background: "linear-gradient(135deg, #2B3EE8, #00CEC8)", color: "white" }}>
                                {busy ? <Loader2 className="w-4 h-4 animate-spin" />
                                    : saved ? <Check className="w-4 h-4" />
                                    : <Save className="w-4 h-4" />}
                                {saved ? "Saqlandi" : "Saqlash"}
                            </button>

                            {(label.nickname || label.color || label.wallpaper) && (
                                <button onClick={() => { setNickname(""); setColor(null); setWallpaper(null); saveLabel(); }}
                                    className="w-full h-10 rounded-xl text-xs font-bold"
                                    style={{ background: "rgba(239,68,68,0.10)", border: "1px solid rgba(239,68,68,0.30)", color: "#EF4444" }}>
                                    Barcha shaxsiy sozlamalarni tozalash
                                </button>
                            )}
                        </>
                    )}

                    {tab === "privacy" && (
                        <>
                            <div>
                                <label className="text-[10px] font-black uppercase tracking-widest mb-2 block flex items-center gap-1"
                                    style={{ color: "rgba(160,176,224,0.7)" }}>
                                    {muted ? <BellOff className="w-3 h-3" /> : <Bell className="w-3 h-3" />}
                                    Xabarnoma davomiyligi
                                </label>
                                <div className="space-y-1">
                                    {MUTE_OPTIONS.map(opt => (
                                        <button key={opt.seconds} onClick={() => saveMute(opt.seconds)}
                                            className="w-full h-10 rounded-xl text-sm font-bold text-left px-3 flex items-center justify-between"
                                            style={{ background: "rgba(11,18,40,0.55)", border: "1px solid rgba(43,62,232,0.14)", color: "rgba(220,230,250,0.92)" }}>
                                            {opt.label}
                                            {opt.seconds === 0 && !muted && <Check className="w-4 h-4" style={{ color: "#00CEC8" }} />}
                                        </button>
                                    ))}
                                </div>
                                <p className="text-[10px] mt-2" style={{ color: "rgba(140,160,210,0.7)" }}>
                                    Mute qilingan davrda push bildirishnoma kelmaydi. Badge kuchsizlantiriladi.
                                </p>
                            </div>
                        </>
                    )}

                    {tab === "content" && (
                        <>
                            <div>
                                <label className="text-[10px] font-black uppercase tracking-widest mb-2 block flex items-center gap-1"
                                    style={{ color: "rgba(160,176,224,0.7)" }}>
                                    <Timer className="w-3 h-3" /> Avto-o&apos;chirish
                                </label>
                                <div className="grid grid-cols-2 gap-2">
                                    {AUTO_DELETE_OPTIONS.map(opt => (
                                        <button key={opt.seconds} onClick={() => saveAutoDelete(opt.seconds)}
                                            className="h-11 rounded-xl text-xs font-bold px-3 flex items-center justify-center gap-1.5"
                                            style={autoDelete === opt.seconds
                                                ? { background: "rgba(0,206,200,0.20)", border: "1px solid #00CEC8", color: "white" }
                                                : { background: "rgba(11,18,40,0.55)", border: "1px solid rgba(43,62,232,0.14)", color: "rgba(160,176,224,0.85)" }}>
                                            {autoDelete === opt.seconds && <Check className="w-3 h-3" />}
                                            {opt.label}
                                        </button>
                                    ))}
                                </div>
                                <p className="text-[10px] mt-2" style={{ color: "rgba(140,160,210,0.7)" }}>
                                    Yangi xabarlar shu vaqtdan keyin ikkalasi uchun ham o&apos;chiriladi.
                                </p>
                            </div>

                            <div className="pt-4 space-y-2" style={{ borderTop: "1px solid rgba(43,62,232,0.14)" }}>
                                <button onClick={clearForMe}
                                    className="w-full h-11 rounded-xl text-sm font-bold px-3 flex items-center justify-between"
                                    style={{ background: "rgba(11,18,40,0.55)", border: "1px solid rgba(43,62,232,0.14)", color: "rgba(220,230,250,0.92)" }}>
                                    <span className="flex items-center gap-2">
                                        <Trash2 className="w-4 h-4" style={{ color: "rgba(160,176,224,0.80)" }} />
                                        Menda o&apos;chirish
                                    </span>
                                </button>
                                <button onClick={archive}
                                    className="w-full h-11 rounded-xl text-sm font-bold px-3 flex items-center justify-between"
                                    style={{ background: "rgba(11,18,40,0.55)", border: "1px solid rgba(43,62,232,0.14)", color: "rgba(220,230,250,0.92)" }}>
                                    <span className="flex items-center gap-2">
                                        <Archive className="w-4 h-4" style={{ color: "rgba(160,176,224,0.80)" }} />
                                        Arxivga o&apos;tkazish
                                    </span>
                                </button>
                                <button onClick={hide}
                                    className="w-full h-11 rounded-xl text-sm font-bold px-3 flex items-center justify-between"
                                    style={{ background: "rgba(11,18,40,0.55)", border: "1px solid rgba(43,62,232,0.14)", color: "rgba(220,230,250,0.92)" }}>
                                    <span className="flex items-center gap-2">
                                        <EyeOff className="w-4 h-4" style={{ color: "rgba(160,176,224,0.80)" }} />
                                        Yashirin chatlar
                                    </span>
                                </button>
                                <button onClick={() => setCallsOpen(true)}
                                    className="w-full h-11 rounded-xl text-sm font-bold px-3 flex items-center justify-between"
                                    style={{ background: "rgba(11,18,40,0.55)", border: "1px solid rgba(43,62,232,0.14)", color: "rgba(220,230,250,0.92)" }}>
                                    <span className="flex items-center gap-2">
                                        <Phone className="w-4 h-4" style={{ color: "#00CEC8" }} />
                                        Chaqiruvlar tarixi
                                    </span>
                                </button>
                                <button onClick={() => setE2eOpen(true)}
                                    className="w-full h-11 rounded-xl text-sm font-bold px-3 flex items-center justify-between"
                                    style={{ background: "rgba(11,18,40,0.55)", border: "1px solid rgba(43,62,232,0.14)", color: "rgba(220,230,250,0.92)" }}>
                                    <span className="flex items-center gap-2">
                                        <ShieldCheck className="w-4 h-4" style={{ color: "#00CEC8" }} />
                                        E2E kalitni tekshirish
                                    </span>
                                </button>
                            </div>

                            {/* Global sozlamalar (peer'ga bog'liq emas) */}
                            <div className="pt-4 space-y-2" style={{ borderTop: "1px solid rgba(43,62,232,0.14)" }}>
                                <p className="text-[10px] font-black uppercase tracking-widest px-1"
                                    style={{ color: "rgba(160,176,224,0.7)" }}>
                                    Umumiy DM sozlamalari
                                </p>
                                <button onClick={() => setChatLockOpen(true)}
                                    className="w-full h-11 rounded-xl text-sm font-bold px-3 flex items-center justify-between"
                                    style={{ background: "rgba(11,18,40,0.55)", border: "1px solid rgba(43,62,232,0.14)", color: "rgba(220,230,250,0.92)" }}>
                                    <span className="flex items-center gap-2">
                                        <Lock className="w-4 h-4" style={{ color: "#F5B301" }} />
                                        Yopiq chatlar (PIN)
                                    </span>
                                </button>
                                <button onClick={() => setBroadcastOpen(true)}
                                    className="w-full h-11 rounded-xl text-sm font-bold px-3 flex items-center justify-between"
                                    style={{ background: "rgba(11,18,40,0.55)", border: "1px solid rgba(43,62,232,0.14)", color: "rgba(220,230,250,0.92)" }}>
                                    <span className="flex items-center gap-2">
                                        <Users className="w-4 h-4" style={{ color: "#00CEC8" }} />
                                        Broadcast ro&apos;yxatlar
                                    </span>
                                </button>
                                <button onClick={() => setE2eSetupOpen(true)}
                                    className="w-full h-11 rounded-xl text-sm font-bold px-3 flex items-center justify-between"
                                    style={{ background: "rgba(11,18,40,0.55)", border: "1px solid rgba(43,62,232,0.14)", color: "rgba(220,230,250,0.92)" }}>
                                    <span className="flex items-center gap-2">
                                        <KeyRound className="w-4 h-4" style={{ color: "#00CEC8" }} />
                                        E2E kalitlarim
                                    </span>
                                </button>
                            </div>
                        </>
                    )}
                </div>
            </div>
            <NxDmCallHistoryModal open={callsOpen} peerId={peerId} peerName={peerName} onClose={() => setCallsOpen(false)} />
            <NxDmChatLockSetup open={chatLockOpen} onClose={() => setChatLockOpen(false)} />
            <NxDmBroadcastModal open={broadcastOpen} onClose={() => setBroadcastOpen(false)} />
            <NxDmE2eVerifyModal open={e2eOpen} peerId={peerId} peerName={peerName} onClose={() => setE2eOpen(false)} />
            {myProfileId && (
                <NxDmE2eSetupModal open={e2eSetupOpen} profileId={myProfileId} onClose={() => setE2eSetupOpen(false)} />
            )}
        </>
    );
}

function TabBtn({ active, onClick, icon, label }: { active: boolean; onClick: () => void; icon: React.ReactNode; label: string }) {
    return (
        <button onClick={onClick}
            className="flex-1 inline-flex items-center justify-center gap-1.5 h-8 rounded-lg text-[11px] font-black"
            style={active
                ? { background: "rgba(0,206,200,0.20)", color: "white", border: "1px solid #00CEC8" }
                : { background: "rgba(11,18,40,0.55)", color: "rgba(160,176,224,0.85)", border: "1px solid rgba(43,62,232,0.14)" }}>
            {icon} {label}
        </button>
    );
}
