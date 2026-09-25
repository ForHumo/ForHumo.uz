"use client";

// Havola bilan qo'shilish — preview + Join tugmasi.
// Auth yo'q: "Kirish" tugmasi. Auth bor: darhol qo'shilish.

import { useEffect, useState } from "react";
import Image from "next/image";
import { useRouter } from "@/i18n/routing";
import { useSession, signIn } from "next-auth/react";
import { Loader2, Users, Hash, Check, AlertCircle, ArrowRight, LogIn } from "lucide-react";

interface ChPreview {
    id: string;
    type: "CHANNEL" | "GROUP";
    name: string;
    handle: string | null;
    avatarUrl: string | null;
    description: string | null;
    memberCount: number;
}

export function JoinChannelClient({ code }: { code: string }) {
    const router = useRouter();
    const { status } = useSession();
    const [ch, setCh] = useState<ChPreview | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);
    const [joining, setJoining] = useState(false);

    useEffect(() => {
        fetch(`/api/nexus/invites/${code}`).then(r => r.json().then(d => ({ ok: r.ok, ...d })))
            .then(d => {
                if (!d.ok) setError(d.error || "Havola noto'g'ri");
                else setCh(d.channel);
            })
            .catch(() => setError("Ulanib bo'lmadi"))
            .finally(() => setLoading(false));
    }, [code]);

    async function join() {
        if (status !== "authenticated") { signIn("google"); return; }
        setJoining(true);
        try {
            const r = await fetch(`/api/nexus/invites/${code}`, { method: "POST" });
            const d = await r.json();
            if (r.ok && d.channel?.id) {
                router.push(`/nexus?channel=${d.channel.id}`);
            } else {
                setError(d.error || "Qo'shilib bo'lmadi");
            }
        } finally {
            setJoining(false);
        }
    }

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6"
            style={{ background: "linear-gradient(180deg,var(--nx-bg) 0%,#0A1130 100%)" }}>
            <div className="w-full max-w-sm rounded-3xl p-6"
                style={{ background: "var(--nx-surface)", border: "1px solid rgba(43,62,232,0.30)" }}>
                {loading ? (
                    <div className="flex justify-center py-12">
                        <Loader2 className="w-8 h-8 animate-spin" style={{ color: "var(--nx-accent)" }} />
                    </div>
                ) : error ? (
                    <div className="text-center py-6">
                        <AlertCircle className="w-10 h-10 mx-auto mb-3" style={{ color: "#EF4444" }} />
                        <p className="text-sm font-bold text-[var(--nx-text)]">{error}</p>
                        <button onClick={() => router.push("/nexus")}
                            className="mt-4 text-xs font-bold px-4 py-2 rounded-xl text-[var(--nx-text)]"
                            style={{ background: "rgba(43,62,232,0.20)", border: "1px solid rgba(43,62,232,0.35)" }}>
                            Nexus'ga o'tish
                        </button>
                    </div>
                ) : ch ? (
                    <>
                        <div className="flex flex-col items-center text-center">
                            {ch.avatarUrl ? (
                                <Image src={ch.avatarUrl} alt="" width={80} height={80}
                                    className="w-20 h-20 rounded-3xl object-cover mb-3" unoptimized />
                            ) : (
                                <div className="w-20 h-20 rounded-3xl flex items-center justify-center mb-3"
                                    style={{ background: "var(--nx-accent)" }}>
                                    {ch.type === "GROUP"
                                        ? <Users className="w-8 h-8 text-[var(--nx-text)]" />
                                        : <Hash className="w-8 h-8 text-[var(--nx-text)]" />
                                    }
                                </div>
                            )}
                            <p className="text-[10px] font-black uppercase tracking-wider mb-1"
                                style={{ color: "var(--nx-accent)" }}>
                                {ch.type === "GROUP" ? "Guruh" : "Kanal"}
                            </p>
                            <h1 className="text-lg font-black text-[var(--nx-text)] mb-1">{ch.name}</h1>
                            {ch.handle && (
                                <p className="text-xs" style={{ color: "rgba(140,160,210,0.75)" }}>@{ch.handle}</p>
                            )}
                            <p className="text-[11px] mt-2" style={{ color: "rgba(140,160,210,0.75)" }}>
                                {ch.memberCount.toLocaleString()} a&apos;zo
                            </p>
                            {ch.description && (
                                <p className="text-sm mt-3 text-center leading-relaxed"
                                    style={{ color: "rgba(220,230,255,0.85)" }}>
                                    {ch.description}
                                </p>
                            )}
                        </div>

                        <button onClick={join} disabled={joining}
                            className="mt-6 w-full py-3 rounded-2xl text-sm font-black text-[var(--nx-text)] flex items-center justify-center gap-2 disabled:opacity-40"
                            style={{ background: "var(--nx-accent)" }}>
                            {joining ? <Loader2 className="w-4 h-4 animate-spin" /> : status !== "authenticated" ? <LogIn className="w-4 h-4" /> : <Check className="w-4 h-4" />}
                            {status !== "authenticated" ? "Kirish va qo'shilish" : "Qo'shilish"}
                            <ArrowRight className="w-4 h-4" />
                        </button>
                        <p className="text-[10px] mt-3 text-center" style={{ color: "rgba(140,160,210,0.55)" }}>
                            Qo&apos;shilish orqali sizni jamoat qoidalari va Nexus shartlariga rioya qilishga rozi bo&apos;lasiz
                        </p>
                    </>
                ) : null}
            </div>
        </div>
    );
}
