"use client";

import { useState } from "react";
import {
    X, Calendar, MapPin, Users, Clock, Plus, Search,
    ChevronRight, Ticket, Star, Radio, BadgeCheck, Filter,
} from "lucide-react";
import { useNxPlayer } from "./nx-player-ctx";

// ─────────────────────────────────────────────────────────────────────────────
// Mock ma'lumotlar
// ─────────────────────────────────────────────────────────────────────────────
interface NxEvent {
    id: string; title: string; organizer: string; orgSeed: string;
    date: string; time: string; location: string; online: boolean;
    image: string; attendees: number; price: string; category: string;
    tag?: string; verified?: boolean; going?: boolean;
}

const MOCK_EVENTS: NxEvent[] = [
    {
        id:"e1", title:"Nexus Developer Conference 2026",
        organizer:"Humo Official", orgSeed:"humo",
        date:"15 Iyun, 2026", time:"09:00 – 18:00",
        location:"Toshkent, IT Park", online:false,
        image:"https://picsum.photos/seed/ev1/800/400",
        attendees:1240, price:"Bepul", category:"Tech",
        tag:"Trendda", verified:true, going:true,
    },
    {
        id:"e2", title:"O'zbek Musiqa Festivali",
        organizer:"Madina Ergash", orgSeed:"madina",
        date:"22 Iyun, 2026", time:"18:00 – 23:00",
        location:"Toshkent, Milliy Bog'", online:false,
        image:"https://picsum.photos/seed/ev2/800/400",
        attendees:3500, price:"80,000 so'm", category:"Musiqa",
        tag:"Mashhur", verified:true, going:false,
    },
    {
        id:"e3", title:"AI va Kelajak — Onlayn Webinar",
        organizer:"AI Hub UZ", orgSeed:"ai_hub",
        date:"18 Iyun, 2026", time:"20:00 – 22:00",
        location:"Online", online:true,
        image:"https://picsum.photos/seed/ev3/800/400",
        attendees:890, price:"Bepul", category:"AI",
        tag:"Yangi", verified:false, going:false,
    },
    {
        id:"e4", title:"Startup Pitch Day UZ",
        organizer:"Startup UZ", orgSeed:"startup",
        date:"25 Iyun, 2026", time:"10:00 – 17:00",
        location:"Toshkent, Technopark", online:false,
        image:"https://picsum.photos/seed/ev4/800/400",
        attendees:450, price:"50,000 so'm", category:"Biznes",
        verified:true, going:false,
    },
    {
        id:"e5", title:"UX/UI Masterclass",
        organizer:"Design UZ", orgSeed:"design",
        date:"20 Iyun, 2026", time:"14:00 – 17:00",
        location:"Online", online:true,
        image:"https://picsum.photos/seed/ev5/800/400",
        attendees:320, price:"120,000 so'm", category:"Dizayn",
        verified:false, going:true,
    },
    {
        id:"e6", title:"Milliy Futbol — Finali",
        organizer:"Sport UZ", orgSeed:"sport",
        date:"30 Iyun, 2026", time:"20:00",
        location:"Toshkent, Milliy stadium", online:false,
        image:"https://picsum.photos/seed/ev6/800/400",
        attendees:35000, price:"150,000 so'm", category:"Sport",
        tag:"Mashhur", verified:true, going:false,
    },
];

const CATEGORIES = ["Hammasi", "Tech", "Musiqa", "AI", "Biznes", "Sport", "Dizayn"];

