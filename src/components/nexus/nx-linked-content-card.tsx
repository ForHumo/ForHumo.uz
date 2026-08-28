"use client";

// Cross-post kartochkasi — kanal xabarida linked post/video/live/track.
// WhatsApp-uslub: thumb + markazda Play tugma + nom (deep link'ga olib boradi).

import { Link } from "@/i18n/routing";
import { Play, Radio, Music2, MessageCircle, ExternalLink } from "lucide-react";

interface Props {
    type: string;                        // "post" | "video" | "live" | "track"
    id: string;
    title: string;
    thumb?: string | null;
}

function hrefOf(type: string, id: string): string {
    if (type === "video") return `/nexus/v/${id}`;
    if (type === "live") return `/nexus/live/${id}`;
    if (type === "track") return `/nexus/t/${id}`;
    return `/nexus/p/${id}`;
}

function typeMeta(type: string) {
    switch (type) {
        case "video": return { label: "Video", color: "#8B5CF6", Icon: Play };
        case "live":  return { label: "Jonli efir", color: "#EF4444", Icon: Radio };
        case "track": return { label: "Musiqa", color: "#10B981", Icon: Music2 };
        default:      return { label: "Post", color: "#00CEC8", Icon: MessageCircle };
    }
}

export function LinkedContentCard({ type, id, title, thumb }: Props) {
    const { label, color, Icon } = typeMeta(type);
    const href = hrefOf(type, id);
    const isLive = type === "live";

    return (
        <Link href={href} onClick={e => e.stopPropagation()}
            className="relative block mb-1.5 rounded-xl overflow-hidden group active:scale-[0.99] transition-transform"
            style={{ background: "rgba(5,8,24,0.60)", border: `1px solid ${color}44` }}>
            {thumb ? (
                <div className="relative aspect-video">
                    <img src={thumb} alt="" className="w-full h-full object-cover" />
                    {/* Qorong'i overlay + Play tugma */}
                    <div className="absolute inset-0 flex items-center justify-center"
                        style={{ background: "linear-gradient(180deg, rgba(5,8,24,0.10) 0%, rgba(5,8,24,0.55) 100%)" }}>
                        <div className="w-14 h-14 rounded-full flex items-center justify-center shadow-2xl transition-transform group-hover:scale-110"
                            style={{ background: `linear-gradient(135deg, ${color}, ${color}CC)`,
                                boxShadow: `0 8px 24px ${color}80` }}>
                            <Icon className={`w-6 h-6 text-white ${isLive ? "" : "fill-white"} ml-0.5`} />
                        </div>
                    </div>
                    {/* Type badge yuqorida chapda */}
                    <span className="absolute top-2 left-2 flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-black text-white uppercase"
                        style={{ background: color }}>
                        {isLive && <span className="w-1 h-1 rounded-full bg-white animate-pulse" />}
                        <Icon className="w-2.5 h-2.5" />{label}
                    </span>
                </div>
            ) : (
                <div className="flex items-center justify-center py-8" style={{ background: `${color}15` }}>
                    <div className="w-14 h-14 rounded-full flex items-center justify-center"
                        style={{ background: `linear-gradient(135deg, ${color}, ${color}CC)` }}>
                        <Icon className={`w-6 h-6 text-white ${isLive ? "" : "fill-white"} ml-0.5`} />
                    </div>
                </div>
            )}
            {/* Sarlavha + havola indikatori */}
            <div className="flex items-center gap-2 px-3 py-2" style={{ background: "rgba(5,8,24,0.50)" }}>
                <div className="min-w-0 flex-1">
                    <p className="text-[10px] font-black uppercase tracking-widest" style={{ color }}>{label}</p>
                    <p className="text-sm font-bold text-white truncate">{title}</p>
                </div>
                <ExternalLink className="w-3.5 h-3.5 flex-shrink-0" style={{ color: `${color}CC` }} />
            </div>
        </Link>
    );
}
