import { setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/routing";
import { User, Users, BarChart3, ShieldHalf, Trophy, ArrowLeftRight, Home, ChevronRight } from "lucide-react";

const items = [
    { href: "/esport/athlete", icon: User, title: "SPORTCHI", desc: "Sportchi profili yarating", tag: "01" },
    { href: "/esport/teams", icon: Users, title: "JAMOALAR", desc: "Jamoa tuzing yoki qo'shiling", tag: "02" },
    { href: "/esport/tournaments", icon: Trophy, title: "TURNIRLAR", desc: "Kubok, bracket va yutuq", tag: "03" },
    { href: "/esport/standings", icon: BarChart3, title: "DIVIZIONLAR", desc: "Jadval va Elo reyting", tag: "04" },
    { href: "/esport/transfers", icon: ArrowLeftRight, title: "TRANSFER", desc: "Sportchi oldi-sotdi · ALKH Pay", tag: "05" },
    { href: "/esport/admin", icon: ShieldHalf, title: "ADMIN", desc: "Liga boshqaruvi", tag: "06" },
] as const;

export default async function EsportPage({ params }: { params: Promise<{ locale: string }> }) {
    const { locale } = await params;
    setRequestLocale(locale);
    return (
        <main className="fixed inset-0 z-[100] overflow-y-auto" style={{ background: "#04060E" }}>
            <style>{`
                @keyframes esPulse { 0%,100%{opacity:.5;transform:scale(1)} 50%{opacity:.9;transform:scale(1.08)} }
                @keyframes esDrift { 0%,100%{transform:translate(0,0)} 50%{transform:translate(20px,-18px)} }
                @keyframes esSheen { 0%{background-position:-200% 0} 100%{background-position:200% 0} }
                @keyframes esRise { from{opacity:0;transform:translateY(14px)} to{opacity:1;transform:translateY(0)} }
                .es-card{ animation:esRise .5s both; }
                .es-card:hover .es-ico{ box-shadow:0 0 28px rgba(0,194,255,.55); }
                .es-card:hover{ border-color:rgba(0,194,255,.55); transform:translateY(-3px); }
                .es-card{ transition:transform .2s, border-color .2s; }
            `}</style>

            {/* ── Atmosfera ── */}
            <div className="pointer-events-none absolute inset-0 overflow-hidden">
                <div style={{ position: "absolute", top: "-15%", left: "8%", width: "44rem", height: "44rem", background: "radial-gradient(circle, rgba(0,150,255,.20), transparent 68%)", filter: "blur(50px)", animation: "esDrift 14s ease-in-out infinite" }} />
                <div style={{ position: "absolute", bottom: "-20%", right: "0%", width: "40rem", height: "40rem", background: "radial-gradient(circle, rgba(0,212,255,.14), transparent 70%)", filter: "blur(60px)", animation: "esPulse 9s ease-in-out infinite" }} />
                <div style={{ position: "absolute", inset: 0, backgroundImage: "linear-gradient(rgba(60,140,220,.05) 1px,transparent 1px),linear-gradient(90deg,rgba(60,140,220,.05) 1px,transparent 1px)", backgroundSize: "52px 52px", maskImage: "radial-gradient(ellipse 75% 55% at 50% 25%, #000 35%, transparent 78%)", WebkitMaskImage: "radial-gradient(ellipse 75% 55% at 50% 25%, #000 35%, transparent 78%)" }} />
            </div>

            <div className="relative mx-auto w-full max-w-5xl px-5 py-10 sm:px-8 sm:py-16">
                {/* Home */}
                <div className="mb-10 flex justify-end">
                    <Link href="/" className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/10 bg-white/[0.03] backdrop-blur transition-colors hover:border-[#00C2FF]/50"><Home className="h-4 w-4 text-white/70" /></Link>
                </div>

                {/* ── Hero ── */}
                <div className="mb-14 flex flex-col items-center text-center">
                    {/* Emblem */}
                    <div className="relative mb-6" style={{ animation: "esRise .6s both" }}>
                        <div style={{ position: "absolute", inset: "-30%", background: "radial-gradient(circle, rgba(0,194,255,.35), transparent 65%)", filter: "blur(28px)", animation: "esPulse 5s ease-in-out infinite" }} />
                        <svg width="108" height="108" viewBox="0 0 100 100" className="relative">
                            <defs>
                                <linearGradient id="chrome" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="0%" stopColor="#ffffff" /><stop offset="45%" stopColor="#cfe2f5" /><stop offset="55%" stopColor="#7e97b3" /><stop offset="100%" stopColor="#dcebfb" />
                                </linearGradient>
                                <linearGradient id="wing" x1="0" y1="0" x2="1" y2="1">
                                    <stop offset="0%" stopColor="#5fd0ff" /><stop offset="100%" stopColor="#0a6cff" />
                                </linearGradient>
                            </defs>
                            <polygon points="50,4 92,27 92,73 50,96 8,73 8,27" fill="none" stroke="url(#wing)" strokeWidth="2" opacity="0.7" />
                            <polygon points="50,12 85,31 85,69 50,88 15,69 15,31" fill="rgba(8,18,38,0.6)" stroke="rgba(0,194,255,0.25)" strokeWidth="1" />
                            <text x="50" y="68" textAnchor="middle" fontSize="52" fontWeight="900" fontFamily="Arial, sans-serif" fill="url(#chrome)">H</text>
                        </svg>
                    </div>

                    <h1 className="text-4xl font-black leading-none tracking-tight sm:text-6xl" style={{ background: "linear-gradient(180deg,#ffffff 0%,#cfe0f2 45%,#7e97b3 78%,#aebfd2 100%)", WebkitBackgroundClip: "text", backgroundClip: "text", color: "transparent", animation: "esRise .6s both .05s" }}>
                        HUMO ESPORT
                    </h1>
                    <p className="mt-3 text-xs font-bold uppercase tracking-[0.35em] text-[#00C2FF]/80 sm:text-sm" style={{ animation: "esRise .6s both .12s" }}>Kibersport Ekotizimi</p>
                    <div className="mt-5 h-px w-40 sm:w-64" style={{ background: "linear-gradient(90deg,transparent,#00C2FF,transparent)", animation: "esRise .6s both .15s" }} />
                </div>

                {/* ── Kartalar ── */}
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    {items.map((it, i) => (
                        <Link key={it.href} href={it.href}
                            className="es-card group relative block overflow-hidden p-5"
                            style={{
                                animationDelay: `${0.12 + i * 0.06}s`,
                                background: "linear-gradient(155deg, rgba(14,26,50,0.85), rgba(7,13,28,0.92))",
                                border: "1px solid rgba(60,120,200,0.22)",
                                clipPath: "polygon(0 0, calc(100% - 16px) 0, 100% 16px, 100% 100%, 16px 100%, 0 calc(100% - 16px))",
                            }}>
                            {/* corner sheen */}
                            <div className="pointer-events-none absolute right-0 top-0 h-16 w-16" style={{ background: "linear-gradient(225deg, rgba(0,194,255,0.18), transparent 70%)" }} />
                            <span className="absolute right-4 top-3 text-[11px] font-black tracking-widest text-white/15">{it.tag}</span>

                            <div className="es-ico mb-4 flex h-12 w-12 items-center justify-center transition-shadow"
                                style={{ background: "linear-gradient(135deg,#0a6cff,#00d4ff)", clipPath: "polygon(0 0, calc(100% - 8px) 0, 100% 8px, 100% 100%, 8px 100%, 0 calc(100% - 8px))" }}>
                                <it.icon className="h-6 w-6 text-white" />
                            </div>
                            <p className="text-base font-black uppercase tracking-wide text-white">{it.title}</p>
                            <p className="mt-1 text-xs font-semibold text-white/45">{it.desc}</p>
                            <ChevronRight className="absolute bottom-4 right-4 h-4 w-4 text-white/20 transition-transform group-hover:translate-x-1 group-hover:text-[#00C2FF]" />
                        </Link>
                    ))}
                </div>
            </div>
        </main>
    );
}
