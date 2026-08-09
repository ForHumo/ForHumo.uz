"use client";

import { useState, useEffect } from "react";
import { Link, useRouter } from "@/i18n/routing";
import {
    ArrowLeft, Loader2, Users, Star, Coins, Gift, ShoppingBag,
    Film, Music2, FileText, Radio, TrendingUp, Wallet,
} from "lucide-react";
import { formatMoney, type Currency } from "@/lib/money";

interface AnalyticsExtra { currency: "UZS" | "USD" }
interface Analytics extends AnalyticsExtra {
    subPriceEnabled: boolean;
    audience: { followers: number; subscribers: number; subMonthly: number };
    earnings: { tips: number; videoSales: number; subMonthly: number; total: number };
    content: { videos: number; videoViews: number; videoLikes: number; tracks: number; trackPlays: number; posts: number; postLikes: number; lives: number };
    recentTips: { id: string; amount: number; message: string | null; targetType: string; createdAt: string; donor: { name: string | null; username: string | null; image: string | null } | null }[];
}

function fmtN(n: number) {
    if (n >= 1_000_000) return (n / 1_000_000).toFixed(1).replace(/\.0$/, "") + "M";
    if (n >= 1_000) return (n / 1_000).toFixed(1).replace(/\.0$/, "") + "K";
    return String(n);
}
function avatarOf(a: { username?: string | null; name?: string | null; image?: string | null } | null) {
    return a?.image || `https://api.dicebear.com/9.x/avataaars/svg?seed=${encodeURIComponent(a?.username || a?.name || "u")}`;
}
function timeAgo(d: string) {
    const m = Math.floor((Date.now() - new Date(d).getTime()) / 60000);
    if (m < 1) return "hozir"; if (m < 60) return `${m} daq`;
    const h = Math.floor(m / 60); if (h < 24) return `${h} soat`;
    return new Date(d).toLocaleDateString("uz-UZ");
}

