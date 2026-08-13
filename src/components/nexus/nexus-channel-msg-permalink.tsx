"use client";

// Kanal xabari uchun ommaviy deep-link sahifasi.
// URL: /nexus/ch/{handle}/msg/{id}

import { useEffect, useState } from "react";
import { Link } from "@/i18n/routing";
import { Loader2, Megaphone, Users, BadgeCheck, ExternalLink, Copy, ArrowLeft } from "lucide-react";
import { NxMarkdown } from "./nx-markdown";

interface Data {
    channel: {
        id: string; name: string; handle: string;
        type: "CHANNEL" | "GROUP";
        description: string | null; avatarUrl: string | null; memberCount: number;
    };
    message: {
        id: string; text: string | null; createdAt: string; media: string[];
        pollQuestion?: string | null; pollOptions?: string[];
        editedAt?: string | null; pinnedAt?: string | null;
        sender: { name: string | null; username: string | null; image: string | null; verified: boolean } | null;
    };
}

export function NexusChannelMessagePermalink({ handle, messageId }: { handle: string; messageId: string }) {
    const [data, setData] = useState<Data | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        setLoading(true);
        fetch(`/api/nexus/channels/by-handle/${encodeURIComponent(handle)}/messages/${encodeURIComponent(messageId)}`, { cache: "no-store" })
            .then(async r => {
                if (r.ok) setData(await r.json());
                else {
                    const d = await r.json().catch(() => ({}));
                    setError(d?.error ?? "Yuklanmadi");
                }
            })
            .catch(() => setError("Yuklanmadi"))
            .finally(() => setLoading(false));
    }, [handle, messageId]);

    function copyLink() {
        try { navigator.clipboard.writeText(window.location.href); } catch {}
    }

    return (
        <div className="fixed inset-0 z-[100] overflow-y-auto"
            style={{ background: "#050818" }}>
            <div className="max-w-2xl mx-auto px-4 py-8">
                <Link href="/nexus" className="inline-flex items-center gap-2 mb-6 text-sm font-bold"
                    style={{ color: "rgba(160,176,224,0.85)" }}>
                    <ArrowLeft className="w-4 h-4" /> Nexus
                </Link>

                {loading && (
                    <div className="flex justify-center py-20">
                        <Loader2 className="w-8 h-8 animate-spin" style={{ color: "#00CEC8" }} />
                    </div>
                )}
                {error && (
                    <div className="p-6 rounded-2xl text-center"
                        style={{ background: "rgba(239,68,68,0.10)", border: "1px solid rgba(239,68,68,0.30)" }}>
                        <p className="text-sm font-bold" style={{ color: "#EF4444" }}>{error}</p>
                        <Link href="/nexus" className="mt-3 inline-block text-xs underline" style={{ color: "rgba(160,176,224,0.85)" }}>
                            Nexus'ga qaytish
                        </Link>
                    </div>
                )}

                {data && (
                    <div className="rounded-2xl overflow-hidden"
                        style={{ background: "rgba(11,18,40,0.60)", border: "1px solid rgba(43,62,232,0.20)" }}>
                        {/* Kanal header */}
                        <div className="p-5 border-b flex items-center gap-3" style={{ borderColor: "rgba(43,62,232,0.14)" }}>
                            <img src={data.channel.avatarUrl || `https://api.dicebear.com/9.x/shapes/svg?seed=${encodeURIComponent(data.channel.name)}`}
                                alt="" className="w-14 h-14 rounded-2xl object-cover bg-white flex-shrink-0" />
                            <div className="flex-1 min-w-0">
                                <p className="text-base font-black text-white truncate">{data.channel.name}</p>
                                <div className="mt-0.5 inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider"
                                    style={{ color: "#00CEC8" }}>
                                    {data.channel.type === "GROUP" ? <Users className="w-3 h-3" /> : <Megaphone className="w-3 h-3" />}
                                    {data.channel.type === "GROUP" ? "Guruh" : "Kanal"} · @{data.channel.handle} · {data.channel.memberCount} a&apos;zo
                                </div>
                            </div>
                        </div>

                        {/* Xabar */}
                        <div className="p-5">
                            <div className="flex items-center gap-2 mb-3">
                                {data.message.sender?.image && (
                                    <img src={data.message.sender.image} alt="" className="w-8 h-8 rounded-full object-cover" />
                                )}
                                <div>
                                    <p className="text-xs font-black flex items-center gap-1" style={{ color: "rgba(220,230,255,0.95)" }}>
                                        {data.message.sender?.name ?? data.message.sender?.username ?? "Foydalanuvchi"}
                                        {data.message.sender?.verified && <BadgeCheck className="w-3 h-3" style={{ color: "#00CEC8" }} />}
                                    </p>
                                    <p className="text-[10px]" style={{ color: "rgba(140,160,210,0.65)" }}>
                                        {new Date(data.message.createdAt).toLocaleString("uz-UZ", { day: "numeric", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit" })}
                                        {data.message.editedAt && <span className="ml-1 italic opacity-75">(tahrirlangan)</span>}
                                    </p>
                                </div>
                            </div>

                            {data.message.text && (
                                <div className="text-sm whitespace-pre-wrap p-4 rounded-xl"
                                    style={{ background: "rgba(43,62,232,0.10)", border: "1px solid rgba(43,62,232,0.15)", color: "rgba(220,230,255,0.95)" }}>
                                    <NxMarkdown text={data.message.text} />
                                </div>
                            )}

                            {data.message.media.length > 0 && (
                                <div className="mt-3 grid grid-cols-2 gap-2">
                                    {data.message.media.slice(0, 4).map((url, i) => (
                                        <a key={i} href={url} target="_blank" rel="noopener noreferrer"
                                            className="block rounded-lg overflow-hidden aspect-square bg-white/[0.05]">
                                            <img src={url} alt="" className="w-full h-full object-cover" />
                                        </a>
                                    ))}
                                </div>
                            )}

                            {data.message.pollQuestion && (
                                <div className="mt-3 p-3 rounded-xl"
                                    style={{ background: "rgba(43,62,232,0.10)", border: "1px solid rgba(43,62,232,0.20)" }}>
                                    <p className="text-xs font-black text-white">{data.message.pollQuestion}</p>
                                    <div className="mt-2 space-y-1">
                                        {(data.message.pollOptions ?? []).map((o, i) => (
                                            <p key={i} className="text-xs" style={{ color: "rgba(220,230,255,0.85)" }}>• {o}</p>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Amallar */}
                        <div className="p-5 border-t flex gap-2" style={{ borderColor: "rgba(43,62,232,0.14)" }}>
                            <button onClick={copyLink}
                                className="flex-1 h-10 rounded-xl flex items-center justify-center gap-2 text-xs font-black"
                                style={{ background: "rgba(43,62,232,0.15)", color: "#fff", border: "1px solid rgba(43,62,232,0.30)" }}>
                                <Copy className="w-3.5 h-3.5" /> Havoladan nusxa olish
                            </button>
                            <Link href={`/nexus?channel=${data.channel.handle}`}
                                className="flex-1 h-10 rounded-xl flex items-center justify-center gap-2 text-xs font-black text-white"
                                style={{ background: "linear-gradient(135deg,#2B3EE8,#00CEC8)" }}>
                                <ExternalLink className="w-3.5 h-3.5" /> Kanalni ochish
                            </Link>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
