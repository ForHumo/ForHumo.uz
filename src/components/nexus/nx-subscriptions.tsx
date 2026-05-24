"use client";

import { useState } from "react";
import { X, UserCheck, UserPlus, Search, BadgeCheck, Bell, BellOff, ChevronRight, Users } from "lucide-react";
import { useNxPlayer } from "./nx-player-ctx";

// ─────────────────────────────────────────────────────────────────────────────
// Mock ma'lumotlar
// ─────────────────────────────────────────────────────────────────────────────
interface Creator {
    id: string; name: string; seed: string; handle: string;
    subs: string; videos: string; verified?: boolean;
    notif?: boolean; following: boolean; category: string;
}

const MOCK_CREATORS: Creator[] = [
    { id:"c1", name:"Humo Official",       seed:"humo",    handle:"@humo_official",   subs:"845K",  videos:"312",  verified:true,  notif:true,  following:true,  category:"Tech"     },
    { id:"c2", name:"Madina Ergash",        seed:"madina",  handle:"@madina_musiq",    subs:"420K",  videos:"158",  verified:true,  notif:false, following:true,  category:"Musiqa"   },
    { id:"c3", name:"Sardor Dev",           seed:"sardor",  handle:"@sardor_dev",      subs:"230K",  videos:"89",   verified:false, notif:true,  following:true,  category:"Ta'lim"   },
    { id:"c4", name:"Kamola Film Lab",      seed:"kamola",  handle:"@kamola_film",     subs:"180K",  videos:"201",  verified:true,  notif:false, following:true,  category:"Kino"     },
    { id:"c5", name:"Beat Studio UZ",       seed:"beat",    handle:"@beat_studio_uz",  subs:"95K",   videos:"67",   verified:false, notif:false, following:true,  category:"Musiqa"   },
    { id:"c6", name:"AI Hub UZ",            seed:"ai_hub",  handle:"@ai_hub_uz",       subs:"78K",   videos:"43",   verified:false, notif:true,  following:true,  category:"AI"       },
    { id:"c7", name:"Sport Live UZ",        seed:"sport",   handle:"@sport_live_uz",   subs:"560K",  videos:"445",  verified:true,  notif:false, following:true,  category:"Sport"    },
];

const SUGGESTED: Omit<Creator, "notif" | "following">[] = [
    { id:"s1", name:"Bobur Tech",           seed:"bobur",   handle:"@bobur_tech",      subs:"340K",  videos:"120",  verified:true,  category:"Tech"     },
    { id:"s2", name:"Dilnoza Travel",       seed:"dilnoza", handle:"@dilnoza_travel",  subs:"210K",  videos:"88",   verified:false, category:"Sayohat"  },
    { id:"s3", name:"Jasur Fitness",        seed:"jasur",   handle:"@jasur_fit",       subs:"167K",  videos:"205",  verified:false, category:"Sport"    },
    { id:"s4", name:"Zulfiya Art",          seed:"zulfiya", handle:"@zulfiya_art",     subs:"92K",   videos:"56",   verified:false, category:"San'at"   },
    { id:"s5", name:"Nexus News",           seed:"news",    handle:"@nexus_news",      subs:"1.2M",  videos:"890",  verified:true,  category:"Yangilik" },
    { id:"s6", name:"Startup UZ",           seed:"startup", handle:"@startup_uz",      subs:"88K",   videos:"72",   verified:false, category:"Biznes"   },
];

