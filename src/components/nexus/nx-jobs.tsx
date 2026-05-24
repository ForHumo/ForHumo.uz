"use client";

import { useState } from "react";
import {
    X, Briefcase, Search, MapPin, Clock, DollarSign,
    ChevronRight, Plus, Bookmark, BadgeCheck, Star,
    ArrowLeft, Send, Building2, Users, TrendingUp,
} from "lucide-react";
import { useNxPlayer } from "./nx-player-ctx";

// ─────────────────────────────────────────────────────────────────────────────
// Mock ma'lumotlar
// ─────────────────────────────────────────────────────────────────────────────
interface Job {
    id: string; title: string; company: string; companySeed: string;
    location: string; type: "full" | "part" | "remote" | "freelance";
    salary: string; skills: string[]; posted: string;
    description: string; applicants: number; saved?: boolean; verified?: boolean;
    level: "Junior" | "Middle" | "Senior" | "Lead";
}

const MOCK_JOBS: Job[] = [
    {
        id:"j1", title:"Frontend Developer (React/Next.js)",
        company:"Humo Digital", companySeed:"humo",
        location:"Toshkent", type:"remote", salary:"$1200-2000/oy",
        skills:["React","TypeScript","Next.js","Tailwind"],
        posted:"2 soat oldin", applicants:34, verified:true, level:"Middle",
        description:"Biz zamonaviy React va Next.js texnologiyalari bilan ishlash uchun tajribali Frontend dasturchini izlayapmiz.",
    },
    {
        id:"j2", title:"UI/UX Designer",
        company:"Design Studio UZ", companySeed:"design",
        location:"Toshkent", type:"full", salary:"$800-1400/oy",
        skills:["Figma","Prototyping","User Research","Design Systems"],
        posted:"5 soat oldin", applicants:18, verified:false, level:"Middle",
        description:"Foydalanuvchi tajribasini yaxshilash uchun ijodiy dizayner qidirilmoqda.",
    },
    {
        id:"j3", title:"Backend Engineer (Node.js)",
        company:"Tech UZ", companySeed:"tech",
        location:"Remote", type:"remote", salary:"$1500-2500/oy",
        skills:["Node.js","PostgreSQL","Redis","Docker"],
        posted:"1 kun oldin", applicants:52, verified:true, level:"Senior",
        description:"Katta hajmdagi trafik bilan ishlaydigan backend tizimlarini qura oladigan muhandis kerak.",
    },
    {
        id:"j4", title:"Content Creator / Video Editor",
        company:"Nexus Media", companySeed:"nexus",
        location:"Toshkent / Remote", type:"freelance", salary:"Kelishiladi",
        skills:["Video Editing","After Effects","Davinci Resolve","Storytelling"],
        posted:"2 kun oldin", applicants:87, verified:true, level:"Junior",
        description:"Kreativ video kontent yaratib, auditoriyani kengaytirishga yordam beradigan kreator izlanmoqda.",
    },
    {
        id:"j5", title:"Marketing Manager",
        company:"Startup UZ", companySeed:"startup",
        location:"Toshkent", type:"full", salary:"$900-1500/oy",
        skills:["Digital Marketing","SEO","SMM","Analytics"],
        posted:"3 kun oldin", applicants:23, verified:false, level:"Middle",
        description:"Raqamli marketing strategiyalarini ishlab chiqib, brendning o'sishiga hissa qo'shadigan mutaxassis kerak.",
    },
    {
        id:"j6", title:"Mobile Developer (React Native)",
        company:"App Factory UZ", companySeed:"appfactory",
        location:"Remote", type:"remote", salary:"$1000-1800/oy",
        skills:["React Native","iOS","Android","Firebase"],
        posted:"5 kun oldin", applicants:41, verified:true, level:"Middle",
        description:"iOS va Android uchun React Native dasturlari yaratish bo'yicha tajribali dasturchi izlanmoqda.",
    },
];