// ─────────────────────────────────────────────────────────────────────────────
// Event Card — horizontal
// ─────────────────────────────────────────────────────────────────────────────
function EventCard({ event, onSelect, onToggleGoing }: {
    event: NxEvent;
    onSelect: () => void;
    onToggleGoing: () => void;
}) {
    return (
        <div
            className="rounded-2xl overflow-hidden cursor-pointer group"
            style={{ background: "rgba(11,18,40,0.60)", border: "1px solid rgba(43,62,232,0.18)" }}
        >
            {/* Image */}
            <button onClick={onSelect} className="relative w-full block">
                <div className="h-36 overflow-hidden">
                    <img src={event.image} alt={event.title}
                        className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" />
                </div>
                {/* Badges */}
                <div className="absolute top-3 left-3 flex gap-2">
                    {event.tag && (
                        <span className="px-2 py-0.5 rounded-lg text-[9px] font-black"
                            style={{ background: "linear-gradient(135deg,#2B3EE8,#00CEC8)" }}>
                            {event.tag}
                        </span>
                    )}
                    {event.online && (
                        <span className="px-2 py-0.5 rounded-lg text-[9px] font-black flex items-center gap-1"
                            style={{ background: "rgba(139,92,246,0.90)" }}>
                            <Radio className="w-2.5 h-2.5" /> Online
                        </span>
                    )}
                </div>
                <div className="absolute top-3 right-3 px-2 py-0.5 rounded-lg text-[10px] font-black text-white"
                    style={{ background: "rgba(5,8,24,0.80)" }}>
                    {event.price}
                </div>
            </button>

            {/* Info */}
            <div className="p-4">
                <button onClick={onSelect} className="text-left w-full">
                    <h3 className="text-sm font-black text-white leading-snug mb-2 group-hover:text-[#00CEC8] transition-colors duration-150">
                        {event.title}
                    </h3>
                </button>
                <div className="flex items-center gap-1.5 mb-1.5">
                    <Calendar className="w-3 h-3 flex-shrink-0" style={{ color: "rgba(0,206,200,0.70)" }} />
                    <span className="text-[10px]" style={{ color: "rgba(120,140,190,0.80)" }}>{event.date} · {event.time}</span>
                </div>
                <div className="flex items-center gap-1.5 mb-3">
                    <MapPin className="w-3 h-3 flex-shrink-0" style={{ color: "rgba(43,62,232,0.70)" }} />
                    <span className="text-[10px]" style={{ color: "rgba(120,140,190,0.80)" }}>{event.location}</span>
                </div>

                {/* Footer */}
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                        <div className="flex -space-x-1.5">
                            {Array.from({ length: Math.min(3, Math.ceil(event.attendees / 500)) }, (_, i) => (
                                <div key={i} className="w-5 h-5 rounded-full overflow-hidden bg-white border"
                                    style={{ borderColor: "rgba(8,12,32,1)" }}>
                                    <img src={`https://api.dicebear.com/9.x/avataaars/svg?seed=att${event.id}${i}`} alt="" className="w-full h-full" />
                                </div>
                            ))}
                        </div>
                        <span className="text-[10px]" style={{ color: "rgba(80,100,150,0.80)" }}>
                            {event.attendees.toLocaleString()} boradiganlar
                        </span>
                    </div>
                    <button
                        onClick={onToggleGoing}
                        className="px-3 py-1.5 rounded-xl text-[10px] font-black transition-all duration-150 active:scale-90"
                        style={event.going ? {
                            background: "rgba(16,185,129,0.15)",
                            border: "1px solid rgba(16,185,129,0.40)",
                            color: "#10B981",
                        } : {
                            background: "linear-gradient(135deg,#2B3EE8,#00CEC8)",
                            color: "white",
                        }}
                    >
                        {event.going ? "Boraman" : "Qatnashish"}
                    </button>
                </div>
            </div>
        </div>
    );
}

