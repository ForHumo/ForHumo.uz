"use client";

import { useEffect, useMemo, useState } from "react";
import { Link } from "@/i18n/routing";
import { ArrowLeft, Loader2, ArrowLeftRight, Search, Coins, Gamepad2, TrendingUp, ChevronRight } from "lucide-react";

interface Card {
    id: string; ign: string; position: string | null; game: string | null;
    image: string | null; marketValue: number | null;
    team: { name: string; tag: string; logo: string | null } | null; rating: number | null;
}

function money(n: number | null) { return n == null ? "Belgilanmagan" : `${n.toLocaleString()} so'm`; }

export default function TransfersView() {
    const [loading, setLoading] = useState(true);
    const [list, setList] = useState<Card[]>([]);
    const [q, setQ] = useState("");

    useEffect(() => {
        fetch("/api/esport/athletes").then(r => r.json()).then(d => { setList(d.athletes || []); setLoading(false); }).catch(() => setLoading(false));
    }, []);

    const filtered = useMemo(() => {
        const s = q.trim().toLowerCase();
        if (!s) return list;
        return list.filter(a => a.ign.toLowerCase().includes(s) || (a.team?.name.toLowerCase().includes(s)) || (a.team?.tag.toLowerCase().includes(s)));
    }, [list, q]);

    return (
        <div className="mx-auto w-full max-w-5xl px-4 py-6 sm:px-6 sm:py-8">
            <div className="mb-5 flex items-center gap-3">
                <Link href="/esport" className="flex h-9 w-9 items-center justify-center rounded-xl es-soft"><ArrowLeft className="h-4 w-4 es-fg" /></Link>
                <div className="flex items-center gap-2">
                    <div className="flex h-9 w-9 items-center justify-center rounded-xl es-accent-bg"><ArrowLeftRight className="h-5 w-5 text-white" /></div>
                    <div>
                        <h1 className="text-lg font-black es-fg">Transfer bozori</h1>
                        <p className="text-[11px] es-mut">Barcha kibersportchilar — kartani bosib to'liq ma'lumot</p>
                    </div>
                </div>
            </div>

            {/* Qidiruv */}
            <div className="mb-5 flex items-center gap-2 rounded-2xl px-4 py-2.5 es-soft">
                <Search className="h-4 w-4 es-faint" />
                <input value={q} onChange={e => setQ(e.target.value)} placeholder="Nickname yoki jamoa bo'yicha qidirish"
                    className="w-full bg-transparent text-sm font-semibold es-fg outline-none placeholder:opacity-50" />
            </div>

            {loading ? (
                <div className="flex justify-center py-20"><Loader2 className="h-7 w-7 animate-spin es-faint" /></div>
            ) : filtered.length === 0 ? (
                <div className="rounded-3xl p-10 text-center es-card">
                    <ArrowLeftRight className="mx-auto h-10 w-10 es-faint" />
                    <p className="mt-3 text-sm font-bold es-mut">{q ? "Hech narsa topilmadi" : "Hali kibersportchi yo'q"}</p>
                </div>
            ) : (
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                    {filtered.map(a => (
                        <Link key={a.id} href={`/esport/a/${a.id}`} className="group overflow-hidden rounded-3xl es-card transition-transform hover:scale-[1.02]">
                            {/* Karta yuqori — avatar + Elo */}
                            <div className="relative h-28 es-accent-bg3">
                                <div className="absolute inset-0 opacity-30" style={{ background: "radial-gradient(circle at 70% 20%, rgba(255,255,255,.35), transparent 60%)" }} />
                                {a.rating != null && (
                                    <span className="absolute right-3 top-3 flex items-center gap-1 rounded-full bg-black/35 px-2 py-1 text-[11px] font-black text-white backdrop-blur-sm">
                                        <TrendingUp className="h-3 w-3" /> {a.rating}
                                    </span>
                                )}
                                <div className="absolute -bottom-7 left-4">
                                    {a.image
                                        ? <img src={a.image} alt="" className="h-16 w-16 rounded-2xl object-cover ring-4 ring-[var(--es-card)]" />
                                        : <div className="flex h-16 w-16 items-center justify-center rounded-2xl text-lg font-black text-white ring-4 ring-[var(--es-card)] es-accent-bg">{a.ign.slice(0, 2).toUpperCase()}</div>}
                                </div>
                            </div>
                            <div className="px-4 pb-4 pt-9">
                                <p className="truncate text-base font-black es-fg">{a.ign}</p>
                                <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[11px] es-mut">
                                    {a.team ? <span className="font-bold">[{a.team.tag}] {a.team.name}</span> : <span>Erkin sportchi</span>}
                                </div>
                                <div className="mt-2 flex items-center gap-1.5 text-[11px] font-semibold es-mut">
                                    <Gamepad2 className="h-3.5 w-3.5 es-accent-text" /> {a.game ?? "—"}{a.position ? ` · ${a.position}` : ""}
                                </div>
                                <div className="mt-3 flex items-center justify-between rounded-xl px-3 py-2 es-soft">
                                    <span className="flex items-center gap-1.5 text-xs font-bold es-fg"><Coins className="h-3.5 w-3.5 text-amber-400" /> {money(a.marketValue)}</span>
                                    <ChevronRight className="h-4 w-4 es-faint transition-transform group-hover:translate-x-0.5" />
                                </div>
                            </div>
                        </Link>
                    ))}
                </div>
            )}
        </div>
    );
}