const TYPE_LABELS = { full: "To'liq vaqt", part: "Yarim vaqt", remote: "Masofaviy", freelance: "Frilanser" };
const TYPE_COLORS = { full: "#10B981", part: "#F59E0B", remote: "#2B3EE8", freelance: "#8B5CF6" };
const LEVELS = ["Hammasi", "Junior", "Middle", "Senior", "Lead"] as const;

// ─────────────────────────────────────────────────────────────────────────────
// Job Detail
// ─────────────────────────────────────────────────────────────────────────────
function JobDetail({ job, onBack }: { job: Job; onBack: () => void }) {
    const [applied,  setApplied]  = useState(false);
    const [saved,    setSaved]    = useState(job.saved ?? false);

    return (
        <div className="flex flex-col h-full">
            {/* Header */}
            <div className="flex items-center gap-3 px-5 pt-5 pb-3 flex-shrink-0">
                <button onClick={onBack}
                    className="w-8 h-8 flex items-center justify-center rounded-full"
                    style={{ background: "rgba(43,62,232,0.12)", border: "1px solid rgba(43,62,232,0.22)" }}>
                    <ArrowLeft className="w-4 h-4 text-white" />
                </button>
                <p className="text-[10px] font-black uppercase tracking-widest flex-1"
                    style={{ color: "rgba(43,62,232,0.55)" }}>Ish o'rni</p>
                <button onClick={() => setSaved(s => !s)}>
                    <Bookmark className="w-5 h-5 transition-colors duration-200"
                        style={{ color: saved ? "#00CEC8" : "rgba(100,120,170,0.60)", fill: saved ? "#00CEC8" : "none" }} />
                </button>
            </div>

            <div className="flex-1 overflow-y-auto" style={{ scrollbarWidth: "none" }}>
                <div className="px-5">
                    {/* Company */}
                    <div className="flex items-center gap-3 mb-4">
                        <div className="w-14 h-14 rounded-2xl overflow-hidden flex-shrink-0 bg-white"
                            style={{ border: "2px solid rgba(43,62,232,0.30)" }}>
                            <img src={`https://api.dicebear.com/9.x/identicon/svg?seed=${job.companySeed}`} alt={job.company} className="w-full h-full" />
                        </div>
                        <div>
                            <div className="flex items-center gap-1.5">
                                <p className="text-sm font-black text-white">{job.company}</p>
                                {job.verified && <BadgeCheck className="w-3.5 h-3.5" style={{ color: "#00CEC8" }} />}
                            </div>
                            <div className="flex items-center gap-1 mt-0.5">
                                <MapPin className="w-3 h-3" style={{ color: "rgba(43,62,232,0.70)" }} />
                                <span className="text-[10px]" style={{ color: "rgba(80,100,150,0.80)" }}>{job.location}</span>
                            </div>
                        </div>
                    </div>

                    {/* Title */}
                    <h2 className="text-xl font-black text-white leading-snug mb-3">{job.title}</h2>

                    {/* Meta chips */}
                    <div className="flex flex-wrap gap-2 mb-4">
                        <span className="px-3 py-1.5 rounded-xl text-[10px] font-black"
                            style={{ background: `${TYPE_COLORS[job.type]}22`, color: TYPE_COLORS[job.type], border: `1px solid ${TYPE_COLORS[job.type]}40` }}>
                            {TYPE_LABELS[job.type]}
                        </span>
                        <span className="px-3 py-1.5 rounded-xl text-[10px] font-black"
                            style={{ background: "rgba(245,158,11,0.15)", color: "#F59E0B", border: "1px solid rgba(245,158,11,0.30)" }}>
                            {job.level}
                        </span>
                        <span className="px-3 py-1.5 rounded-xl text-[10px] font-black"
                            style={{ background: "rgba(16,185,129,0.15)", color: "#10B981", border: "1px solid rgba(16,185,129,0.30)" }}>
                            {job.salary}
                        </span>
                    </div>

                    {/* Stats */}
                    <div className="grid grid-cols-3 gap-3 mb-5">
                        {[
                            { icon: Users,      label: "Ariza",   value: `${job.applicants}` },
                            { icon: Clock,      label: "E'lon",   value: job.posted },
                            { icon: TrendingUp, label: "Daraja",  value: job.level  },
                        ].map(({ icon: Icon, label, value }, i) => (
                            <div key={i} className="text-center p-2.5 rounded-xl"
                                style={{ background: "rgba(43,62,232,0.08)", border: "1px solid rgba(43,62,232,0.15)" }}>
                                <Icon className="w-4 h-4 mx-auto mb-1" style={{ color: "#00CEC8" }} />
                                <p className="text-sm font-black text-white">{value}</p>
                                <p className="text-[9px]" style={{ color: "rgba(80,100,150,0.70)" }}>{label}</p>
                            </div>
                        ))}
                    </div>

                    {/* Description */}
                    <div className="mb-5">
                        <p className="text-[9px] font-black uppercase tracking-widest mb-2"
                            style={{ color: "rgba(43,62,232,0.55)" }}>Tavsif</p>
                        <p className="text-sm leading-relaxed" style={{ color: "rgba(160,180,220,0.85)" }}>
                            {job.description}
                        </p>
                    </div>

                    {/* Skills */}
                    <div className="mb-6">
                        <p className="text-[9px] font-black uppercase tracking-widest mb-2"
                            style={{ color: "rgba(43,62,232,0.55)" }}>Kerakli ko'nikmalar</p>
                        <div className="flex flex-wrap gap-2">
                            {job.skills.map(s => (
                                <span key={s} className="px-3 py-1.5 rounded-xl text-xs font-bold"
                                    style={{ background: "rgba(43,62,232,0.12)", border: "1px solid rgba(43,62,232,0.25)", color: "rgba(140,160,220,0.90)" }}>
                                    {s}
                                </span>
                            ))}
                        </div>
                    </div>
                </div>
            </div>

            {/* Apply CTA */}
            <div className="px-5 pb-6 flex-shrink-0" style={{ borderTop: "1px solid rgba(43,62,232,0.12)" }}>
                <button
                    onClick={() => setApplied(true)}
                    className="w-full flex items-center justify-center gap-2 p-4 rounded-2xl text-sm font-black text-white mt-4 transition-all duration-150 active:scale-95"
                    style={applied ? {
                        background: "rgba(16,185,129,0.20)",
                        border: "1px solid rgba(16,185,129,0.40)",
                        color: "#10B981",
                    } : {
                        background: "linear-gradient(135deg,#2B3EE8,#00CEC8)",
                        boxShadow: "0 4px 20px rgba(43,62,232,0.45)",
                    }}
                >
                    {applied ? <><BadgeCheck className="w-4 h-4" /> Ariza yuborildi</> : <><Send className="w-4 h-4" /> Ariza yuborish</>}
                </button>
            </div>
        </div>
    );
}

