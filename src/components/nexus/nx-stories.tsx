"use client";

import { useState, useEffect, useCallback } from "react";
import { Plus } from "lucide-react";
import { useSession } from "next-auth/react";
import { useNxPlayer } from "./nx-player-ctx";

interface SAuthor { name: string | null; username: string | null; image: string | null; verified: boolean }
interface SGroup { author: SAuthor | null; isMe: boolean; stories: { id: string }[]; allSeen: boolean }

export function NxStories() {
    const { data: session } = useSession();
    const { openStoriesViewer, setStoryCreateOpen, storyCreateOpen, storiesViewerOpen } = useNxPlayer();
    const [groups, setGroups] = useState<SGroup[]>([]);

    const load = useCallback(() => {
        fetch("/api/nexus/stories").then(r => r.json()).then(d => setGroups(d.groups ?? [])).catch(() => { });
    }, []);
    useEffect(() => { load(); }, [load]);
    useEffect(() => { if (!storyCreateOpen) load(); }, [storyCreateOpen, load]);
    useEffect(() => { if (!storiesViewerOpen) load(); }, [storiesViewerOpen, load]);

    const myImage = session?.user?.image ?? null;
    const myLetter = (session?.user?.name?.[0] ?? "S").toUpperCase();

    return (
        <div className="relative flex-shrink-0" style={{ borderBottom: "1px solid rgba(43,62,232,0.12)" }}>
            <div className="absolute right-0 top-0 bottom-0 w-12 z-10 pointer-events-none" style={{ background: "linear-gradient(to right, transparent, #050818)" }} />

            <div className="flex items-start gap-4 overflow-x-auto px-4 py-3" style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}>
                {/* Hikoya qo'shish */}
                <button onClick={() => setStoryCreateOpen(true)} className="flex flex-col items-center gap-1.5 flex-shrink-0 active:scale-95 transition-transform duration-150">
                    <div className="relative">
                        <div className="w-[58px] h-[58px] rounded-full p-[2px]" style={{ background: "rgba(43,62,232,0.20)", border: "2px dashed rgba(43,62,232,0.40)" }}>
                            <div className="w-full h-full rounded-full overflow-hidden flex items-center justify-center text-lg font-black text-white"
                                style={{ background: myImage ? "transparent" : "linear-gradient(135deg,rgba(43,62,232,0.30),rgba(0,206,200,0.20))" }}>
                                {myImage
                                    ? <img src={myImage} alt="" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                                    : <span style={{ color: "rgba(43,62,232,0.80)" }}>{myLetter}</span>}
                            </div>
                        </div>
                        <div className="absolute -bottom-0.5 -right-0.5 w-5 h-5 rounded-full flex items-center justify-center"
                            style={{ background: "linear-gradient(135deg,#2B3EE8,#00CEC8)", border: "2px solid #050818", boxShadow: "0 0 8px rgba(0,206,200,0.60)" }}>
                            <Plus className="w-2.5 h-2.5 text-white" strokeWidth={3} />
                        </div>
                    </div>
                    <span className="text-[10px] font-medium text-center truncate w-16" style={{ color: "rgba(160,176,224,0.70)" }}>Hikoya</span>
                </button>

                {/* Faol storylar */}
                {groups.map((g, idx) => {
                    const a = g.author;
                    const avatar = a?.image || `https://api.dicebear.com/9.x/avataaars/svg?seed=${encodeURIComponent(a?.username || a?.name || "user")}`;
                    const label = g.isMe ? "Siz" : (a?.name || a?.username || "Foydalanuvchi");
                    return (
                        <button key={idx} onClick={() => openStoriesViewer(idx)} className="flex flex-col items-center gap-1.5 flex-shrink-0 active:scale-95 transition-transform duration-150 group">
                            <div className="w-[58px] h-[58px] rounded-full"
                                style={g.allSeen
                                    ? { background: "rgba(60,70,100,0.45)", padding: "2.5px" }
                                    : { background: "linear-gradient(135deg,#2B3EE8 0%,#00CEC8 100%)", padding: "2.5px", boxShadow: "0 0 12px rgba(43,62,232,0.40)" }}>
                                <div className="w-full h-full rounded-full overflow-hidden" style={{ border: "2px solid #050818" }}>
                                    <img src={avatar} alt={label} className="w-full h-full object-cover bg-white" />
                                </div>
                            </div>
                            <span className="text-[10px] font-medium text-center truncate w-16 group-hover:text-white transition-colors duration-150"
                                style={{ color: g.allSeen ? "rgba(100,120,160,0.6)" : "rgba(180,195,230,0.9)" }}>{label}</span>
                        </button>
                    );
                })}

                <div className="flex-shrink-0 w-4" aria-hidden />
            </div>
        </div>
    );
}