// ─────────────────────────────────────────────────────────────────────────────
// NxSubscriptions
// ─────────────────────────────────────────────────────────────────────────────
export function NxSubscriptions() {
    const { subsOpen, setSubsOpen, openChannel } = useNxPlayer();
    const [tab,     setTab]     = useState<"following" | "suggested">("following");
    const [search,  setSearch]  = useState("");
    const [creators, setCreators] = useState<Creator[]>(MOCK_CREATORS);
    const [followed, setFollowed] = useState<Set<string>>(new Set());

    if (!subsOpen) return null;

    const filtered = creators.filter(c =>
        c.name.toLowerCase().includes(search.toLowerCase()) ||
        c.handle.toLowerCase().includes(search.toLowerCase())
    );

    const toggleNotif = (id: string) => {
        setCreators(prev => prev.map(c => c.id === id ? { ...c, notif: !c.notif } : c));
    };

    const unfollow = (id: string) => {
        setCreators(prev => prev.filter(c => c.id !== id));
    };

    const followSuggested = (id: string) => {
        setFollowed(prev => {
            const next = new Set(prev);
            next.has(id) ? next.delete(id) : next.add(id);
            return next;
        });
    };

    return (
        <>
            {/* Backdrop */}
            <div
                className="fixed inset-0 z-[55]"
                style={{ background: "rgba(5,8,24,0.80)", backdropFilter: "blur(8px)" }}
                onClick={() => setSubsOpen(false)}
            />

            {/* Modal */}
            <div
                className="fixed inset-x-0 bottom-0 z-[55] flex flex-col rounded-t-3xl overflow-hidden md:inset-x-auto md:inset-y-auto md:top-1/2 md:left-1/2 md:-translate-x-1/2 md:-translate-y-1/2 md:w-[480px] md:max-h-[88vh] md:rounded-3xl"
                style={{
                    background: "rgba(8,12,32,0.98)",
                    border: "1px solid rgba(43,62,232,0.22)",
                    boxShadow: "0 32px 80px rgba(0,0,0,0.70)",
                    maxHeight: "90vh",
                }}
                onClick={e => e.stopPropagation()}
            >
                {/* Header */}
                <div className="flex items-center justify-between px-5 pt-5 pb-3 flex-shrink-0">
                    <div>
                        <h2 className="text-lg font-black text-white">Obunalarim</h2>
                        <p className="text-[10px] mt-0.5" style={{ color: "rgba(80,100,150,0.80)" }}>
                            {creators.length} kreator · tavsiya etilgan {SUGGESTED.length}
                        </p>
                    </div>
                    <button
                        onClick={() => setSubsOpen(false)}
                        className="w-8 h-8 flex items-center justify-center rounded-full"
                        style={{ background: "rgba(43,62,232,0.12)", border: "1px solid rgba(43,62,232,0.22)" }}
                    >
                        <X className="w-4 h-4 text-white" />
                    </button>
                </div>

                {/* Stats bar */}
                <div className="px-5 pb-3 flex gap-3 flex-shrink-0">
                    {[
                        { label: "Obunalar",  value: `${creators.length}` },
                        { label: "Muxlislar", value: "12.4K" },
                        { label: "Bildirishnoma", value: `${creators.filter(c => c.notif).length}` },
                    ].map(s => (
                        <div key={s.label} className="flex-1 text-center py-2.5 rounded-xl"
                            style={{ background: "rgba(43,62,232,0.08)", border: "1px solid rgba(43,62,232,0.14)" }}>
                            <p className="text-base font-black text-white">{s.value}</p>
                            <p className="text-[9px] mt-0.5" style={{ color: "rgba(80,100,150,0.80)" }}>{s.label}</p>
                        </div>
                    ))}
                </div>

                {/* Tabs */}
                <div className="px-5 pb-3 flex gap-2 flex-shrink-0">
                    {(["following", "suggested"] as const).map(t => (
                        <button
                            key={t}
                            onClick={() => setTab(t)}
                            className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold transition-all duration-200"
                            style={tab === t ? {
                                background: "linear-gradient(135deg,#2B3EE8,#00CEC8)",
                                color: "white",
                            } : {
                                background: "rgba(43,62,232,0.10)",
                                border: "1px solid rgba(43,62,232,0.20)",
                                color: "rgba(140,160,210,0.85)",
                            }}
                        >
                            {t === "following"
                                ? <><UserCheck className="w-3 h-3" /> Obunalar</>
                                : <><UserPlus  className="w-3 h-3" /> Tavsiya</>}
                        </button>
                    ))}
                </div>

                {/* Search (following tab) */}
                {tab === "following" && (
                    <div className="px-5 pb-3 flex-shrink-0">
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 pointer-events-none"
                                style={{ color: "rgba(43,62,232,0.50)" }} />
                            <input
                                type="text"
                                placeholder="Kreator qidirish..."
                                value={search}
                                onChange={e => setSearch(e.target.value)}
                                className="w-full h-10 rounded-xl pl-9 pr-4 text-sm text-white outline-none"
                                style={{
                                    background: "rgba(5,8,24,0.60)",
                                    border: "1px solid rgba(43,62,232,0.22)",
                                    caretColor: "#00CEC8",
                                }}
                            />
                        </div>
                    </div>
                )}

                {/* Content */}
                <div className="flex-1 overflow-y-auto px-5 pb-6" style={{ scrollbarWidth: "none" }}>
                    {tab === "following" && (
                        <div className="flex flex-col gap-2">
                            {filtered.map(c => (
                                <div key={c.id}
                                    className="flex items-center gap-3 p-3 rounded-2xl"
                                    style={{ border: "1px solid rgba(43,62,232,0.12)", background: "rgba(11,18,40,0.40)" }}
                                >
                                    {/* Avatar — click opens channel */}
                                    <button
                                        onClick={() => { setSubsOpen(false); openChannel(c.name); }}
                                        className="flex-shrink-0 w-12 h-12 rounded-2xl overflow-hidden bg-white"
                                    >
                                        <img src={`https://api.dicebear.com/9.x/avataaars/svg?seed=${c.seed}`} alt={c.name} className="w-full h-full object-cover" />
                                    </button>

                                    {/* Info */}
                                    <button
                                        className="flex-1 min-w-0 text-left"
                                        onClick={() => { setSubsOpen(false); openChannel(c.name); }}
                                    >
                                        <div className="flex items-center gap-1.5">
                                            <span className="text-sm font-bold text-white truncate hover:text-[#00CEC8] transition-colors duration-150">{c.name}</span>
                                            {c.verified && <BadgeCheck className="w-3.5 h-3.5 flex-shrink-0" style={{ color: "#00CEC8" }} />}
                                        </div>
                                        <p className="text-[10px]" style={{ color: "rgba(80,100,150,0.80)" }}>
                                            {c.handle} · {c.subs} obunachi · {c.category}
                                        </p>
                                    </button>

                                    {/* Actions */}
                                    <div className="flex gap-1.5 flex-shrink-0">
                                        <button
                                            onClick={() => toggleNotif(c.id)}
                                            className="w-8 h-8 flex items-center justify-center rounded-xl transition-all duration-150 active:scale-90"
                                            style={{
                                                background: c.notif ? "rgba(0,206,200,0.15)" : "rgba(43,62,232,0.10)",
                                                border: `1px solid ${c.notif ? "rgba(0,206,200,0.35)" : "rgba(43,62,232,0.20)"}`,
                                            }}
                                            title={c.notif ? "Bildirishnomani o'chirish" : "Bildirishnomani yoqish"}
                                        >
                                            {c.notif
                                                ? <Bell    className="w-3.5 h-3.5" style={{ color: "#00CEC8" }} />
                                                : <BellOff className="w-3.5 h-3.5" style={{ color: "rgba(100,120,170,0.70)" }} />
                                            }
                                        </button>
                                        <button
                                            onClick={() => unfollow(c.id)}
                                            className="flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-bold transition-all duration-150 active:scale-90"
                                            style={{
                                                background: "rgba(239,68,68,0.08)",
                                                border: "1px solid rgba(239,68,68,0.20)",
                                                color: "rgba(239,68,68,0.80)",
                                            }}
                                        >
                                            Bekor
                                        </button>
                                    </div>
                                </div>
                            ))}
                            {filtered.length === 0 && (
                                <div className="text-center py-12">
                                    <Users className="w-10 h-10 mx-auto mb-3" style={{ color: "rgba(43,62,232,0.30)" }} />
                                    <p className="text-sm" style={{ color: "rgba(80,100,150,0.70)" }}>
                                        {search ? "Kreator topilmadi" : "Hech qanday obuna yo'q"}
                                    </p>
                                </div>
                            )}
                        </div>
                    )}

                    {tab === "suggested" && (
                        <div className="flex flex-col gap-2">
                            <p className="text-[9px] font-black uppercase tracking-widest mb-2"
                                style={{ color: "rgba(43,62,232,0.55)" }}>
                                Siz uchun tavsiya
                            </p>
                            {SUGGESTED.map(c => {
                                const isFollowed = followed.has(c.id);
                                return (
                                    <div key={c.id}
                                        className="flex items-center gap-3 p-3 rounded-2xl"
                                        style={{ border: "1px solid rgba(43,62,232,0.12)", background: "rgba(11,18,40,0.40)" }}
                                    >
                                        <button
                                            onClick={() => { setSubsOpen(false); openChannel(c.name); }}
                                            className="flex-shrink-0 w-12 h-12 rounded-2xl overflow-hidden bg-white"
                                        >
                                            <img src={`https://api.dicebear.com/9.x/avataaars/svg?seed=${c.seed}`} alt={c.name} className="w-full h-full object-cover" />
                                        </button>
                                        <button
                                            className="flex-1 min-w-0 text-left"
                                            onClick={() => { setSubsOpen(false); openChannel(c.name); }}
                                        >
                                            <div className="flex items-center gap-1.5">
                                                <span className="text-sm font-bold text-white truncate hover:text-[#00CEC8] transition-colors">{c.name}</span>
                                                {c.verified && <BadgeCheck className="w-3.5 h-3.5 flex-shrink-0" style={{ color: "#00CEC8" }} />}
                                            </div>
                                            <p className="text-[10px]" style={{ color: "rgba(80,100,150,0.80)" }}>
                                                {c.handle} · {c.subs} obunachi · {c.category}
                                            </p>
                                        </button>
                                        <button
                                            onClick={() => followSuggested(c.id)}
                                            className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition-all duration-150 active:scale-90 flex-shrink-0"
                                            style={isFollowed ? {
                                                background: "rgba(43,62,232,0.10)",
                                                border: "1px solid rgba(43,62,232,0.25)",
                                                color: "rgba(140,160,210,0.80)",
                                            } : {
                                                background: "linear-gradient(135deg,#2B3EE8,#00CEC8)",
                                                color: "white",
                                                boxShadow: "0 4px 12px rgba(43,62,232,0.35)",
                                            }}
                                        >
                                            {isFollowed
                                                ? <><UserCheck className="w-3 h-3" /> Obunada</>
                                                : <><UserPlus  className="w-3 h-3" /> Obuna</>
                                            }
                                        </button>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            </div>
        </>
    );
}