// ─────────────────────────────────────────────────────────────────────────────
// NxJobs — asosiy panel
// ─────────────────────────────────────────────────────────────────────────────
export function NxJobs() {
    const { jobsOpen, setJobsOpen } = useNxPlayer();
    const [search,  setSearch]  = useState("");
    const [level,   setLevel]   = useState<typeof LEVELS[number]>("Hammasi");
    const [saved,   setSaved]   = useState<Set<string>>(new Set());
    const [detail,  setDetail]  = useState<Job | null>(null);

    if (!jobsOpen) return null;

    const filtered = MOCK_JOBS.filter(j =>
        (level === "Hammasi" || j.level === level) &&
        (j.title.toLowerCase().includes(search.toLowerCase()) ||
         j.company.toLowerCase().includes(search.toLowerCase()) ||
         j.skills.some(s => s.toLowerCase().includes(search.toLowerCase())))
    );

    const toggleSave = (id: string) => {
        setSaved(prev => {
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
                onClick={() => setJobsOpen(false)}
            />

            {/* Modal */}
            <div
                className="fixed inset-x-0 bottom-0 z-[55] flex flex-col rounded-t-3xl overflow-hidden md:inset-x-auto md:inset-y-auto md:top-1/2 md:left-1/2 md:-translate-x-1/2 md:-translate-y-1/2 md:w-[500px] md:max-h-[90vh] md:rounded-3xl"
                style={{
                    background: "rgba(8,12,32,0.98)",
                    border: "1px solid rgba(43,62,232,0.22)",
                    boxShadow: "0 32px 80px rgba(0,0,0,0.70)",
                    maxHeight: "92vh",
                }}
                onClick={e => e.stopPropagation()}
            >
                {detail ? (
                    <JobDetail job={detail} onBack={() => setDetail(null)} />
                ) : (
                    <>
                        {/* Header */}
                        <div className="flex items-center justify-between px-5 pt-5 pb-3 flex-shrink-0">
                            <div className="flex items-center gap-2">
                                <div className="w-8 h-8 rounded-xl flex items-center justify-center"
                                    style={{ background: "linear-gradient(135deg,#2B3EE8,#8B5CF6)" }}>
                                    <Briefcase className="w-4 h-4 text-white" />
                                </div>
                                <div>
                                    <h2 className="text-base font-black text-white leading-tight">Nexus Jobs</h2>
                                    <p className="text-[9px]" style={{ color: "rgba(80,100,150,0.80)" }}>{MOCK_JOBS.length} ish o'rni</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-2">
                                <button
                                    className="px-3 py-1.5 rounded-xl text-[10px] font-black flex items-center gap-1"
                                    style={{ background: "linear-gradient(135deg,#2B3EE8,#8B5CF6)", color: "white" }}
                                >
                                    <Plus className="w-3 h-3" /> E'lon
                                </button>
                                <button
                                    onClick={() => setJobsOpen(false)}
                                    className="w-8 h-8 flex items-center justify-center rounded-full"
                                    style={{ background: "rgba(43,62,232,0.12)", border: "1px solid rgba(43,62,232,0.22)" }}
                                >
                                    <X className="w-4 h-4 text-white" />
                                </button>
                            </div>
                        </div>

                        {/* Search */}
                        <div className="px-5 pb-3 flex-shrink-0">
                            <div className="relative">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 pointer-events-none"
                                    style={{ color: "rgba(43,62,232,0.50)" }} />
                                <input
                                    type="text"
                                    placeholder="Lavozim, kompaniya yoki ko'nikma..."
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

                        {/* Level filter */}
                        <div className="px-5 pb-3 flex gap-2 flex-shrink-0 overflow-x-auto" style={{ scrollbarWidth: "none" }}>
                            {LEVELS.map(l => (
                                <button key={l}
                                    onClick={() => setLevel(l)}
                                    className="px-3 py-1.5 rounded-xl text-xs font-bold flex-shrink-0 transition-all duration-200"
                                    style={level === l ? {
                                        background: "linear-gradient(135deg,#2B3EE8,#8B5CF6)",
                                        color: "white",
                                    } : {
                                        background: "rgba(43,62,232,0.10)",
                                        border: "1px solid rgba(43,62,232,0.22)",
                                        color: "rgba(140,160,210,0.85)",
                                    }}
                                >{l}</button>
                            ))}
                        </div>

                        {/* Jobs list */}
                        <div className="flex-1 overflow-y-auto px-5 pb-6" style={{ scrollbarWidth: "none" }}>
                            {filtered.length === 0 ? (
                                <div className="text-center py-12">
                                    <Briefcase className="w-10 h-10 mx-auto mb-3" style={{ color: "rgba(43,62,232,0.30)" }} />
                                    <p className="text-sm" style={{ color: "rgba(80,100,150,0.70)" }}>Ish o'rni topilmadi</p>
                                </div>
                            ) : (
                                <div className="flex flex-col gap-3">
                                    {filtered.map(job => (
                                        <button key={job.id}
                                            onClick={() => setDetail(job)}
                                            className="text-left p-4 rounded-2xl transition-all duration-200 group"
                                            style={{ background: "rgba(11,18,40,0.60)", border: "1px solid rgba(43,62,232,0.18)" }}
                                            onMouseEnter={e => (e.currentTarget as HTMLElement).style.borderColor = "rgba(43,62,232,0.40)"}
                                            onMouseLeave={e => (e.currentTarget as HTMLElement).style.borderColor = "rgba(43,62,232,0.18)"}
                                        >
                                            <div className="flex items-start gap-3 mb-3">
                                                {/* Company logo */}
                                                <div className="w-11 h-11 rounded-xl overflow-hidden flex-shrink-0 bg-white"
                                                    style={{ border: "1px solid rgba(43,62,232,0.25)" }}>
                                                    <img src={`https://api.dicebear.com/9.x/identicon/svg?seed=${job.companySeed}`} alt={job.company} className="w-full h-full" />
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <h3 className="text-sm font-black text-white leading-tight mb-0.5 group-hover:text-[#00CEC8] transition-colors duration-150">
                                                        {job.title}
                                                    </h3>
                                                    <div className="flex items-center gap-1.5">
                                                        <Building2 className="w-3 h-3 flex-shrink-0" style={{ color: "rgba(43,62,232,0.70)" }} />
                                                        <span className="text-[10px]" style={{ color: "rgba(100,120,170,0.80)" }}>{job.company}</span>
                                                        {job.verified && <BadgeCheck className="w-3 h-3" style={{ color: "#00CEC8" }} />}
                                                    </div>
                                                </div>
                                                {/* Save */}
                                                <button
                                                    onClick={e => { e.stopPropagation(); toggleSave(job.id); }}
                                                    className="w-8 h-8 flex items-center justify-center rounded-xl flex-shrink-0 transition-all duration-150"
                                                    style={{ background: "rgba(43,62,232,0.10)" }}
                                                >
                                                    <Bookmark className="w-3.5 h-3.5"
                                                        style={{ color: saved.has(job.id) ? "#00CEC8" : "rgba(80,100,150,0.60)", fill: saved.has(job.id) ? "#00CEC8" : "none" }} />
                                                </button>
                                            </div>

                                            {/* Meta */}
                                            <div className="flex flex-wrap gap-1.5 mb-3">
                                                <span className="px-2 py-0.5 rounded-lg text-[9px] font-black"
                                                    style={{ background: `${TYPE_COLORS[job.type]}22`, color: TYPE_COLORS[job.type] }}>
                                                    {TYPE_LABELS[job.type]}
                                                </span>
                                                <span className="px-2 py-0.5 rounded-lg text-[9px] font-black"
                                                    style={{ background: "rgba(245,158,11,0.15)", color: "#F59E0B" }}>
                                                    {job.level}
                                                </span>
                                                <span className="px-2 py-0.5 rounded-lg text-[9px] font-bold"
                                                    style={{ background: "rgba(43,62,232,0.12)", color: "rgba(140,160,210,0.85)" }}>
                                                    {job.location}
                                                </span>
                                            </div>

                                            {/* Skills row */}
                                            <div className="flex gap-1.5 flex-wrap mb-3">
                                                {job.skills.slice(0, 3).map(s => (
                                                    <span key={s} className="px-2 py-0.5 rounded-lg text-[9px] font-bold"
                                                        style={{ background: "rgba(43,62,232,0.08)", color: "rgba(100,140,220,0.80)", border: "1px solid rgba(43,62,232,0.18)" }}>
                                                        {s}
                                                    </span>
                                                ))}
                                            </div>

                                            {/* Footer */}
                                            <div className="flex items-center justify-between">
                                                <div className="flex items-center gap-3">
                                                    <span className="flex items-center gap-1 text-[10px]" style={{ color: "rgba(16,185,129,0.80)" }}>
                                                        <DollarSign className="w-3 h-3" />{job.salary}
                                                    </span>
                                                    <span className="text-[10px]" style={{ color: "rgba(80,100,150,0.70)" }}>
                                                        {job.applicants} ariza · {job.posted}
                                                    </span>
                                                </div>
                                                <ChevronRight className="w-4 h-4" style={{ color: "rgba(43,62,232,0.50)" }} />
                                            </div>
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>
                    </>
                )}
            </div>
        </>
    );
}
