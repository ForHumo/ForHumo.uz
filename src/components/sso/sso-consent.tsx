"use client";

import { useState } from "react";
import { useSession, signIn } from "next-auth/react";
import { Link } from "@/i18n/routing";
import { ShieldCheck, User, Mail, BadgeCheck, Loader2, LogIn, Check, X } from "lucide-react";

const SCOPE_INFO: Record<string, { icon: typeof User; label: string; desc: string }> = {
    profile: { icon: User, label: "Profil", desc: "Ism, username, rasm, Humo ID" },
    email: { icon: Mail, label: "Email", desc: "Email manzilingiz" },
    nexus: { icon: BadgeCheck, label: "Nexus", desc: "Tasdiq holati, kuzatuvchi soni" },
};

export function SsoConsent({
    clientId, clientName, redirectUri, scope, scopes, state,
}: {
    clientId: string; clientName: string; redirectUri: string; scope: string; scopes: string[]; state: string;
}) {
    const { data: session, status } = useSession();
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const here = typeof window !== "undefined" ? window.location.href : "";

    async function approve() {
        if (busy) return;
        setBusy(true); setError(null);
        try {
            const res = await fetch("/api/sso/authorize", {
                method: "POST", headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ clientId, redirectUri, scope, state }),
            });
            const d = await res.json();
            if (!res.ok) { setError(d.error || "Xatolik"); setBusy(false); return; }
            window.location.href = d.redirectUrl;
        } catch {
            setError("Tarmoq xatosi"); setBusy(false);
        }
    }

    function deny() {
        const url = new URL(redirectUri);
        url.searchParams.set("error", "access_denied");
        if (state) url.searchParams.set("state", state);
        window.location.href = url.toString();
    }

    const hostname = (() => { try { return new URL(redirectUri).hostname; } catch { return redirectUri; } })();

    return (
        <div className="min-h-screen flex items-center justify-center px-6 py-10" style={{ background: "#050818" }}>
            <div className="w-full max-w-sm rounded-3xl overflow-hidden" style={{ background: "rgba(11,18,40,0.75)", border: "1px solid rgba(43,62,232,0.25)", boxShadow: "0 24px 64px rgba(0,0,0,0.6)" }}>
                {/* Sarlavha */}
                <div className="px-6 pt-7 pb-5 text-center" style={{ borderBottom: "1px solid rgba(43,62,232,0.14)" }}>
                    <div className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-3" style={{ background: "linear-gradient(135deg,#2B3EE8,#00CEC8)", boxShadow: "0 8px 28px rgba(43,62,232,0.4)" }}>
                        <ShieldCheck className="w-7 h-7 text-white" />
                    </div>
                    <h1 className="text-lg font-black text-white"><span style={{ color: "#00CEC8" }}>{clientName}</span> kirish so&apos;ramoqda</h1>
                    <p className="text-xs mt-1" style={{ color: "rgba(120,140,185,0.8)" }}>Humo ID hisobingiz bilan</p>
                </div>

                {status === "loading" ? (
                    <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin" style={{ color: "#2B3EE8" }} /></div>
                ) : !session ? (
                    /* Kirish kerak */
                    <div className="px-6 py-7 text-center">
                        <p className="text-sm" style={{ color: "rgba(200,215,245,0.85)" }}>Davom etish uchun Humo ID&apos;ga kiring</p>
                        <button onClick={() => signIn("google", { callbackUrl: here })}
                            className="mt-4 w-full flex items-center justify-center gap-2 py-3.5 rounded-2xl text-sm font-black text-white active:scale-[0.99] transition"
                            style={{ background: "linear-gradient(135deg,#2B3EE8,#00CEC8)" }}>
                            <LogIn className="w-4 h-4" /> Google bilan kirish
                        </button>
                    </div>
                ) : (
                    <div className="px-6 py-5">
                        {/* Joriy hisob */}
                        <div className="flex items-center gap-3 p-3 rounded-2xl mb-4" style={{ background: "rgba(43,62,232,0.08)", border: "1px solid rgba(43,62,232,0.18)" }}>
                            <img src={session.user?.image || `https://api.dicebear.com/9.x/avataaars/svg?seed=${encodeURIComponent(session.user?.email || "u")}`} alt="" className="w-10 h-10 rounded-xl object-cover bg-white" referrerPolicy="no-referrer" />
                            <div className="min-w-0">
                                <p className="text-sm font-bold text-white truncate">{session.user?.name}</p>
                                <p className="text-[11px] truncate" style={{ color: "rgba(120,140,185,0.8)" }}>{session.user?.email}</p>
                            </div>
                        </div>

                        <p className="text-[11px] font-bold mb-2" style={{ color: "rgba(150,170,210,0.85)" }}>{clientName} quyidagilarni oladi:</p>
                        <div className="space-y-1.5 mb-4">
                            {scopes.map(s => {
                                const info = SCOPE_INFO[s]; if (!info) return null;
                                const Icon = info.icon;
                                return (
                                    <div key={s} className="flex items-start gap-2.5 p-2.5 rounded-xl" style={{ background: "rgba(5,8,24,0.45)" }}>
                                        <Icon className="w-4 h-4 mt-0.5 flex-shrink-0" style={{ color: "#00CEC8" }} />
                                        <div>
                                            <p className="text-xs font-bold text-white">{info.label}</p>
                                            <p className="text-[10px]" style={{ color: "rgba(120,140,185,0.75)" }}>{info.desc}</p>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>

                        <p className="text-[10px] text-center mb-3" style={{ color: "rgba(100,120,170,0.7)" }}>
                            Yo&apos;naltiriladi: <span className="font-mono">{hostname}</span>
                        </p>
                        {error && <p className="text-xs font-bold text-center mb-2" style={{ color: "#EF4444" }}>{error}</p>}

                        <div className="flex gap-2">
                            <button onClick={deny} disabled={busy}
                                className="flex-1 flex items-center justify-center gap-1.5 py-3 rounded-2xl text-sm font-black disabled:opacity-50"
                                style={{ background: "rgba(43,62,232,0.08)", border: "1px solid rgba(43,62,232,0.2)", color: "rgba(160,180,230,0.9)" }}>
                                <X className="w-4 h-4" /> Rad etish
                            </button>
                            <button onClick={approve} disabled={busy}
                                className="flex-1 flex items-center justify-center gap-1.5 py-3 rounded-2xl text-sm font-black text-white disabled:opacity-50 active:scale-[0.99] transition"
                                style={{ background: "linear-gradient(135deg,#2B3EE8,#00CEC8)", boxShadow: "0 4px 18px rgba(43,62,232,0.35)" }}>
                                {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />} Ruxsat berish
                            </button>
                        </div>
                        <p className="text-[10px] text-center mt-3" style={{ color: "rgba(100,120,170,0.6)" }}>
                            <Link href="/id" className="underline">Humo ID</Link> sozlamalaringizdan istalgan vaqt boshqarishingiz mumkin
                        </p>
                    </div>
                )}
            </div>
        </div>
    );
}
