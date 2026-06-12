"use client";

import { useState, useEffect, useCallback } from "react";
import { useNxPlayer } from "./nx-player-ctx";
import { MessageCircle, Loader2, BadgeCheck, Pencil } from "lucide-react";

// ─────────────────────────────────────────────────────────────────────────────
// NxChatList — Ijtimoiy > Chatlar tabidagi inline suhbatlar ro'yxati.
// Xabarlar (DM) paneli bilan AYNAN bir xil ma'lumot (NexusConversation).
// Suhbatga bosilsa DM paneli o'sha threadga ochiladi (openDM).
// ─────────────────────────────────────────────────────────────────────────────
interface Conv {
    conversationId: string;
    other: { name: string | null; username: string | null; image: string | null; verified: boolean } | null;
    lastMessageText: string | null;
    lastMessageAt: string | null;
    lastMine: boolean;
    unread: boolean;
}

function avatarOf(o: Conv["other"]) {
    return o?.image || `https://api.dicebear.com/9.x/avataaars/svg?seed=${encodeURIComponent(o?.username || o?.name || "u")}`;
}
function timeAgo(d: string | null) {
    if (!d) return "";
    const m = Math.floor((Date.now() - new Date(d).getTime()) / 60000);
    if (m < 1) return "hozir"; if (m < 60) return `${m} daq`;
    const h = Math.floor(m / 60); if (h < 24) return `${h} soat`;
    return new Date(d).toLocaleDateString("uz-UZ");
}

export function NxChatList() {
    const { openDM, setMessagesOpen, messagesOpen } = useNxPlayer();
    const [convs, setConvs] = useState<Conv[]>([]);
    const [loading, setLoading] = useState(true);

    const load = useCallback((silent = false) => {
        if (!silent) setLoading(true);
        fetch("/api/nexus/messages").then(r => r.json())
            .then(d => setConvs(d.conversations ?? []))
            .catch(() => { })
            .finally(() => { if (!silent) setLoading(false); });
    }, []);

    useEffect(() => { load(); }, [load]);
    // DM paneli yopilganda ro'yxatni yangilash (o'qildi/yangi xabar)
    useEffect(() => { if (!messagesOpen) load(true); }, [messagesOpen, load]);

    return (
        <div className="px-4">
            <button onClick={() => setMessagesOpen(true)}
                className="w-full flex items-center justify-center gap-2 p-3.5 rounded-2xl text-sm font-bold text-white mb-3 transition-all duration-150 active:scale-[0.99]"
                style={{ background: "linear-gradient(135deg,#2B3EE8,#00CEC8)", boxShadow: "0 4px 20px rgba(43,62,232,0.35)" }}>
                <Pencil className="w-4 h-4" /> Yangi suhbat
            </button>

            {loading ? (
                <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin" style={{ color: "#2B3EE8" }} /></div>
            ) : convs.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                    <div className="w-12 h-12 rounded-2xl flex items-center justify-center mb-3" style={{ background: "rgba(43,62,232,0.08)", border: "1px solid rgba(43,62,232,0.15)" }}>
                        <MessageCircle className="w-5 h-5" style={{ color: "rgba(43,62,232,0.45)" }} />
                    </div>
                    <p className="text-sm font-bold text-white/60 mb-1">Hali suhbat yo&apos;q</p>
                    <p className="text-xs" style={{ color: "rgba(120,140,185,0.7)" }}>Profilga kirib &quot;Xabar&quot; orqali yozing</p>
                </div>
            ) : (
                <div className="flex flex-col gap-1">
                    {convs.map(c => (
                        <button key={c.conversationId} onClick={() => c.other?.username && openDM(c.other.username)}
                            className="w-full flex items-center gap-3 p-3 rounded-2xl text-left transition-all duration-150 active:scale-[0.99]"
                            style={{ background: c.unread ? "rgba(43,62,232,0.10)" : "rgba(11,18,40,0.55)", border: "1px solid rgba(43,62,232,0.14)" }}>
                            <img src={avatarOf(c.other)} alt="" className="w-12 h-12 rounded-2xl object-cover bg-white flex-shrink-0" style={{ border: "1px solid rgba(43,62,232,0.25)" }} />
                            <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-1.5">
                                    <span className="text-sm font-bold text-white truncate">{c.other?.name || c.other?.username || "Foydalanuvchi"}</span>
                                    {c.other?.verified && <BadgeCheck className="w-3.5 h-3.5 flex-shrink-0" style={{ color: "#00CEC8" }} />}
                                    <span className="ml-auto text-[10px] flex-shrink-0" style={{ color: "rgba(100,120,170,0.7)" }}>{timeAgo(c.lastMessageAt)}</span>
                                </div>
                                <p className="text-xs truncate mt-0.5" style={{ color: c.unread ? "rgba(200,215,245,0.95)" : "rgba(120,140,185,0.8)", fontWeight: c.unread ? 600 : 400 }}>
                                    {c.lastMine && "Siz: "}{c.lastMessageText || "..."}
                                </p>
                            </div>
                            {c.unread && <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: "linear-gradient(135deg,#2B3EE8,#00CEC8)" }} />}
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
}
