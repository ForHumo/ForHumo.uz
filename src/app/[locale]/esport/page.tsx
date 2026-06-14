import { setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/routing";
import { Gamepad2, User, Users, BarChart3, ShieldHalf, ChevronRight, Home, Trophy, ArrowLeftRight } from "lucide-react";

const ACCENT = "linear-gradient(135deg,#2B3EE8,#00CEC8)";
const card = { background: "rgba(10,16,34,0.72)", border: "1px solid rgba(43,62,232,0.20)" };

const items = [
    { href: "/esport/athlete", icon: User, title: "Sportchi", desc: "Sportchi profili yarating" },
    { href: "/esport/teams", icon: Users, title: "Jamoalar", desc: "Jamoa tuzing yoki qo'shiling" },
    { href: "/esport/tournaments", icon: Trophy, title: "Turnirlar", desc: "Kubok, bracket va yutuq" },
    { href: "/esport/standings", icon: BarChart3, title: "Divizionlar", desc: "Jadval va reyting" },
    { href: "/esport/transfers", icon: ArrowLeftRight, title: "Transfer", desc: "Sportchi oldi-sotdi (ALKH Pay)" },
    { href: "/esport/admin", icon: ShieldHalf, title: "Admin", desc: "Liga boshqaruvi (faqat admin)" },
] as const;

export default async function EsportPage({ params }: { params: Promise<{ locale: string }> }) {
    const { locale } = await params;
    setRequestLocale(locale);
    return (
        <main className="fixed inset-0 z-[100] overflow-y-auto" style={{ background: "linear-gradient(160deg,#060A18 0%,#0B1226 55%,#0A0F22 100%)" }}>
            <div className="mx-auto w-full max-w-lg px-5 py-10">
                <div className="mb-8 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="flex h-12 w-12 items-center justify-center rounded-2xl" style={{ background: ACCENT }}><Gamepad2 className="h-6 w-6 text-white" /></div>
                        <div>
                            <h1 className="text-2xl font-black text-white">Humo eSport</h1>
                            <p className="text-xs font-semibold text-white/45">Kibersport ekotizimi</p>
                        </div>
                    </div>
                    <Link href="/" className="flex h-9 w-9 items-center justify-center rounded-xl" style={{ background: "rgba(43,62,232,0.18)", border: "1px solid rgba(43,62,232,0.30)" }}><Home className="h-4 w-4 text-white/80" /></Link>
                </div>

                <div className="space-y-3">
                    {items.map(it => (
                        <Link key={it.href} href={it.href} className="flex items-center gap-4 rounded-3xl p-5" style={card}>
                            <div className="flex h-12 w-12 items-center justify-center rounded-2xl" style={{ background: "rgba(43,62,232,0.18)", border: "1px solid rgba(43,62,232,0.30)" }}>
                                <it.icon className="h-5 w-5 text-[#00CEC8]" />
                            </div>
                            <div className="flex-1">
                                <p className="text-base font-black text-white">{it.title}</p>
                                <p className="text-xs font-semibold text-white/45">{it.desc}</p>
                            </div>
                            <ChevronRight className="h-5 w-5 text-white/25" />
                        </Link>
                    ))}
                </div>
            </div>
        </main>
    );
}
