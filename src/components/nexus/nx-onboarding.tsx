"use client";

// Onboarding checklist — yangi foydalanuvchi 5 qadam ichida Nexus'ni tushunadi.
// Feed'ning tepasida sticky card ko'rinadi. Har qadam bajarilsa avtomatik yashiradi.
// Barcha 5 qadam bajarilsa checklist yopiladi (localStorage).

import { useEffect, useState, useCallback } from "react";
import { CheckCircle2, Circle, X, Sparkles, UserPlus, PenSquare, Camera, Bell, ChevronRight } from "lucide-react";
import { useNxPlayer } from "./nx-player-ctx";
import { getPushState } from "@/lib/push-client";

const LS_HIDDEN = "nx_onboarding_hidden";

interface StepStatus {
    profileFilled: boolean;
    hasPost: boolean;
    hasStory: boolean;
    followsSomeone: boolean;
    pushEnabled: boolean;
}

export function NxOnboarding() {
    const { setCreatePostOpen, setStoryCreateOpen, setExploreOpen } = useNxPlayer();
    const [status, setStatus] = useState<StepStatus | null>(null);
    const [hidden, setHidden] = useState(true);   // initial hidden, avoids flash

    const load = useCallback(async () => {
        // Foydalanuvchi allaqachon yopgan bo'lsa hech qachon ko'rsatmaymiz
        if (typeof window !== "undefined" && localStorage.getItem(LS_HIDDEN)) return;
        try {
            // Profil to'ldirilganmi (name/bio bor bo'lsa yetarli)
            const p = await fetch("/api/user/profile").then(r => r.ok ? r.json() : null).catch(() => null);
            const profileFilled = !!(p?.name && p?.bio);

            // Nexus statistikasi
            const nx = await fetch("/api/nexus/profile").then(r => r.ok ? r.json() : null).catch(() => null);
            const hasPost = (nx?.stats?.posts ?? 0) > 0;
            const followsSomeone = (nx?.stats?.following ?? 0) > 0;

            // Story mavjudmi (o'zining)
            const stories = await fetch("/api/nexus/stories").then(r => r.ok ? r.json() : null).catch(() => null);
            const hasStory = Array.isArray(stories?.groups) && stories.groups.some((g: { isMine?: boolean }) => g.isMine);

            // Push holati
            const pushState = await getPushState();
            const pushEnabled = pushState === "subscribed";

            const s: StepStatus = { profileFilled, hasPost, hasStory, followsSomeone, pushEnabled };
            setStatus(s);

            const doneAll = Object.values(s).every(Boolean);
            setHidden(doneAll);
        } catch { setHidden(true); }
    }, []);

    useEffect(() => { load(); }, [load]);

    // Ochilgan panellar yopilganda tekshirish (masalan foydalanuvchi post yozgach)
    useEffect(() => {
        const onFocus = () => load();
        window.addEventListener("focus", onFocus);
        return () => window.removeEventListener("focus", onFocus);
    }, [load]);

    const dismiss = () => {
        localStorage.setItem(LS_HIDDEN, "1");
        setHidden(true);
    };

    if (hidden || !status) return null;

    const steps = [
        { key: "profileFilled",   done: status.profileFilled,   icon: Sparkles, label: "Profilingizni to'ldiring",  href: "/id/edit",       action: undefined },
        { key: "followsSomeone",  done: status.followsSomeone,  icon: UserPlus, label: "Kim bo'lsa kuzatib boring",   href: undefined,        action: () => setExploreOpen(true) },
        { key: "hasPost",         done: status.hasPost,         icon: PenSquare,label: "Birinchi postni yozing",       href: undefined,        action: () => setCreatePostOpen(true) },
        { key: "hasStory",        done: status.hasStory,        icon: Camera,   label: "Story qo'ying (24 soat)",     href: undefined,        action: () => setStoryCreateOpen(true) },
        { key: "pushEnabled",     done: status.pushEnabled,     icon: Bell,     label: "Bildirishnomalarni yoqing",   href: undefined,        action: undefined },
    ];

    const doneCount = steps.filter(s => s.done).length;

    return (
        <div className="mx-4 mt-4 rounded-2xl overflow-hidden"
            style={{
                background: "linear-gradient(135deg,rgba(43,62,232,0.14),rgba(0,206,200,0.10))",
                border: "1px solid rgba(43,62,232,0.28)",
                boxShadow: "0 4px 24px rgba(43,62,232,0.14)",
            }}>
            <div className="flex items-center justify-between px-4 py-3" style={{ borderBottom: "1px solid rgba(43,62,232,0.14)" }}>
                <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-xl flex items-center justify-center"
                        style={{ background: "linear-gradient(135deg,#2B3EE8,#00CEC8)" }}>
                        <Sparkles className="w-4 h-4 text-white" />
                    </div>
                    <div>
                        <p className="text-sm font-black text-white leading-tight">Boshlash uchun {steps.length} qadam</p>
                        <p className="text-[10px]" style={{ color: "rgba(140,160,210,0.85)" }}>{doneCount}/{steps.length} bajarildi</p>
                    </div>
                </div>
                <button onClick={dismiss} className="w-7 h-7 rounded-lg flex items-center justify-center active:scale-90 transition"
                    style={{ background: "rgba(43,62,232,0.14)" }}>
                    <X className="w-3.5 h-3.5" style={{ color: "rgba(140,160,210,0.85)" }} />
                </button>
            </div>
            <div className="p-2 space-y-1">
                {steps.map((s) => {
                    const inner = (
                        <>
                            <div className="w-5 h-5 flex-shrink-0">
                                {s.done ? <CheckCircle2 className="w-5 h-5" style={{ color: "#00CEC8" }} /> : <Circle className="w-5 h-5" style={{ color: "rgba(140,160,210,0.4)" }} />}
                            </div>
                            <s.icon className="w-4 h-4 flex-shrink-0" style={{ color: s.done ? "rgba(0,206,200,0.6)" : "rgba(140,160,210,0.75)" }} />
                            <span className="text-xs font-semibold flex-1 truncate" style={{ color: s.done ? "rgba(140,160,210,0.55)" : "rgba(230,235,250,0.95)", textDecoration: s.done ? "line-through" : "none" }}>
                                {s.label}
                            </span>
                            {!s.done && <ChevronRight className="w-3.5 h-3.5 flex-shrink-0" style={{ color: "rgba(140,160,210,0.55)" }} />}
                        </>
                    );
                    const cls = "w-full flex items-center gap-2.5 px-3 py-2 rounded-xl transition-all active:scale-[0.98]";
                    const st = { background: s.done ? "transparent" : "rgba(43,62,232,0.05)" };
                    if (s.done) return <div key={s.key} className={cls} style={st}>{inner}</div>;
                    if (s.href) return <a key={s.key} href={s.href} className={cls} style={st}>{inner}</a>;
                    return <button key={s.key} onClick={s.action} className={cls} style={st}>{inner}</button>;
                })}
            </div>
        </div>
    );
}
