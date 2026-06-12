"use client";

import { useState } from "react";
import { Link } from "@/i18n/routing";
import { AtSign, Loader2, ArrowRight, Check } from "lucide-react";

// ─────────────────────────────────────────────────────────────────────────────
// NexusUsernameGate — Humo ID bor, lekin @username yo'q foydalanuvchi uchun.
// Username Nexus uchun MAJBURIY: usersiz profil/kuzatish/eslatma ishlamaydi.
// ─────────────────────────────────────────────────────────────────────────────
const RESERVED = new Set(["edit", "verify", "settings", "admin", "api", "help", "support", "pay", "market", "nexus", "esport", "ai", "id", "forhumo", "humo", "humoid"]);

export function NexusUsernameGate({ suggested }: { suggested?: string }) {
    const [value, setValue] = useState(suggested ?? "");
    const [saving, setSaving] = useState(false);
    const [err, setErr] = useState<string | null>(null);
    const [done, setDone] = useState(false);

    const clean = value.trim().toLowerCase();
    const formatOk = /^[a-z0-9_]{3,20}$/.test(clean);
    const reserved = RESERVED.has(clean);
    const valid = formatOk && !reserved;

    async function save() {
        if (!valid || saving) return;
        setSaving(true); setErr(null);
        try {
            const res = await fetch("/api/user/profile", {
                method: "PATCH", headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ username: clean }),
            });
            if (res.ok) {
                setDone(true);
                setTimeout(() => window.location.reload(), 700);
                return;
            }
            const d = await res.json().catch(() => ({}));
            setErr(
                d.error === "username_taken" ? "Bu username band — boshqasini tanlang" :
                d.error === "username_reserved" ? "Bu username tizim uchun zaxiralangan" :
                d.error === "username_invalid" ? "Username 3-20 belgi: a-z, 0-9, _" :
                "Xatolik yuz berdi, qayta urinib ko'ring"
            );
        } catch { setErr("Tarmoq xatosi"); }
        finally { setSaving(false); }
    }

    return (
        <div className="fixed inset-0 z-[100] overflow-hidden flex items-center justify-center p-6" style={{ background: "#050818" }}>
            <div className="absolute pointer-events-none" style={{ top: "-15%", left: "-10%", width: "60%", height: "60%", background: "radial-gradient(ellipse at center, rgba(43,62,232,0.20) 0%, transparent 70%)" }} />
            <div className="absolute pointer-events-none" style={{ bottom: "-15%", right: "-10%", width: "60%", height: "60%", background: "radial-gradient(ellipse at center, rgba(0,206,200,0.16) 0%, transparent 70%)" }} />

            <div className="relative w-full max-w-md p-8 rounded-3xl text-center" style={{ background: "rgba(11,18,40,0.75)", border: "1px solid rgba(43,62,232,0.28)", backdropFilter: "blur(20px)" }}>
                <div className="mx-auto w-16 h-16 rounded-2xl flex items-center justify-center mb-5" style={{ background: "linear-gradient(135deg,#2B3EE8,#00CEC8)", boxShadow: "0 8px 32px rgba(43,62,232,0.45)" }}>
                    <AtSign className="w-8 h-8 text-white" />
                </div>
                <h1 className="text-xl font-black text-white mb-2">Username tanlang</h1>
                <p className="text-sm leading-relaxed mb-6" style={{ color: "rgba(150,170,220,0.85)" }}>
                    Nexus&apos;da sizni shu nom bilan topishadi, kuzatishadi va eslatishadi. Keyinroq profil sozlamalaridan o&apos;zgartirishingiz mumkin.
                </p>

                <div className="relative mb-2">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-base font-bold" style={{ color: "rgba(43,62,232,0.7)" }}>@</span>
                    <input
                        value={value}
                        onChange={e => { setValue(e.target.value.replace(/\s/g, "")); setErr(null); }}
                        onKeyDown={e => e.key === "Enter" && save()}
                        placeholder="username"
                        autoFocus
                        maxLength={20}
                        className="w-full h-12 rounded-xl pl-9 pr-11 text-sm text-white outline-none lowercase"
                        style={{ background: "rgba(5,8,24,0.60)", border: `1px solid ${err ? "rgba(239,68,68,0.5)" : valid ? "rgba(0,206,200,0.5)" : "rgba(43,62,232,0.25)"}`, caretColor: "#00CEC8" }} />
                    {valid && <Check className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5" style={{ color: "#00CEC8" }} />}
                </div>

                <p className="text-[11px] text-left px-1 mb-4 min-h-[16px]" style={{ color: err ? "#f87171" : "rgba(120,140,190,0.7)" }}>
                    {err ?? (clean && !formatOk ? "3-20 belgi: a-z, 0-9, _" : reserved ? "Bu username zaxiralangan" : "Masalan: @ali_dev")}
                </p>

                <button onClick={save} disabled={!valid || saving || done}
                    className="w-full h-12 rounded-xl text-sm font-black text-white flex items-center justify-center gap-2 disabled:opacity-50"
                    style={{ background: "linear-gradient(135deg,#2B3EE8,#00CEC8)", boxShadow: "0 4px 20px rgba(43,62,232,0.4)" }}>
                    {done ? <><Check className="w-4 h-4" /> Tayyor!</> : saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <>Davom etish <ArrowRight className="w-4 h-4" /></>}
                </button>

                <Link href="/id/edit" className="mt-3 inline-flex items-center gap-1 text-xs font-bold transition-colors hover:text-white" style={{ color: "rgba(120,140,190,0.75)" }}>
                    Humo ID profilini to&apos;liq sozlash <ArrowRight className="w-3 h-3" />
                </Link>
            </div>
        </div>
    );
}