// ─────────────────────────────────────────────────────────────────────────────
// NxEvents — asosiy panel
// ─────────────────────────────────────────────────────────────────────────────
export function NxEvents() {
    const { eventsOpen, setEventsOpen } = useNxPlayer();
    const [category, setCategory]   = useState("Hammasi");
    const [search,   setSearch]     = useState("");
    const [events,   setEvents]     = useState<NxEvent[]>(MOCK_EVENTS);
    const [detail,   setDetail]     = useState<NxEvent | null>(null);

    if (!eventsOpen) return null;

    const filtered = events.filter(e =>
        (category === "Hammasi" || e.category === category) &&
        (e.title.toLowerCase().includes(search.toLowerCase()) ||
         e.organizer.toLowerCase().includes(search.toLowerCase()))
    );

    const toggleGoing = (id: string) => {
        setEvents(prev => prev.map(e => e.id === id ? { ...e, going: !e.going, attendees: e.going ? e.attendees - 1 : e.attendees + 1 } : e));
    };

    return (
        <>
            {/* Backdrop */}
            <div
                className="fixed inset-0 z-[55]"
                style={{ background: "rgba(5,8,24,0.80)", backdropFilter: "blur(8px)" }}
                onClick={() => setEventsOpen(false)}
            />

            {/* Modal */}
            <div
                className="fixed inset-x-0 bottom-0 z-[55] flex flex-col rounded-t-3xl overflow-hidden md:inset-x-auto md:inset-y-auto md:top-1/2 md:left-1/2 md:-translate-x-1/2 md:-translate-y-1/2 md:w-[520px] md:max-h-[90vh] md:rounded-3xl"
                style={{
                    background: "rgba(8,12,32,0.98)",
                    border: "1px solid rgba(43,62,232,0.22)",
                    boxShadow: "0 32px 80px rgba(0,0,0,0.70)",
                    maxHeight: "92vh",
                }}
                onClick={e => e.stopPropagation()}
            >
                {/* Header */}
                <div className="flex items-center justify-between px-5 pt-5 pb-3 flex-shrink-0">
                    <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-xl flex items-center justify-center"
                            style={{ background: "linear-gradient(135deg,#F59E0B,#EF4444)" }}>
                            <Calendar className="w-4 h-4 text-white" />
                        </div>
                        <div>
                            <h2 className="text-base font-black text-white leading-tight">Tadbirlar</h2>
                            <p className="text-[9px]" style={{ color: "rgba(80,100,150,0.80)" }}>{events.length} tadbir · {events.filter(e => e.going).length} boradiganing bor</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <button
                            className="px-3 py-1.5 rounded-xl text-[10px] font-black flex items-center gap-1 transition-all duration-150 active:scale-95"
                            style={{ background: "linear-gradient(135deg,#F59E0B,#EF4444)", color: "white" }}
                        >
                            <Plus className="w-3 h-3" /> Yaratish
                        </button>
                        <button
                            onClick={() => setEventsOpen(false)}
                            className="w-8 h-8 flex items-center justify-center rounded-full"
                            style={{ background: "rgba(43,62,232,0.12)", border: "1px solid rgba(43,62,232,0.22)" }}
                        >
                            <X className="w-4 h-4 text-white" />
                        </button>
                    </div>
                </div>

                {/* My events mini */}
                {events.filter(e => e.going).length > 0 && (
                    <div className="px-5 pb-3 flex-shrink-0">
                        <div className="p-3.5 rounded-2xl flex items-center gap-3"
                            style={{ background: "rgba(16,185,129,0.08)", border: "1px solid rgba(16,185,129,0.25)" }}>
                            <Ticket className="w-5 h-5 flex-shrink-0" style={{ color: "#10B981" }} />
                            <div className="flex-1">
                                <p className="text-xs font-black text-white">Mening tadbirlarim</p>
                                <p className="text-[10px]" style={{ color: "rgba(16,185,129,0.80)" }}>
                                    {events.filter(e => e.going).length} tadbir · keyingisi: {events.find(e => e.going)?.date ?? "—"}
                                </p>
                            </div>
                            <ChevronRight className="w-4 h-4" style={{ color: "rgba(16,185,129,0.50)" }} />
                        </div>
                    </div>
                )}

                {/* Search */}
                <div className="px-5 pb-3 flex-shrink-0">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 pointer-events-none"
                            style={{ color: "rgba(43,62,232,0.50)" }} />
                        <input
                            type="text"
                            placeholder="Tadbir qidirish..."
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

                {/* Categories */}
                <div className="px-5 pb-3 flex-shrink-0">
                    <div className="flex gap-2 overflow-x-auto pb-1" style={{ scrollbarWidth: "none" }}>
                        {CATEGORIES.map(cat => (
                            <button key={cat}
                                onClick={() => setCategory(cat)}
                                className="px-3 py-1.5 rounded-xl text-xs font-bold flex-shrink-0 transition-all duration-200"
                                style={category === cat ? {
                                    background: "linear-gradient(135deg,#F59E0B,#EF4444)",
                                    color: "white",
                                } : {
                                    background: "rgba(43,62,232,0.10)",
                                    border: "1px solid rgba(43,62,232,0.22)",
                                    color: "rgba(140,160,210,0.85)",
                                }}
                            >{cat}</button>
                        ))}
                    </div>
                </div>

                {/* Events list */}
                <div className="flex-1 overflow-y-auto px-5 pb-6" style={{ scrollbarWidth: "none" }}>
                    {filtered.length === 0 ? (
                        <div className="text-center py-12">
                            <Calendar className="w-10 h-10 mx-auto mb-3" style={{ color: "rgba(43,62,232,0.30)" }} />
                            <p className="text-sm" style={{ color: "rgba(80,100,150,0.70)" }}>Tadbir topilmadi</p>
                        </div>
                    ) : (
                        <div className="flex flex-col gap-4">
                            {filtered.map(event => (
                                <EventCard
                                    key={event.id}
                                    event={event}
                                    onSelect={() => setDetail(event)}
                                    onToggleGoing={() => toggleGoing(event.id)}
                                />
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </>
    );
}
