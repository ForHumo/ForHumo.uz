"use client";

// Universal in-app feedback widget - suzuvchi tugma + modal.

import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { MessageSquare, X, Loader2, Check, Smile, Meh, Frown, Bug, Lightbulb } from "lucide-react";

type Mood = "happy" | "neutral" | "sad" | "bug" | "idea";

const MOOD_META: Record<Mood, { icon: typeof Smile; label: string; color: string }> = {
    happy:   { icon: Smile,     label: "Ajoyib", color: "#10b981" },
    neutral: { icon: Meh,       label: "O'rtacha", color: "#eab308" },
    sad:     { icon: Frown,     label: "Yomon", color: "#ef4444" },
    bug:     { icon: Bug,       label: "Xatolik topdim", color: "#f97316" },
    idea:    { icon: Lightbulb, label: "Taklif bor", color: "#8b5cf6" },
};

interface Props {
    module?: string;   // Ixtiyoriy - qaysi modul
}

export function HumoFeedbackWidget({ module }: Props) {
    const [open, setOpen] = useState(false);
    const [mounted, setMounted] = useState(false);
    const [mood, setMood] = useState<Mood | null>(null);
    const [message, setMessage] = useState("");
    const [busy, setBusy] = useState(false);
    const [done, setDone] = useState(false);

    useEffect(() => { setMounted(true); }, []);

    const submit = async () => {
        if (!mood || message.trim().length < 3 || busy) return;
        setBusy(true);
        try {
            const r = await fetch("/api/user/feedback", {
                method: "POST", headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    mood, message: message.trim(), module,
                    url: window.location.pathname,
                }),
            });
            if (r.ok) {
                setDone(true);
                setTimeout(() => {
                    setOpen(false);
                    setDone(false);
                    setMood(null);
                    setMessage("");
                }, 1500);
            }
        } catch { /* skip */ }
        finally { setBusy(false); }
    };

    if (!mounted) return null;

    if (!open) {
        return createPortal(
            <button onClick={() => setOpen(true)}
                title="Fikringiz muhim"
                className="fixed bottom-6 left-6 z-[400] w-11 h-11 rounded-full grid place-items-center bg-neutral-900 dark:bg-neutral-100 text-white dark:text-neutral-900 hover:scale-105 transition shadow-lg">
                <MessageSquare className="w-4 h-4" />
            </button>,
            document.body,
        );
    }

    return createPortal(
        <div className="fixed inset-0 z-[999] flex items-end sm:items-center justify-center p-0 sm:p-4"
            style={{ background: "rgba(0,0,0,0.6)" }}
            onClick={() => setOpen(false)}>
            <div onClick={e => e.stopPropagation()}
                className="w-full sm:max-w-md rounded-t-3xl sm:rounded-3xl overflow-hidden bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 shadow-2xl">
                <div className="flex items-center gap-2 px-4 py-3 border-b border-neutral-200 dark:border-neutral-800">
                    <MessageSquare className="w-4 h-4 text-neutral-500" />
                    <p className="text-[14px] font-black flex-1">Fikringizni yozing</p>
                    <button onClick={() => setOpen(false)}
                        className="w-8 h-8 rounded-lg grid place-items-center hover:bg-neutral-100 dark:hover:bg-neutral-800">
                        <X className="w-4 h-4 text-neutral-500" />
                    </button>
                </div>

                {done ? (
                    <div className="p-8 text-center">
                        <div className="w-14 h-14 rounded-full mx-auto mb-2 bg-green-500 grid place-items-center">
                            <Check className="w-7 h-7 text-white" />
                        </div>
                        <p className="text-[14px] font-black">Rahmat!</p>
                        <p className="text-[12.5px] text-neutral-500">Fikringiz yozib olindi</p>
                    </div>
                ) : (
                    <div className="p-4">
                        <p className="text-[12px] font-black uppercase tracking-wider text-neutral-500 mb-2">
                            Kayfiyatingiz?
                        </p>
                        <div className="grid grid-cols-5 gap-1.5 mb-4">
                            {(Object.keys(MOOD_META) as Mood[]).map(m => {
                                const meta = MOOD_META[m];
                                const Icon = meta.icon;
                                const active = mood === m;
                                return (
                                    <button key={m} onClick={() => setMood(m)} type="button"
                                        className="flex flex-col items-center gap-1 p-2 rounded-xl hover:brightness-95 transition"
                                        style={{
                                            background: active ? meta.color + "22" : "transparent",
                                            border: `1.5px solid ${active ? meta.color : "#e5e5e5"}`,
                                        }}>
                                        <Icon className="w-5 h-5" style={{ color: meta.color }} />
                                        <span className="text-[9.5px] font-bold" style={{ color: active ? meta.color : "#71717a" }}>
                                            {meta.label}
                                        </span>
                                    </button>
                                );
                            })}
                        </div>

                        <textarea value={message} onChange={e => setMessage(e.target.value.slice(0, 2000))}
                            placeholder="Yozing... Bu fikr bizga muhim."
                            rows={4}
                            className="w-full p-3 rounded-xl text-[13px] bg-neutral-100 dark:bg-neutral-800 border-0 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none" />
                        <p className="text-[10.5px] text-neutral-500 mt-1 mb-4 text-right">
                            {message.length} / 2000
                        </p>

                        <button onClick={submit} disabled={!mood || message.trim().length < 3 || busy}
                            className="w-full h-11 rounded-xl inline-flex items-center justify-center gap-2 text-[13.5px] font-black bg-neutral-900 dark:bg-neutral-100 text-white dark:text-neutral-900 hover:brightness-95 disabled:opacity-40 transition">
                            {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <MessageSquare className="w-4 h-4" />}
                            Yuborish
                        </button>
                    </div>
                )}
            </div>
        </div>,
        document.body,
    );
}
