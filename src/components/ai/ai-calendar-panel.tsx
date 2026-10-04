"use client";

// AI Kalendar paneli — Ummi qobiliyati (mini-ilova, modullararo agent POC).
// Tadbirlarni ko'rish + qo'lda qo'shish/o'chirish. Ummi (Humo Live/chat) ham /api/ai/calendar orqali yozadi.

import { useState, useEffect, useCallback } from "react";
import { X as XIcon, Calendar as CalendarIcon, Plus, Trash2, MapPin, Loader2, AudioLines } from "lucide-react";
import { aiT, type AiLang } from "@/lib/ai-i18n";

interface AiEvent {
    id: string; title: string; startsAt: string; endsAt: string | null;
    location: string | null; note: string | null; allDay: boolean;
    source: string; sourceRef: string | null; remindAt: string | null; done: boolean;
}

export function AiCalendarPanel({ lang, dark, onClose }: { lang: AiLang; dark: boolean; onClose: () => void }) {
    const t = useCallback((k: string) => aiT(lang, k), [lang]);
    const locale = lang === "ru" ? "ru-RU" : lang === "en" ? "en-US" : "uz-UZ";
    const primary = dark ? "#ECECEC" : "#1a1a1a";
    const onPrimary = dark ? "#0d0d0d" : "#ffffff";

    const [events, setEvents] = useState<AiEvent[]>([]);
    const [loading, setLoading] = useState(true);
    const [title, setTitle] = useState("");
    const [when, setWhen] = useState("");
    const [where, setWhere] = useState("");
    const [saving, setSaving] = useState(false);

    const load = useCallback(async () => {
        setLoading(true);
        try {
            const r = await fetch("/api/ai/calendar", { cache: "no-store" });
            const j = r.ok ? await r.json() : { events: [] };
            setEvents(j.events ?? []);
        } catch { setEvents([]); }
        setLoading(false);
    }, []);
    useEffect(() => { load(); }, [load]);

    async function add() {
        const tt = title.trim();
        if (!tt || !when || saving) return;
        setSaving(true);
        try {
            const r = await fetch("/api/ai/calendar", {
                method: "POST", headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ title: tt, startsAt: new Date(when).toISOString(), location: where.trim() || undefined, source: "user" }),
            });
            if (r.ok) { setTitle(""); setWhen(""); setWhere(""); load(); }
        } catch { /* ignore */ }
        setSaving(false);
    }

    async function del(id: string) {
        if (!window.confirm(t("cal.deleteConfirm"))) return;
        setEvents(prev => prev.filter(e => e.id !== id));
        try { await fetch(`/api/ai/calendar/${id}`, { method: "DELETE" }); } catch { /* ignore */ }
    }

    function fmt(iso: string) {
        try {
            return new Date(iso).toLocaleString(locale, { weekday: "short", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
        } catch { return iso; }
    }

    const inputCls = "w-full bg-transparent text-sm px-2.5 py-2 rounded-lg outline-none";
    const inputStyle = { color: "hsl(var(--foreground))", border: "1px solid hsl(var(--border))" } as const;

    return (
        <div className="fixed inset-0 z-[160] flex justify-end">
            <div className="absolute inset-0 bg-black/40" onClick={onClose} />
            <div className="relative h-full w-full max-w-md flex flex-col" style={{ background: "var(--ai-menu)", borderLeft: "1px solid hsl(var(--border))" }}>
                <div className="h-12 px-4 flex items-center justify-between flex-shrink-0" style={{ borderBottom: "1px solid hsl(var(--border))" }}>
                    <div className="flex items-center gap-2">
                        <CalendarIcon className="w-4 h-4" style={{ color: "hsl(var(--foreground))" }} />
                        <span className="font-black text-sm" style={{ color: "hsl(var(--foreground))" }}>{t("cal.title")}</span>
                    </div>
                    <button onClick={onClose} className="w-8 h-8 grid place-items-center rounded-lg hover:bg-[var(--ai-hover)]" style={{ color: "hsl(var(--muted-foreground))" }}>
                        <XIcon className="w-4 h-4" />
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-4">
                    <div className="rounded-2xl p-3 flex flex-col gap-2" style={{ background: "var(--ai-raise)", border: "1px solid hsl(var(--border))" }}>
                        <input value={title} onChange={e => setTitle(e.target.value)} placeholder={t("cal.titlePh")} maxLength={120} className={inputCls} style={inputStyle} />
                        <input type="datetime-local" value={when} onChange={e => setWhen(e.target.value)} className={inputCls} style={inputStyle} />
                        <input value={where} onChange={e => setWhere(e.target.value)} placeholder={t("cal.where")} maxLength={200} className={inputCls} style={inputStyle} />
                        <button onClick={add} disabled={!title.trim() || !when || saving}
                            className="h-9 rounded-lg text-sm font-bold flex items-center justify-center gap-1.5 disabled:opacity-50"
                            style={{ background: primary, color: onPrimary }}>
                            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                            {t("cal.save")}
                        </button>
                    </div>

                    {loading ? (
                        <div className="flex justify-center py-8"><Loader2 className="w-5 h-5 animate-spin" style={{ color: "hsl(var(--muted-foreground))" }} /></div>
                    ) : events.length === 0 ? (
                        <p className="text-center text-[13px] py-8 leading-relaxed" style={{ color: "hsl(var(--muted-foreground))" }}>{t("cal.empty")}</p>
                    ) : (
                        <div className="flex flex-col gap-2">
                            {events.map(ev => (
                                <div key={ev.id} className="rounded-xl p-3 flex items-start gap-2" style={{ background: "var(--ai-raise)", border: "1px solid hsl(var(--border))" }}>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-1.5 flex-wrap">
                                            <span className="text-sm font-bold" style={{ color: "hsl(var(--foreground))" }}>{ev.title}</span>
                                            {ev.source === "live" && (
                                                <span className="inline-flex items-center gap-0.5 text-[10px] font-bold px-1.5 py-0.5 rounded-full" style={{ background: "var(--ai-hover)", color: "hsl(var(--muted-foreground))" }}>
                                                    <AudioLines className="w-2.5 h-2.5" />{t("cal.fromLive")}
                                                </span>
                                            )}
                                        </div>
                                        <div className="text-xs mt-0.5" style={{ color: "hsl(var(--muted-foreground))" }}>{fmt(ev.startsAt)}</div>
                                        {ev.location && (
                                            <div className="text-xs mt-0.5 flex items-center gap-1" style={{ color: "hsl(var(--muted-foreground))" }}>
                                                <MapPin className="w-3 h-3 flex-shrink-0" />{ev.location}
                                            </div>
                                        )}
                                    </div>
                                    <button onClick={() => del(ev.id)} className="w-7 h-7 grid place-items-center rounded-lg hover:bg-[var(--ai-hover)] flex-shrink-0" style={{ color: "hsl(var(--muted-foreground))" }}>
                                        <Trash2 className="w-3.5 h-3.5" />
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