export function NexusAnalytics() {
    const router = useRouter();
    const [data, setData] = useState<Analytics | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetch("/api/nexus/analytics").then(r => r.json())
            .then(d => { if (!d.error) setData(d); })
            .finally(() => setLoading(false));
    }, []);

    return (
        <div className="h-full overflow-y-auto text-white" style={{ background: "#050818" }}>
            <header className="sticky top-0 z-20 flex items-center gap-3 px-3 h-14 backdrop-blur-xl"
                style={{ background: "rgba(5,8,24,0.80)", borderBottom: "1px solid rgba(43,62,232,0.18)" }}>
                <button onClick={() => router.back()} className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: "rgba(43,62,232,0.12)" }}>
                    <ArrowLeft className="w-4 h-4 text-white" />
                </button>
                <div className="flex items-center gap-2">
                    <TrendingUp className="w-4 h-4" style={{ color: "#00CEC8" }} />
                    <span className="text-sm font-black text-white">Ijodkor analitikasi</span>
                </div>
            </header>

            {loading ? (
                <div className="flex justify-center py-24"><Loader2 className="w-8 h-8 animate-spin" style={{ color: "#2B3EE8" }} /></div>
            ) : !data ? (
                <div className="flex flex-col items-center py-24 px-6 text-center">
                    <p className="text-sm font-bold text-white/70">Ma&apos;lumot yuklanmadi</p>
                    <Link href="/nexus" className="mt-4 px-5 py-2.5 rounded-xl text-xs font-black text-white" style={{ background: "linear-gradient(135deg,#2B3EE8,#00CEC8)" }}>Nexus&apos;ga qaytish</Link>
                </div>
            ) : (
                <div className="px-4 py-4 pb-28 max-w-2xl mx-auto">
                    {/* Daromad — bosh karta */}
                    <div className="rounded-3xl p-5 mb-4" style={{ background: "linear-gradient(135deg, rgba(43,62,232,0.18), rgba(0,206,200,0.12))", border: "1px solid rgba(0,206,200,0.25)" }}>
                        <p className="text-[11px] font-bold flex items-center gap-1.5" style={{ color: "rgba(180,200,240,0.85)" }}><Wallet className="w-3.5 h-3.5" />Jami daromad (bir martalik)</p>
                        <p className="text-3xl font-black mt-1" style={{ color: "#fff" }}>{formatMoney(data.earnings.total, data.currency)}</p>
                        {data.earnings.subMonthly > 0 && (
                            <p className="text-xs mt-1.5 flex items-center gap-1" style={{ color: "rgba(196,181,253,0.95)" }}>
                                <Star className="w-3 h-3" style={{ color: "#8B5CF6" }} />+ {formatMoney(data.earnings.subMonthly, data.currency)}/oy obunadan (takrorlanuvchi)
                            </p>
                        )}
                        <div className="grid grid-cols-3 gap-2 mt-4">
                            <EarnCell icon={Gift} color="#F59E0B" label="Tip" value={data.earnings.tips} currency={data.currency} />
                            <EarnCell icon={ShoppingBag} color="#10B981" label="Video sotuv" value={data.earnings.videoSales} currency={data.currency} />
                            <EarnCell icon={Star} color="#8B5CF6" label="Obuna/oy" value={data.earnings.subMonthly} currency={data.currency} />
                        </div>
                    </div>

                    {/* Auditoriya */}
                    <p className="text-[11px] font-black uppercase tracking-widest mb-2 px-1" style={{ color: "rgba(43,62,232,0.6)" }}>Auditoriya</p>
                    <div className="grid grid-cols-2 gap-2.5 mb-4">
                        <StatCard icon={Users} color="#2B3EE8" label="Kuzatuvchilar" value={data.audience.followers} />
                        <StatCard icon={Star} color="#8B5CF6" label="Obunachilar" value={data.audience.subscribers} />
                    </div>

                    {/* Kontent */}
                    <p className="text-[11px] font-black uppercase tracking-widest mb-2 px-1" style={{ color: "rgba(43,62,232,0.6)" }}>Kontent</p>
                    <div className="grid grid-cols-2 gap-2.5 mb-4">
                        <StatCard icon={Film} color="#EF4444" label="Videolar" value={data.content.videos} sub={`${fmtN(data.content.videoViews)} ko'rish · ${fmtN(data.content.videoLikes)} like`} />
                        <StatCard icon={Music2} color="#10B981" label="Audio" value={data.content.tracks} sub={`${fmtN(data.content.trackPlays)} tinglash`} />
                        <StatCard icon={FileText} color="#2B3EE8" label="Postlar" value={data.content.posts} sub={`${fmtN(data.content.postLikes)} like`} />
                        <StatCard icon={Radio} color="#F97316" label="Jonli efirlar" value={data.content.lives} />
                    </div>

                    {/* So'nggi qo'llab-quvvatlashlar */}
                    {data.recentTips.length > 0 && (
                        <>
                            <p className="text-[11px] font-black uppercase tracking-widest mb-2 px-1" style={{ color: "rgba(43,62,232,0.6)" }}>So&apos;nggi qo&apos;llab-quvvatlashlar</p>
                            <div className="flex flex-col gap-1.5">
                                {data.recentTips.map(t => (
                                    <div key={t.id} className="flex items-center gap-3 p-2.5 rounded-2xl" style={{ background: "rgba(11,18,40,0.55)", border: "1px solid rgba(245,158,11,0.16)" }}>
                                        <img src={avatarOf(t.donor)} alt="" className="w-9 h-9 rounded-xl object-cover bg-white flex-shrink-0" />
                                        <div className="flex-1 min-w-0">
                                            <p className="text-sm font-bold text-white truncate">{t.donor?.name || t.donor?.username || "Foydalanuvchi"}</p>
                                            {t.message && <p className="text-[11px] truncate" style={{ color: "rgba(120,140,185,0.8)" }}>{t.message}</p>}
                                        </div>
                                        <div className="text-right flex-shrink-0">
                                            <p className="text-sm font-black" style={{ color: "#F59E0B" }}>{formatMoney(t.amount, data.currency)}</p>
                                            <p className="text-[10px]" style={{ color: "rgba(100,120,170,0.7)" }}>{timeAgo(t.createdAt)}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </>
                    )}

                    {/* Pul yechish — kelajak (test rejim) */}
                    <div className="mt-5 rounded-2xl px-4 py-3 flex items-center gap-2.5" style={{ background: "rgba(43,62,232,0.06)", border: "1px solid rgba(43,62,232,0.16)" }}>
                        <Coins className="w-4 h-4 flex-shrink-0" style={{ color: "rgba(120,140,185,0.7)" }} />
                        <p className="text-[11px]" style={{ color: "rgba(150,170,210,0.8)" }}>
                            Daromad <span className="font-bold text-white">For Pay</span> hamyoningizda. Real pulga yechish keyingi bosqichda ulanadi.
                        </p>
                    </div>
                </div>
            )}
        </div>
    );
}

function EarnCell({ icon: Icon, color, label, value, currency }: { icon: typeof Gift; color: string; label: string; value: number; currency: Currency }) {
    return (
        <div className="rounded-xl px-2.5 py-2" style={{ background: "rgba(5,8,24,0.45)" }}>
            <p className="text-[10px] font-bold flex items-center gap-1" style={{ color: "rgba(150,170,210,0.8)" }}><Icon className="w-3 h-3" style={{ color }} />{label}</p>
            <p className="text-sm font-black text-white mt-0.5">{formatMoney(value, currency)}</p>
        </div>
    );
}

function StatCard({ icon: Icon, color, label, value, sub }: { icon: typeof Users; color: string; label: string; value: number; sub?: string }) {
    return (
        <div className="rounded-2xl px-4 py-3.5" style={{ background: "rgba(11,18,40,0.55)", border: "1px solid rgba(43,62,232,0.16)" }}>
            <div className="flex items-center gap-1.5 mb-1">
                <Icon className="w-3.5 h-3.5" style={{ color }} />
                <span className="text-[11px] font-bold" style={{ color: "rgba(150,170,210,0.85)" }}>{label}</span>
            </div>
            <p className="text-2xl font-black text-white leading-none">{fmtN(value)}</p>
            {sub && <p className="text-[10px] mt-1" style={{ color: "rgba(120,140,185,0.7)" }}>{sub}</p>}
        </div>
    );
}
